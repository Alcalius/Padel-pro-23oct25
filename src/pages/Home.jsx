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

// --------------------------
// RANGOS POR PL (LEGACY / FALLBACK)
// --------------------------
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

// --------------------------
// RANGOS POR NOMBRE (LO NUEVO)
// --------------------------
const RANK_META_BY_NAME = {
  "Bronce III": { short: "B3", image: bronceImg },
  "Bronce II": { short: "B2", image: bronceImg },
  "Bronce I": { short: "B1", image: bronceImg },

  "Plata III": { short: "S3", image: plataImg },
  "Plata II": { short: "S2", image: plataImg },
  "Plata I": { short: "S1", image: plataImg },

  "Oro III": { short: "G3", image: oroImg },
  "Oro II": { short: "G2", image: oroImg },
  "Oro I": { short: "G1", image: oroImg },

  "Platino III": { short: "P3", image: platinoImg },
  "Platino II": { short: "P2", image: platinoImg },
  "Platino I": { short: "P1", image: platinoImg },

  Leyenda: { short: "LEG", image: leyendaImg },

  "Sin rango": { short: "UNR", image: bronceImg },
};

// 👉 Orden de fuerza de cada rango (para ordenar el ranking)
const RANK_ORDER = {
  "Sin rango": 0,

  "Bronce III": 1,
  "Bronce II": 2,
  "Bronce I": 3,

  "Plata III": 4,
  "Plata II": 5,
  "Plata I": 6,

  "Oro III": 7,
  "Oro II": 8,
  "Oro I": 9,

  "Platino III": 10,
  "Platino II": 11,
  "Platino I": 12,

  Leyenda: 13,
};

function getRankOrder(label) {
  return typeof label === "string" && RANK_ORDER[label] != null
    ? RANK_ORDER[label]
    : 0;
}

function getRankInfoFromData(rankName, leaguePoints) {
  const pl = typeof leaguePoints === "number" ? leaguePoints : 0;

  // 1) Preferimos SIEMPRE el rank que venga de Firestore
  if (typeof rankName === "string" && RANK_META_BY_NAME[rankName]) {
    const meta = RANK_META_BY_NAME[rankName];
    return {
      label: rankName,
      short: meta.short,
      image: meta.image,
    };
  }

  // 2) Si no hay rank guardado, caemos al mapeo legacy por PL
  const tier = getRankForPL(pl);
  return {
    label: tier.label,
    short: tier.short,
    image: tier.image,
  };
}

// --------------------------
// Helper para ordenar partidos recientes
// --------------------------
function getMatchDateMillis(match) {
  if (!match || !match.date) return 0;
  const d = match.date;

  if (typeof d === "string") {
    const t = Date.parse(d);
    return Number.isNaN(t) ? 0 : t;
  }
  // Firestore Timestamp
  if (typeof d.toMillis === "function") {
    return d.toMillis();
  }
  if (typeof d.seconds === "number") {
    return d.seconds * 1000;
  }
  return 0;
}

export default function Home() {
  const { user } = useAuth();
  const navigate = useNavigate();

  const [loading, setLoading] = useState(true);

  const [userData, setUserData] = useState(null);
  const [stats, setStats] = useState({
    totalMatches: 0,
    totalWins: 0,
    winRate: 0,
    tournamentsPlayed: 0,
  });

  const computedWinRate =
    stats.totalMatches > 0
      ? Math.round((stats.totalWins / stats.totalMatches) * 100)
      : 0;

  const [userRecentMatches, setUserRecentMatches] = useState([]);

  const [clubMembers, setClubMembers] = useState([]);
  const [selectedMember, setSelectedMember] = useState(null);
  const [memberDetail, setMemberDetail] = useState(null);
  const [memberDetailLoading, setMemberDetailLoading] = useState(false);

  const [activeTournaments, setActiveTournaments] = useState([]);
  const [completedTournaments, setCompletedTournaments] = useState([]);

  // NUEVO: estado para modales
  const [showRankingModal, setShowRankingModal] = useState(false);
  const [showMemberDetailModal, setShowMemberDetailModal] = useState(false);

  // NUEVO: animaciones
  const [plBarValue, setPlBarValue] = useState(0);
  const [animateTop3, setAnimateTop3] = useState(false);
  const [rankingLoading, setRankingLoading] = useState(false);


  // --------------------------
  // Cargar datos de usuario
  // --------------------------
  useEffect(() => {
    if (!user?.uid) return;

    const unsubUser = onSnapshot(doc(db, "users", user.uid), (snap) => {
      const data = snap.data();
      if (!data) return;

      setUserData({
        id: snap.id,
        displayName: data.displayName || data.name || "",
        email: data.email || user.email,
        profilePicture: data.profilePicture || "",
        leaguePoints:
          typeof data.leaguePoints === "number" ? data.leaguePoints : 0,
        rank: data.rank || "Bronce III",
        activeClubId: data.activeClubId || null,
      });

      const statsData = data.stats || {};

      // Valores base de partidos y victorias
      const baseTotalMatches =
        typeof statsData.totalMatches === "number"
          ? statsData.totalMatches
          : Array.isArray(statsData.recentMatches)
          ? statsData.recentMatches.length
          : Array.isArray(data.recentMatches)
          ? data.recentMatches.length
          : 0;

      const baseWins =
        typeof statsData.wins === "number"
          ? statsData.wins
          : typeof data.wins === "number"
          ? data.wins
          : 0;

      // Recent matches (para stats y para lista de actividad)
      const recent =
        Array.isArray(statsData.recentMatches) && statsData.recentMatches.length
          ? statsData.recentMatches
          : Array.isArray(data.recentMatches)
          ? data.recentMatches
          : [];

      // Torneos jugados: si no viene guardado, lo calculamos por torneos distintos
      let tournamentsPlayed =
        typeof statsData.tournamentsPlayed === "number"
          ? statsData.tournamentsPlayed
          : typeof data.tournamentsPlayed === "number"
          ? data.tournamentsPlayed
          : 0;

      if ((!tournamentsPlayed || tournamentsPlayed === 0) && recent.length > 0) {
        const distinct = new Set(
          recent
            .map(
              (m) =>
                m.tournamentId ||
                m.tournament ||
                m.tournamentName ||
                m.torneoId
            )
            .filter(Boolean)
        );
        tournamentsPlayed = distinct.size;
      }

      const sortedRecent = Array.isArray(recent)
        ? [...recent].sort(
            (a, b) => getMatchDateMillis(b) - getMatchDateMillis(a)
          )
        : [];

      setStats({
        totalMatches: baseTotalMatches,
        totalWins: baseWins,
        winRate:
          baseTotalMatches > 0
            ? Math.round((baseWins / baseTotalMatches) * 100)
            : 0,
        tournamentsPlayed,
      });

      setUserRecentMatches(sortedRecent);
      setLoading(false);
    });

    return () => {
      unsubUser();
    };
  }, [user]);

  // --------------------------
  // Torneos del usuario
  // --------------------------
  useEffect(() => {
    if (!user?.uid) return;

    const q = query(
      collection(db, "tournaments"),
      where("participantsIds", "array-contains", user.uid)
    );

    const unsub = onSnapshot(q, (snap) => {
      const active = [];
      const completed = [];

      snap.forEach((docSnap) => {
        const data = docSnap.data();
        const base = {
          id: docSnap.id,
          name: data.name || "Liga / Torneo sin nombre",
          status: data.status || "pending",
          clubId: data.clubId || null,
          courtCount: data.courtCount || 1,
          matchCount: data.matchCount || 0,
          createdAt: data.createdAt || null,
        };

        if (base.status === "completed") {
          completed.push(base);
        } else {
          active.push(base);
        }
      });

      active.sort((a, b) => getMatchDateMillis(b) - getMatchDateMillis(a));
      completed.sort((a, b) => getMatchDateMillis(b) - getMatchDateMillis(a));

      setActiveTournaments(active);
      setCompletedTournaments(completed);
    });

    return () => unsub();
  }, [user]);

  // --------------------------
  // Miembros del club activo
  // --------------------------
  useEffect(() => {
    if (!userData?.activeClubId) {
      setClubMembers([]);
      setSelectedMember(null);
      setMemberDetail(null);
      setRankingLoading(false);
      return;
    }

    const clubId = userData.activeClubId;
    const clubRef = doc(db, "clubs", clubId);

    const unsubClub = onSnapshot(clubRef, async (clubSnap) => {
      const clubData = clubSnap.data();
      if (!clubData || !Array.isArray(clubData.members)) {
        setClubMembers([]);
        setSelectedMember(null);
        setMemberDetail(null);
        setRankingLoading(false);
        return;
      }

      setRankingLoading(true);

      const membersList = clubData.members;
      const membersData = [];

      for (const m of membersList) {
        const memberUid = typeof m === "string" ? m : m?.uid;
        if (!memberUid) continue;

        const userDoc = await getDoc(doc(db, "users", memberUid));
        if (!userDoc.exists()) continue;

        const data = userDoc.data();
        const lp =
          typeof data.leaguePoints === "number" ? data.leaguePoints : 0;

        const rankInfo = getRankInfoFromData(data.rank, lp);

        membersData.push({
          id: userDoc.id,
          name: data.displayName || data.name || data.email || "Jugador",
          email: data.email || "",
          profilePicture: data.profilePicture || "",
          leaguePoints: lp,
          rankLabel: rankInfo.label,
          rankShort: rankInfo.short,
          rankImage: rankInfo.image,
        });
      }

      // Ordenar por rango y PL
      membersData.sort((a, b) => {
        const ra = getRankOrder(a.rankLabel);
        const rb = getRankOrder(b.rankLabel);
        if (rb !== ra) return rb - ra;
        return b.leaguePoints - a.leaguePoints;
      });

      setClubMembers(membersData);
      setSelectedMember((prev) => {
        if (!prev) return membersData[0] || null;
        const stillExists = membersData.find((m) => m.id === prev.id);
        return stillExists || membersData[0] || null;
      });

      setRankingLoading(false);
    });

    return () => unsubClub();
  }, [userData?.activeClubId]);

  // Detalle de jugador del ranking del club
  useEffect(() => {
    async function loadMemberDetail() {
      if (!selectedMember) {
        setMemberDetail(null);
        return;
      }

      setMemberDetailLoading(true);
      try {
        const userRef = doc(db, "users", selectedMember.id);
        const snap = await getDoc(userRef);
        if (!snap.exists()) {
          setMemberDetail(null);
          return;
        }

        const data = snap.data();
        const statsData = data.stats || {};
        const lp =
          typeof data.leaguePoints === "number" ? data.leaguePoints : 0;

        const rankInfo = getRankInfoFromData(data.rank, lp);

        // -------- partidos recientes (para lista) --------
        const recent =
          Array.isArray(statsData.recentMatches) && statsData.recentMatches.length
            ? statsData.recentMatches
            : Array.isArray(data.recentMatches)
            ? data.recentMatches
            : [];

        const sortedRecent = Array.isArray(recent)
          ? [...recent].sort(
              (a, b) => getMatchDateMillis(b) - getMatchDateMillis(a)
            )
          : [];

        // -------- stats numéricas (para el resumen) --------
        const totalMatches =
          typeof statsData.totalMatches === "number"
            ? statsData.totalMatches
            : Array.isArray(statsData.recentMatches)
            ? statsData.recentMatches.length
            : Array.isArray(data.recentMatches)
            ? data.recentMatches.length
            : 0;

        const wins =
          typeof statsData.wins === "number"
            ? statsData.wins
            : typeof data.wins === "number"
            ? data.wins
            : 0;

        const losses =
          typeof statsData.losses === "number"
            ? statsData.losses
            : Math.max(totalMatches - wins, 0);

        const tournamentsPlayed =
          typeof statsData.tournamentsPlayed === "number"
            ? statsData.tournamentsPlayed
            : typeof data.tournamentsPlayed === "number"
            ? data.tournamentsPlayed
            : 0;

        const winRate =
          totalMatches > 0 ? Math.round((wins / totalMatches) * 100) : 0;

        setMemberDetail({
          id: snap.id,
          name: data.displayName || data.name || data.email || "Jugador",
          email: data.email || "",
          profilePicture: data.profilePicture || "",
          rankLabel: rankInfo.label,
          rankShort: rankInfo.short,
          rankImage: rankInfo.image,
          leaguePoints: lp,
          stats: {
            totalMatches,
            wins,
            losses,
            tournamentsPlayed,
            winRate,
          },
          recentMatches: sortedRecent,
        });
      } catch (err) {
        console.error("Error cargando detalle de jugador:", err);
      } finally {
        setMemberDetailLoading(false);
      }
    }

    loadMemberDetail();
  }, [selectedMember]);

  // Top 3 miembros del club (con fallback)
  const top3Members = useMemo(() => {
    if (clubMembers && clubMembers.length > 0) {
      return clubMembers.slice(0, 3);
    }

    if (userData?.activeClubId && userData) {
      const lp =
        typeof userData.leaguePoints === "number" ? userData.leaguePoints : 0;
      const rankInfo = getRankInfoFromData(userData.rank, lp);

      return [
        {
          id: userData.id,
          name:
            userData.displayName ||
            userData.name ||
            userData.email ||
            "Jugador",
          email: userData.email || "",
          profilePicture: userData.profilePicture || "",
          leaguePoints: lp,
          rankLabel: rankInfo.label,
          rankShort: rankInfo.short,
          rankImage: rankInfo.image,
        },
      ];
    }

    return [];
  }, [clubMembers, userData]);

  const pl = userData?.leaguePoints || 0;
  const rankInfo = getRankInfoFromData(userData?.rank, pl);

  // ANIMACIÓN: barra de PL
  useEffect(() => {
    const target = Math.max(0, Math.min(100, pl % 100));
    setPlBarValue(0);
    const timeout = setTimeout(() => {
      setPlBarValue(target);
    }, 80);
    return () => clearTimeout(timeout);
  }, [pl]);

  // ANIMACIÓN: efecto pop en top 3
  useEffect(() => {
    if (top3Members.length === 0) {
      setAnimateTop3(false);
      return;
    }
    const timeout = setTimeout(() => {
      setAnimateTop3(true);
    }, 80);
    return () => clearTimeout(timeout);
  }, [top3Members]);


    // Abrir modal de detalle de un jugador del ranking
  const handleOpenMemberDetail = (member) => {
    if (!member) return;
    setSelectedMember(member);
    setShowMemberDetailModal(true);
  };


  // --------------------------
  // Render
  // --------------------------
  if (!user) {
    return (
      <div
        style={{
          padding: "1.2rem 0.5rem 5.5rem",
          maxWidth: 480,
          margin: "0 auto",
        }}
      >
        <p>Inicia sesión para ver tu panel.</p>
      </div>
    );
  }

  // 🔹 NUEVO: Skeletons mientras carga
  if (loading) {
    return (
      <div
        style={{
          padding: "0.6rem 0.5rem 5.5rem",
          maxWidth: 480,
          margin: "0 auto",
        }}
      >
        {/* Skeleton header */}
        <section style={{ marginBottom: "0.8rem" }}>
          <div
            style={{
              borderRadius: "1rem",
              border: "1px solid var(--border)",
              padding: "0.75rem 0.8rem",
              background: "var(--bg-elevated)",
            }}
          >
            <div
              style={{
                display: "flex",
                justifyContent: "space-between",
                alignItems: "center",
                gap: "0.75rem",
              }}
            >
              <div style={{ flex: 1 }}>
                <div
                  style={{
                    width: "60%",
                    height: 10,
                    borderRadius: 999,
                    background: "var(--bg)",
                    marginBottom: 6,
                  }}
                />
                <div
                  style={{
                    width: "80%",
                    height: 14,
                    borderRadius: 999,
                    background: "var(--bg)",
                    marginBottom: 8,
                  }}
                />
                <div
                  style={{
                    width: "70%",
                    height: 10,
                    borderRadius: 999,
                    background: "var(--bg)",
                  }}
                />
              </div>
              <div
                style={{
                  width: 52,
                  height: 52,
                  borderRadius: "999px",
                  background: "var(--bg)",
                  border: "1px solid var(--border)",
                  flexShrink: 0,
                }}
              />
            </div>

            <div
              style={{
                marginTop: "0.8rem",
                display: "flex",
                alignItems: "center",
                gap: "0.6rem",
              }}
            >
              <div
                style={{
                  width: 65,
                  height: 65,
                  borderRadius: 16,
                  background: "var(--bg)",
                }}
              />
              <div style={{ flex: 1 }}>
                <div
                  style={{
                    width: "40%",
                    height: 10,
                    borderRadius: 999,
                    background: "var(--bg)",
                    marginBottom: 6,
                  }}
                />
                <div
                  style={{
                    width: "65%",
                    height: 12,
                    borderRadius: 999,
                    background: "var(--bg)",
                    marginBottom: 8,
                  }}
                />
                <div
                  style={{
                    width: "100%",
                    height: 7,
                    borderRadius: 999,
                    background: "var(--bg)",
                  }}
                />
              </div>
            </div>
          </div>
        </section>

        {/* Skeleton Mis estadísticas */}
        <section>
          <div
            style={{
              width: "40%",
              height: 12,
              borderRadius: 999,
              background: "var(--bg-elevated)",
              marginBottom: "0.6rem",
            }}
          />
          <div
            style={{
              display: "grid",
              gridTemplateColumns: "repeat(2, minmax(0, 1fr))",
              gap: "0.6rem",
            }}
          >
            {Array.from({ length: 4 }).map((_, idx) => (
              <div
                key={idx}
                style={{
                  borderRadius: "0.9rem",
                  border: "1px solid var(--border)",
                  padding: "0.55rem 0.6rem",
                  background: "var(--bg-elevated)",
                }}
              >
                <div
                  style={{
                    width: "60%",
                    height: 10,
                    borderRadius: 999,
                    background: "var(--bg)",
                    marginBottom: 8,
                  }}
                />
                <div
                  style={{
                    width: "40%",
                    height: 14,
                    borderRadius: 999,
                    background: "var(--bg)",
                  }}
                />
              </div>
            ))}
          </div>
        </section>
      </div>
    );
  }

  return (
    <>
      <div
        style={{
          padding: "0.2rem 0.3rem 5.5rem",
          maxWidth: 480,
          margin: "0 auto",
        }}
      >
        {/* 1. HEADER BIENVENIDA */}
        <section style={{ marginBottom: "0.6rem" }}>
          <div
            style={{
              borderRadius: "1rem",
              border: "1px solid var(--border)",
              padding: "0.75rem 0.8rem",
              background: "var(--bg-elevated)",
            }}
          >
            <div
              style={{
                display: "flex",
                justifyContent: "space-between",
                alignItems: "flex-start",
                gap: "0.75rem",
              }}
            >
              <div style={{ flex: 1, minWidth: 0 }}>
                <p
                  style={{
                    margin: 0,
                    fontSize: "0.8rem",
                    color: "var(--muted)",
                  }}
                >
                  Bienvenido de vuelta
                </p>
                <p
                  style={{
                    margin: "0.15rem 0 0.4rem",
                    fontSize: "1.1rem",
                    fontWeight: 600,
                    overflow: "hidden",
                    textOverflow: "ellipsis",
                    whiteSpace: "nowrap",
                  }}
                >
                  {userData?.displayName || "Jugador de League of Padel"}
                </p>
                <p
                  style={{
                    margin: 0,
                    fontSize: "0.8rem",
                    color: "var(--muted)",
                  }}
                >
                  Prepárate para subir de rango en tu próximo Torneo.
                </p>
              </div>

              {userData?.profilePicture ? (
                <div
                  style={{
                    width: 75,
                    height: 75,
                    borderRadius: "999px",
                    overflow: "hidden",
                    border: "1px solid var(--border)",
                    background: "var(--bg)",
                    flexShrink: 0,
                  }}
                >
                  <img
                    src={userData.profilePicture}
                    alt="Foto de perfil"
                    style={{
                      width: "100%",
                      height: "100%",
                      objectFit: "cover",
                    }}
                  />
                </div>
              ) : (
                <div
                  style={{
                    width: 52,
                    height: 52,
                    borderRadius: "999px",
                    border: "1px solid var(--border)",
                    background: "var(--bg)",
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                    flexShrink: 0,
                    fontSize: "1.3rem",
                    fontWeight: 600,
                  }}
                >
                  {(userData?.displayName || "J")[0].toUpperCase()}
                </div>
              )}
            </div>

            {/* RANGO ACTUAL */}
            <div
              style={{
                marginTop: "0.7rem",
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
                    width: 65,
                    height: 65,
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
                      width: `${plBarValue}%`,
                      height: "100%",
                      background:
                        "linear-gradient(90deg, rgba(59,130,246,1), rgba(56,189,248,1))",
                      transition: "width 0.6s ease-out",
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
            <StatCard label="Partidos jugados" value={stats.totalMatches} />
            <StatCard label="Victorias" value={stats.totalWins} />
            <StatCard label="Winrate" value={`${computedWinRate}%`} />
            <StatCard
              label="Torneos jugados"
              value={stats.tournamentsPlayed || completedTournaments.length}
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
              }}
            >
              Top ranking del club
            </h3>
            <button
              type="button"
              onClick={() => setShowRankingModal(true)}
              style={{
                marginLeft: "auto",
                borderRadius: "999px",
                border: "1px solid var(--border)",
                padding: "0.2rem 0.5rem",
                fontSize: "0.75rem",
                background: "transparent",
                cursor: "pointer",
              }}
            >
              Ver ranking completo
            </button>
          </div>

          <div
            style={{
              borderRadius: "1rem",
              border: "1px solid var(--border)",
              padding: "0.8rem 0.8rem",
              background: "var(--bg-elevated)",
            }}
          >
          {rankingLoading ? (
            // Skeletons mientras carga el ranking
            <div
              style={{
                display: "flex",
                justifyContent: "space-around",
                gap: "0.6rem",
              }}
            >
              {Array.from({ length: 3 }).map((_, idx) => (
                <div
                  key={idx}
                  style={{
                    flex: 1,
                    maxWidth: 120,
                    borderRadius: "0.9rem",
                    border: "1px solid var(--border)",
                    padding: "0.6rem 0.5rem",
                    background: "var(--bg-elevated)",
                    display: "flex",
                    flexDirection: "column",
                    alignItems: "center",
                    gap: "0.35rem",
                  }}
                >
                  <div
                    style={{
                      width: 60,
                      height: 60,
                      borderRadius: "999px",
                      background: "var(--bg)",
                    }}
                  />
                  <div
                    style={{
                      width: "60%",
                      height: 10,
                      borderRadius: 999,
                      background: "var(--bg)",
                    }}
                  />
                  <div
                    style={{
                      width: "50%",
                      height: 8,
                      borderRadius: 999,
                      background: "var(--bg)",
                    }}
                  />
                </div>
              ))}
            </div>
          ) : top3Members.length === 0 ? (
            <p
              style={{
                margin: "0.3rem 0 0",
                fontSize: "0.8rem",
                color: "var(--muted)",
              }}
            >
              Aún no hay ranking disponible. Juega torneos para generar el top.
            </p>
          ) : (
            <div
              style={{
                display: "flex",
                justifyContent:
                  top3Members.length === 1 ? "center" : "space-between",
                gap: "0.6rem",
              }}
            >
              {top3Members.map((m, index) => {
                const isCurrentUser = m.id === userData?.id;
                const popScale = animateTop3 ? (index === 0 ? 1.05 : 1.0) : 1.0;

                return (
                  <button
                    key={m.id}
                    type="button"
                    onClick={() => handleOpenMemberDetail(m)}
                    style={{
                      flex: 1,
                      maxWidth: 120,
                      borderRadius: "0.9rem",
                      border: isCurrentUser
                        ? "2px solid var(--accent)"
                        : "1px solid var(--border)",
                      padding: "0.6rem 0.5rem",
                      background: "var(--bg-elevated)",
                      cursor: "pointer",
                      display: "flex",
                      flexDirection: "column",
                      alignItems: "center",
                      gap: "0.3rem",
                      transform: `scale(${popScale})`,
                      transition:
                        "transform 220ms ease-out, box-shadow 220ms ease-out",
                      boxShadow: animateTop3
                        ? "0 14px 30px rgba(15,23,42,0.35)"
                        : "none",
                    }}
                  >
                    <span
                      style={{
                        fontSize: "0.7rem",
                        color: "var(--muted)",
                      }}
                    >
                      #{index + 1}
                    </span>

                    <div
                      style={{
                        width: 60,
                        height: 60,
                        borderRadius: "999px",
                        overflow: "hidden",
                        border: isCurrentUser
                          ? "2px solid var(--accent)"
                          : "1px solid transparent",
                        display: "flex",
                        alignItems: "center",
                        justifyContent: "center",
                        background: m.profilePicture
                          ? "var(--bg-elevated)"
                          : "radial-gradient(circle at 30% 20%, #4084d6ff, #174ab8ff)",
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
                            fontSize: "1.4rem",
                            fontWeight: 700,
                            color: "#ffffff",
                          }}
                        >
                          {(m.name || "J")[0].toUpperCase()}
                        </span>
                      )}
                    </div>

                    <div
                      style={{
                        display: "flex",
                        flexDirection: "column",
                        alignItems: "center",
                        gap: "0.05rem",
                      }}
                    >
                      <span
                        style={{
                          fontSize: "0.8rem",
                          fontWeight: 600,
                          maxWidth: 110,
                          overflow: "hidden",
                          textOverflow: "ellipsis",
                          whiteSpace: "nowrap",
                        }}
                      >
                        {m.name}
                      </span>
                      <span
                        style={{
                          fontSize: "0.72rem",
                          color: "var(--muted)",
                        }}
                      >
                        {m.rankLabel}
                      </span>
                    </div>
                  </button>
                );
              })}
            </div>
          )}
          </div>
        </section>

        {/* 4. ACTIVIDAD RECIENTE (HOME) */}
        <section style={{ marginTop: "0.8rem", marginBottom: "0.8rem" }}>
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
                borderRadius: "1rem",
                border: "1px solid var(--border)",
                padding: "0.7rem 0.8rem",
                background: "var(--bg-elevated)",
                display: "flex",
                flexDirection: "column",
                gap: "0.4rem",
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
                  m.tournamentName || m.tournament || "Partido rankeado";

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
                fontSize: "0.8rem",
                color: "var(--muted)",
              }}
            >
              Muy pronto verás aquí tus últimos partidos y cambios de PL.
            </p>
          )}
        </section>
      </div>

      {/* MODAL: RANKING COMPLETO DEL CLUB (solo lista) */}
      {showRankingModal && (
        <div
          onClick={() => setShowRankingModal(false)}
          style={{
            position: "fixed",
            inset: 0,
            background: "rgba(0,0,0,0.9)",
            display: "flex",
            justifyContent: "center",
            alignItems: "flex-end",
            zIndex: 999,
          }}
        >
          <div
            onClick={(e) => e.stopPropagation()}
            style={{
              width: "100%",
              maxWidth: 480,
              maxHeight: "80vh",
              background: "var(--bg-body)",
              borderRadius: "1.1rem 1.1rem 0 0",
              border: "1px solid var(--border)",
              borderBottom: "none",
              padding: "0.8rem 0.9rem 0.9rem",
              display: "flex",
              flexDirection: "column",
              gap: "0.6rem",
            }}
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
                gap: "0.6rem",
              }}
            >
              <div
                style={{
                  width: 30,
                  height: 30,
                  borderRadius: "999px",
                  border: "1px solid var(--border)",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  background: "var(--bg)",
                }}
              >
                <Icon name="podium" size={16} color="var(--accent)" />
              </div>
              <div style={{ flex: 1, minWidth: 0 }}>
                <p
                  style={{
                    margin: 0,
                    fontSize: "0.9rem",
                    fontWeight: 600,
                  }}
                >
                  Ranking del club
                </p>
                <p
                  style={{
                    margin: 0,
                    fontSize: "0.78rem",
                    color: "var(--muted)",
                  }}
                >
                  Toca un jugador para ver su detalle.
                </p>
              </div>
              <button
                type="button"
                onClick={() => setShowRankingModal(false)}
                style={{
                  border: "none",
                  background: "transparent",
                  padding: 4,
                  cursor: "pointer",
                }}
              >
                <Icon name="close" size={16} color="var(--muted)" />
              </button>
            </div>

            <div
              style={{
                marginTop: "0.3rem",
                display: "flex",
                flexDirection: "column",
                gap: "0.35rem",
                paddingBottom: "0.4rem",
                overflowY: "auto",
              }}
            >
              {clubMembers.map((m, index) => (
                <button
                  key={m.id}
                  type="button"
                  onClick={() => {
                    setSelectedMember(m);
                    setShowMemberDetailModal(true);
                  }}
                  style={{
                    borderRadius: "0.7rem",
                    border: "1px solid var(--border)",
                    background: "transparent",
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
                      {m.name}
                    </p>
                    <p
                      style={{
                        margin: 0,
                        fontSize: "0.75rem",
                        color: "var(--muted)",
                      }}
                    >
                      {m.rankLabel} • {m.leaguePoints} PL
                    </p>
                  </div>
                </button>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* MODAL: DETALLE DE JUGADOR DEL CLUB */}
      {showMemberDetailModal && selectedMember && (
        <div
          onClick={() => setShowMemberDetailModal(false)}
          style={{
            position: "fixed",
            inset: 0,
            background: "rgba(0,0,0,0.9)",
            display: "flex",
            justifyContent: "center",
            alignItems: "flex-end",
            zIndex: 999,
          }}
        >
          <div
            onClick={(e) => e.stopPropagation()}
            style={{
              width: "100%",
              maxWidth: 480,
              maxHeight: "82vh",
              background: "var(--bg-body)",
              borderRadius: "1.1rem 1.1rem 0 0",
              border: "1px solid var(--border)",
              borderBottom: "none",
              padding: "0.8rem 0.9rem 0.9rem",
              display: "flex",
              flexDirection: "column",
              gap: "0.6rem",
            }}
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
                gap: "0.6rem",
              }}
            >
              <div
                style={{
                  width: 46,
                  height: 46,
                  borderRadius: "999px",
                  border: "1px solid var(--border)",
                  overflow: "hidden",
                  background: "var(--bg)",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
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
                      fontSize: "1.3rem",
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
                    fontSize: "0.95rem",
                    fontWeight: 600,
                    overflow: "hidden",
                    textOverflow: "ellipsis",
                    whiteSpace: "nowrap",
                  }}
                >
                  {selectedMember.name}
                </p>
                <p
                  style={{
                    margin: "0.1rem 0 0",
                    fontSize: "0.78rem",
                    color: "var(--muted)",
                  }}
                >
                  {selectedMember.rankLabel} • {selectedMember.leaguePoints} PL
                </p>
              </div>
              <button
                type="button"
                onClick={() => setShowMemberDetailModal(false)}
                style={{
                  border: "none",
                  background: "transparent",
                  padding: 4,
                  cursor: "pointer",
                }}
              >
                <Icon name="close" size={16} color="var(--muted)" />
              </button>
            </div>

            {/* Stats del miembro */}
            <div
              style={{
                borderRadius: "0.9rem",
                border: "1px solid var(--border)",
                padding: "0.6rem 0.7rem",
                background: "var(--bg-elevated)",
              }}
            >
              {memberDetailLoading || !memberDetail ? (
                <p
                  style={{
                    margin: 0,
                    fontSize: "0.8rem",
                    color: "var(--muted)",
                  }}
                >
                  Cargando estadísticas...
                </p>
              ) : (
                <>
                  <p
                    style={{
                      margin: "0 0 0.4rem",
                      fontSize: "0.85rem",
                      fontWeight: 600,
                    }}
                  >
                    Estadísticas del jugador
                  </p>
                  <div
                    style={{
                      display: "grid",
                      gridTemplateColumns: "repeat(2, minmax(0, 1fr))",
                      gap: "0.45rem",
                      fontSize: "0.78rem",
                    }}
                  >
                    <StatInline
                      label="Partidos jugados"
                      value={memberDetail.stats.totalMatches}
                    />
                    <StatInline
                      label="Victorias"
                      value={memberDetail.stats.wins}
                    />
                    <StatInline
                      label="Derrotas"
                      value={memberDetail.stats.losses}
                    />
                    <StatInline
                      label="Winrate"
                      value={`${memberDetail.stats.winRate || 0}%`}
                    />
                  </div>
                </>
              )}
            </div>

            {/* Partidos recientes del miembro */}
            <div
              style={{
                borderRadius: "0.9rem",
                border: "1px solid var(--border)",
                padding: "0.6rem 0.7rem",
                background: "var(--bg-elevated)",
                flex: 1,
                minHeight: 0,
                display: "flex",
                flexDirection: "column",
                gap: "0.4rem",
              }}
            >
              <p
                style={{
                  margin: 0,
                  fontSize: "0.85rem",
                  fontWeight: 600,
                }}
              >
                Actividad reciente
              </p>

              {memberDetailLoading || !memberDetail ? (
                <p
                  style={{
                    margin: 0,
                    fontSize: "0.8rem",
                    color: "var(--muted)",
                  }}
                >
                  Cargando actividad...
                </p>
              ) : memberDetail.recentMatches &&
                memberDetail.recentMatches.length > 0 ? (
                <div
                  style={{
                    display: "flex",
                    flexDirection: "column",
                    gap: "0.35rem",
                    overflowY: "auto",
                    paddingRight: "0.1rem",
                  }}
                >
                  {memberDetail.recentMatches.slice(0, 8).map((m, idx) => {
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
                    fontSize: "0.8rem",
                    color: "var(--muted)",
                  }}
                >
                  Aún no hay partidos recientes para este jugador.
                </p>
              )}
            </div>
          </div>
        </div>
      )}
    </>
  );
}

function StatCard({ label, value }) {
  return (
    <div
      style={{
        borderRadius: "0.9rem",
        border: "1px solid var(--border)",
        padding: "0.55rem 0.6rem",
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
          margin: "0.2rem 0 0",
          fontSize: "1rem",
          fontWeight: 600,
        }}
      >
        {value}
      </p>
    </div>
  );
}

function StatInline({ label, value }) {
  return (
    <div>
      <p
        style={{
          margin: 0,
          fontSize: "0.75rem",
          color: "var(--muted)",
        }}
      >
        {label}
      </p>
      <p
        style={{
          margin: "0.05rem 0 0",
          fontSize: "0.85rem",
          fontWeight: 600,
        }}
      >
        {value}
      </p>
    </div>
  );
}
