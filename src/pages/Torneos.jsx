import { useEffect, useMemo, useState } from "react";
import {
  addDoc,
  collection,
  doc,
  getDoc,
  onSnapshot,
  query,
  where,
} from "firebase/firestore";
import { db } from "../firebase/firebase";
import { useAuth } from "../context/AuthContext";
import { useNavigate } from "react-router-dom";
import Icon from "../components/common/Icon";

const MONTH_NAMES_ES = [
  "Enero",
  "Febrero",
  "Marzo",
  "Abril",
  "Mayo",
  "Junio",
  "Julio",
  "Agosto",
  "Septiembre",
  "Octubre",
  "Noviembre",
  "Diciembre",
];

export default function Torneos() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const userId = user?.uid || null;

  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  const [activeClubId, setActiveClubId] = useState(null);
  const [activeClub, setActiveClub] = useState(null);
  const [clubMembers, setClubMembers] = useState([]);

  const [tournaments, setTournaments] = useState([]);

  const [showCreate, setShowCreate] = useState(false);
  const [errorMsg, setErrorMsg] = useState("");
  const [successMsg, setSuccessMsg] = useState("");

  const [form, setForm] = useState({
    name: "",
    players: [],
    guests: [],
    guestName: "",
    matchCount: 8,
    courts: 1,
  });

  // Vista previa
  const [previewMatches, setPreviewMatches] = useState([]);
  const [showPreview, setShowPreview] = useState(false);

  // Modal torneos completados
  const [showCompletedModal, setShowCompletedModal] = useState(false);

  const resetMessages = () => {
    setErrorMsg("");
    setSuccessMsg("");
  };

  const handleFormChange = (field, value) => {
    setForm((prev) => ({
      ...prev,
      [field]: value,
    }));
    if (["matchCount", "courts", "name"].includes(field)) {
      setPreviewMatches([]);
      setShowPreview(false);
    }
  };

  const getAllPlayerIds = () => [
    ...form.players,
    ...form.guests.map((_, idx) => `guest-${idx}`),
  ];

  const getPlayerDisplayName = (id) => {
    if (id.startsWith("guest-")) {
      const idx = parseInt(id.split("-")[1], 10);
      return form.guests[idx] || "Invitado";
    }
    const member = clubMembers.find((m) => m.id === id);
    return member?.name || "Jugador";
  };

  // -----------------------------
  // Cargar club activo
  // -----------------------------
  useEffect(() => {
    const loadActiveClub = async () => {
      if (!userId) {
        setLoading(false);
        return;
      }

      try {
        const userRef = doc(db, "users", userId);
        const userSnap = await getDoc(userRef);

        if (!userSnap.exists()) {
          setLoading(false);
          return;
        }

        const userData = userSnap.data();
        const clubId = userData.activeClubId || null;
        setActiveClubId(clubId);

        if (!clubId) {
          setLoading(false);
          return;
        }

        const clubRef = doc(db, "clubs", clubId);
        const clubSnap = await getDoc(clubRef);

        if (!clubSnap.exists()) {
          setLoading(false);
          return;
        }

        const clubData = { id: clubSnap.id, ...clubSnap.data() };
        setActiveClub(clubData);

        if (Array.isArray(clubData.members) && clubData.members.length > 0) {
          const membersData = [];
          for (const memberId of clubData.members) {
            try {
              const memberRef = doc(db, "users", memberId);
              const memberSnap = await getDoc(memberRef);
              if (memberSnap.exists()) {
                const data = memberSnap.data();
                membersData.push({
                  id: memberId,
                  name:
                    data.name ||
                    data.displayName ||
                    (data.email ? data.email.split("@")[0] : "Jugador"),
                  email: data.email || "",
                  profilePicture: data.profilePicture || data.photoURL || "",
                });
              }
            } catch (err) {
              console.error("Error cargando miembro del club:", err);
            }
          }
          setClubMembers(membersData);
        }
      } catch (err) {
        console.error("Error cargando club activo:", err);
      } finally {
        setLoading(false);
      }
    };

    loadActiveClub();
  }, [userId]);

  // -----------------------------
  // Escuchar torneos del club
  // -----------------------------
  useEffect(() => {
    if (!activeClubId) return;

    const q = query(
      collection(db, "tournaments"),
      where("clubId", "==", activeClubId)
    );

    const unsub = onSnapshot(
      q,
      (snapshot) => {
        const data = snapshot.docs.map((d) => ({ id: d.id, ...d.data() }));
        setTournaments(
          data.sort((a, b) => {
            const da = a.createdAt || "";
            const dbb = b.createdAt || "";
            return dbb.localeCompare(da);
          })
        );
      },
      (err) => console.error("Error escuchando torneos:", err)
    );

    return () => unsub();
  }, [activeClubId]);

  const activeTournaments = useMemo(
    () => tournaments.filter((t) => t.status === "active"),
    [tournaments]
  );

  const completedTournaments = useMemo(
    () => tournaments.filter((t) => t.status === "completed"),
    [tournaments]
  );

  // Agrupar completados por mes/año
  const completedByMonth = useMemo(() => {
    if (completedTournaments.length === 0) return [];

    const groups = {};

    completedTournaments.forEach((t) => {
      const rawDate = t.completedAt || t.createdAt || null;
      let key = "sin-fecha";
      let label = "Sin fecha";

      if (rawDate) {
        const d = new Date(rawDate);
        if (!isNaN(d.getTime())) {
          const year = d.getFullYear();
          const month = d.getMonth();
          key = `${year}-${String(month + 1).padStart(2, "0")}`;
          label = `${MONTH_NAMES_ES[month]} ${year}`;
        }
      }

      if (!groups[key]) {
        groups[key] = { label, items: [] };
      }
      groups[key].items.push(t);
    });

    return Object.entries(groups)
      .sort((a, b) => {
        if (a[0] === "sin-fecha") return 1;
        if (b[0] === "sin-fecha") return -1;
        return b[0].localeCompare(a[0]);
      })
      .map(([key, value]) => ({ key, ...value }));
  }, [completedTournaments]);

  // -----------------------------
  // Selección de jugadores
  // -----------------------------
  const togglePlayer = (memberId) => {
    setForm((prev) => {
      const isSelected = prev.players.includes(memberId);
      const updatedPlayers = isSelected
        ? prev.players.filter((id) => id !== memberId)
        : [...prev.players, memberId];

      setPreviewMatches([]);
      setShowPreview(false);

      return {
        ...prev,
        players: updatedPlayers,
      };
    });
  };

  // Invitados
  const addGuest = () => {
    const name = form.guestName.trim();
    if (!name) return;
    if (form.guests.includes(name)) {
      setErrorMsg("Ese invitado ya está en la lista.");
      return;
    }
    setForm((prev) => ({
      ...prev,
      guests: [...prev.guests, name],
      guestName: "",
    }));
    setErrorMsg("");
    setPreviewMatches([]);
    setShowPreview(false);
  };

  const removeGuest = (name) => {
    setForm((prev) => {
      const newGuests = prev.guests.filter((g) => g !== name);
      return {
        ...prev,
        guests: newGuests,
      };
    });
    setPreviewMatches([]);
    setShowPreview(false);
  };

  // -----------------------------
  // Generación de partidos con aleatoriedad
  // -----------------------------
const generateInitialMatches = (playerIds, desiredMatchCount) => {
  if (!Array.isArray(playerIds) || playerIds.length < 4) return [];

  const matchCount = Math.max(1, desiredMatchCount || 1);

  // Mezcla base para que cada "recalcular" tenga orden diferente
  const players = [...playerIds].sort(() => Math.random() - 0.5);

  // Stats por jugador (solo contamos partidos de este torneo)
  const stats = {};
  players.forEach((id) => {
    stats[id] = { matches: 0 };
  });

  // Contadores de compañeros y rivales para dar variedad
  const teammateCounts = {};
  const opponentCounts = {};

  const pairKey = (a, b) => (a < b ? `${a}|${b}` : `${b}|${a}`);

  const addTeammates = (team) => {
    for (let i = 0; i < team.length; i++) {
      for (let j = i + 1; j < team.length; j++) {
        const key = pairKey(team[i], team[j]);
        teammateCounts[key] = (teammateCounts[key] || 0) + 1;
      }
    }
  };

  const addOpponents = (team1, team2) => {
    for (const a of team1) {
      for (const b of team2) {
        const key = pairKey(a, b);
        opponentCounts[key] = (opponentCounts[key] || 0) + 1;
      }
    }
  };

  // Coste de repetir compañeros/contrincantes
  const repetitionCost = (team1, team2) => {
    let cost = 0;

    const addTeamCost = (team) => {
      for (let i = 0; i < team.length; i++) {
        for (let j = i + 1; j < team.length; j++) {
          const key = pairKey(team[i], team[j]);
          cost += (teammateCounts[key] || 0) * 3; // pesar más repetir equipo
        }
      }
    };

    addTeamCost(team1);
    addTeamCost(team2);

    for (const a of team1) {
      for (const b of team2) {
        const key = pairKey(a, b);
        cost += (opponentCounts[key] || 0) * 1; // repetir rivales pesa menos
      }
    }

    return cost;
  };

  // Coste de "fairness": diferencia entre el que más y el que menos partidos tendría
  const fairnessCostForGroup = (group) => {
    let minMatches = Infinity;
    let maxMatches = -Infinity;

    players.forEach((id) => {
      const base = stats[id].matches || 0;
      const next = base + (group.includes(id) ? 1 : 0);
      if (next < minMatches) minMatches = next;
      if (next > maxMatches) maxMatches = next;
    });

    return maxMatches - minMatches; // idealmente 0 o 1
  };

  const matches = [];

  for (let matchIndex = 0; matchIndex < matchCount; matchIndex++) {
    // Ordenamos por partidos jugados (fairness muy fuerte aquí)
    const sortedByMatches = [...players].sort((a, b) => {
      const ma = stats[a].matches;
      const mb = stats[b].matches;
      if (ma !== mb) return ma - mb;
      return 0; // dejamos el orden aleatorio inicial para romper empates
    });

    // Pool de candidatos: los que menos partidos llevan (hasta 8)
    const poolSize = Math.min(sortedByMatches.length, 8);
    const pool = sortedByMatches.slice(0, poolSize);

    if (pool.length < 4) break;

    let bestChoice = null;
    let bestTotalCost = Infinity;

    // Probamos todas las combinaciones de 4 dentro del pool
    for (let i = 0; i < pool.length - 3; i++) {
      for (let j = i + 1; j < pool.length - 2; j++) {
        for (let k = j + 1; k < pool.length - 1; k++) {
          for (let l = k + 1; l < pool.length; l++) {
            const group = [pool[i], pool[j], pool[k], pool[l]];

            const fairness = fairnessCostForGroup(group);

            // Evitamos, en lo posible, combinaciones que creen diferencia > 1
            // (pero si no hay otra opción, las permitimos)
            const fairnessWeight = 10; // peso fuerte para fairness

            // Ahora miramos cómo formar los equipos dentro de este grupo
            const [a, b, c, d] = group;
            const options = [
              { team1: [a, b], team2: [c, d] },
              { team1: [a, c], team2: [b, d] },
              { team1: [a, d], team2: [b, c] },
            ];

            let bestForGroup = options[0];
            let bestRepCost = repetitionCost(
              options[0].team1,
              options[0].team2
            );

            for (let optIdx = 1; optIdx < options.length; optIdx++) {
              const opt = options[optIdx];
              const rep = repetitionCost(opt.team1, opt.team2);
              if (rep < bestRepCost) {
                bestRepCost = rep;
                bestForGroup = opt;
              }
            }

            const totalCost = fairness * fairnessWeight + bestRepCost;

            if (
              totalCost < bestTotalCost ||
              // Si el fairness es mejor, preferimos ese incluso con coste similar
              (fairness < (bestChoice?.fairness ?? Infinity) &&
                fairness <= 1)
            ) {
              bestTotalCost = totalCost;
              bestChoice = {
                team1: bestForGroup.team1,
                team2: bestForGroup.team2,
                fairness,
              };
            }
          }
        }
      }
    }

    if (!bestChoice) break;

    const matchId = `match-${Date.now()}-${matchIndex}-${Math.random()
      .toString(36)
      .slice(2, 8)}`;

    matches.push({
      id: matchId,
      team1: bestChoice.team1,
      team2: bestChoice.team2,
      scoreTeam1: null,
      scoreTeam2: null,
      status: "pending",
      createdAt: new Date().toISOString(),
    });

    // Actualizamos stats y contadores de compañeros/rivales
    [...bestChoice.team1, ...bestChoice.team2].forEach((pid) => {
      stats[pid].matches += 1;
    });

    addTeammates(bestChoice.team1);
    addTeammates(bestChoice.team2);
    addOpponents(bestChoice.team1, bestChoice.team2);
  }

  return matches;
};

  // -----------------------------
  // Vista previa -> abre modal
  // -----------------------------
  const handleGeneratePreview = () => {
    resetMessages();

    const totalPlayers = form.players.length + form.guests.length;
    if (totalPlayers < 4) {
      setErrorMsg("Se necesitan al menos 4 jugadores para generar el torneo.");
      setShowPreview(false);
      setPreviewMatches([]);
      return;
    }

    const allPlayerIds = getAllPlayerIds();
    const matches = generateInitialMatches(
      allPlayerIds,
      Number(form.matchCount) || 8
    );

    if (!matches || matches.length === 0) {
      setErrorMsg(
        "No se pudieron generar partidos, revisa la cantidad de jugadores."
      );
      setShowPreview(false);
      setPreviewMatches([]);
      return;
    }

    setPreviewMatches(matches);
    setShowPreview(true); // <- aquí se abre el modal
  };

  // -----------------------------
  // Crear torneo (desde botón del modal)
  // -----------------------------
  const handleCreateTournament = async () => {
    resetMessages();

    if (!userId) {
      setErrorMsg("Debes iniciar sesión.");
      return;
    }
    if (!activeClubId) {
      setErrorMsg("Primero define un club activo en la sección Clubes.");
      return;
    }

    const totalPlayers = form.players.length + form.guests.length;
    if (totalPlayers < 4) {
      setErrorMsg("Se necesitan al menos 4 jugadores para crear un torneo.");
      return;
    }

    setSaving(true);

    try {
      const allPlayerIds = getAllPlayerIds();
      const matches =
        showPreview && previewMatches.length > 0
          ? previewMatches
          : generateInitialMatches(
              allPlayerIds,
              Number(form.matchCount) || 8
            );

      let finalName = form.name.trim();
      if (!finalName) {
        const baseName = `Torneo ${
          activeClub?.name || "Padel"
        } - ${new Date().toLocaleDateString("es-MX")}`;

        const existingNames = new Set(tournaments.map((t) => t.name));
        if (!existingNames.has(baseName)) {
          finalName = baseName;
        } else {
          let suffix = 2;
          let candidate = `${baseName} #${suffix}`;
          while (existingNames.has(candidate)) {
            suffix += 1;
            candidate = `${baseName} #${suffix}`;
          }
          finalName = candidate;
        }
      }

      const payload = {
        name: finalName,
        clubId: activeClubId,
        clubName: activeClub?.name || "",
        createdBy: userId,
        createdAt: new Date().toISOString(),
        status: "active",
        players: form.players,
        guestPlayers: form.guests,
        matches,
        maxCourts: form.courts,
      };

      const docRef = await addDoc(collection(db, "tournaments"), payload);

      setForm({
        name: "",
        players: [],
        guests: [],
        guestName: "",
        matchCount: 8,
        courts: 1,
      });
      setPreviewMatches([]);
      setShowPreview(false);
      setShowCreate(false);
      setSuccessMsg("Torneo creado correctamente.");

      // 👉 Ir directo al torneo recién creado
      navigate(`/torneos/${docRef.id}`);
    } catch (err) {
      console.error("Error creando torneo:", err);
      setErrorMsg("No se pudo crear el torneo.");
    } finally {
      setSaving(false);
    }
  };

  // -----------------------------
  // Helpers de display
  // -----------------------------
  const getTournamentPlayersCount = (t) => {
    const base = Array.isArray(t.players) ? t.players.length : 0;
    const guests = Array.isArray(t.guestPlayers) ? t.guestPlayers.length : 0;
    return base + guests;
  };

  const getMatchesCount = (t) =>
    Array.isArray(t.matches) ? t.matches.length : 0;

  const getPendingCount = (t) =>
    Array.isArray(t.matches)
      ? t.matches.filter((m) => m.status === "pending").length
      : 0;

  const getCourtsCount = (t) => t.maxCourts || t.courts || 1;

  const totalPlayersForm = form.players.length + form.guests.length || 0;
  const approxMatchesPerPlayer =
    totalPlayersForm > 0
      ? ((form.matchCount * 4) / totalPlayersForm).toFixed(1)
      : "0.0";

    if (loading) {
      return (
        <div
          style={{
            display: "flex",
            flexDirection: "column",
            gap: "1rem",
            paddingBottom: "0.75rem",
          }}
        >
          {/* HEADER SKELETON */}
          <section
            style={{
              borderRadius: "1.2rem",
              padding: "1rem 1.1rem",
              border: "1px solid var(--border)",
              background: "var(--bg-elevated)",
            }}
          >
            <div
              style={{
                display: "flex",
                alignItems: "center",
                gap: "0.7rem",
                marginBottom: "0.6rem",
              }}
            >
              <div
                className="skeleton"
                style={{
                  width: 40,
                  height: 40,
                  borderRadius: "1rem",
                }}
              />
              <div style={{ flex: 1, minWidth: 0 }}>
                <div
                  className="skeleton"
                  style={{
                    height: 14,
                    width: "40%",
                    borderRadius: 999,
                    marginBottom: 8,
                  }}
                />
                <div
                  className="skeleton"
                  style={{
                    height: 10,
                    width: "80%",
                    borderRadius: 999,
                    marginBottom: 6,
                  }}
                />
                <div
                  className="skeleton"
                  style={{
                    height: 10,
                    width: "60%",
                    borderRadius: 999,
                  }}
                />
              </div>
            </div>

            <div
              style={{
                display: "flex",
                gap: "0.5rem",
                marginTop: "0.5rem",
              }}
            >
              <div
                className="skeleton"
                style={{
                  flex: 1,
                  height: 32,
                  borderRadius: 999,
                }}
              />
              <div
                className="skeleton"
                style={{
                  flex: 1,
                  height: 32,
                  borderRadius: 999,
                }}
              />
            </div>
          </section>

          {/* LISTA DE TORNEOS ACTIVOS SKELETON */}
          <section>
            <div
              className="skeleton"
              style={{
                height: 14,
                width: 120,
                borderRadius: 999,
                marginBottom: "0.5rem",
              }}
            />
            <div
              style={{
                display: "flex",
                flexDirection: "column",
                gap: "0.6rem",
              }}
            >
              {[1, 2].map((i) => (
                <article
                  key={i}
                  style={{
                    borderRadius: "0.9rem",
                    border: "1px solid var(--border)",
                    padding: "0.65rem 0.7rem",
                    background: "var(--bg-elevated)",
                  }}
                >
                  <div
                    style={{
                      display: "flex",
                      alignItems: "center",
                      gap: "0.55rem",
                    }}
                  >
                    <div
                      className="skeleton"
                      style={{
                        width: 30,
                        height: 30,
                        borderRadius: "0.8rem",
                        flexShrink: 0,
                      }}
                    />
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <div
                        className="skeleton"
                        style={{
                          height: 12,
                          width: "70%",
                          borderRadius: 999,
                          marginBottom: 6,
                        }}
                      />
                      <div
                        className="skeleton"
                        style={{
                          height: 10,
                          width: "90%",
                          borderRadius: 999,
                        }}
                      />
                    </div>
                    <div
                      className="skeleton"
                      style={{
                        width: 70,
                        height: 26,
                        borderRadius: 999,
                        flexShrink: 0,
                      }}
                    />
                  </div>
                </article>
              ))}
            </div>
          </section>

          {/* BLOQUE COMPLETADOS SKELETON */}
          <section>
            <div
              className="skeleton"
              style={{
                height: 14,
                width: 140,
                borderRadius: 999,
                marginBottom: "0.5rem",
              }}
            />
            <div
              style={{
                borderRadius: "0.9rem",
                border: "1px solid var(--border)",
                padding: "0.6rem 0.7rem",
                background: "var(--bg-elevated)",
                display: "flex",
                alignItems: "center",
                gap: "0.6rem",
              }}
            >
              <div
                className="skeleton"
                style={{
                  width: 26,
                  height: 26,
                  borderRadius: "0.8rem",
                  flexShrink: 0,
                }}
              />
              <div style={{ flex: 1, minWidth: 0 }}>
                <div
                  className="skeleton"
                  style={{
                    height: 12,
                    width: "60%",
                    borderRadius: 999,
                    marginBottom: 6,
                  }}
                />
                <div
                  className="skeleton"
                  style={{
                    height: 10,
                    width: "80%",
                    borderRadius: 999,
                  }}
                />
              </div>
              <div
                className="skeleton"
                style={{
                  width: 90,
                  height: 26,
                  borderRadius: 999,
                  flexShrink: 0,
                }}
              />
            </div>
          </section>

          {/* Estilos del skeleton */}
          <style>{`
            .skeleton {
              position: relative;
              overflow: hidden;
              background: linear-gradient(
                90deg,
                rgba(148, 163, 184, 0.22),
                rgba(148, 163, 184, 0.35),
                rgba(148, 163, 184, 0.22)
              );
              background-size: 200% 100%;
              animation: shimmer 1.3s infinite;
            }

            @keyframes shimmer {
              0% {
                background-position: -200% 0;
              }
              100% {
                background-position: 200% 0;
              }
            }
          `}</style>
        </div>
      );
    }

  const hasActiveClub = !!activeClubId;

  // Nombre "preview" que verás en el modal
  const buildPreviewName = () => {
    if (form.name.trim()) return form.name.trim();
    const baseName = `Torneo ${
      activeClub?.name || "Padel"
    } - ${new Date().toLocaleDateString("es-MX")}`;
    return `${baseName} (nombre automático)`;
  };

  const allPreviewPlayers = getAllPlayerIds().map((id) =>
    getPlayerDisplayName(id)
  );

  return (
    <div
      style={{
        display: "flex",
        flexDirection: "column",
        gap: "1rem",
        paddingBottom: "0.75rem",
      }}
    >
      {/* HEADER */}
      <section
        style={{
          borderRadius: "1.2rem",
          padding: "1rem 1.1rem",
          border: "1px solid var(--border)",
          background: "var(--bg-elevated)",
        }}
      >
        <div
          style={{
            display: "flex",
            alignItems: "center",
            gap: "0.7rem",
            marginBottom: "0.6rem",
          }}
        >
          <div
            style={{
              width: 40,
              height: 40,
              borderRadius: "1rem",
              background:
                "linear-gradient(135deg, rgba(59,130,246,0.9), rgba(147,51,234,0.9))",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
            }}
          >
            <Icon name="trophy" size={22} color="#ffffff" />
          </div>
          <div style={{ minWidth: 0 }}>
            <h1
              style={{
                margin: 0,
                fontSize: "1.05rem",
                fontWeight: 700,
              }}
            >
              Torneos
            </h1>
            <p
              style={{
                margin: 0,
                marginTop: "0.2rem",
                fontSize: "0.8rem",
                color: "var(--muted)",
              }}
            >
              Organiza partidos y genera estadísticas dentro de tu club activo.
            </p>
            <p
              style={{
                margin: 0,
                marginTop: "0.3rem",
                fontSize: "0.76rem",
                color: "var(--muted)",
              }}
            >
              Club activo:{" "}
              <span
                style={{
                  fontWeight: 600,
                  color: hasActiveClub ? "var(--fg)" : "var(--muted)",
                }}
              >
                {hasActiveClub
                  ? activeClub?.name || "Club sin nombre"
                  : "ninguno (ve a Clubes)"}
              </span>
            </p>
          </div>
        </div>

        <div
          style={{
            display: "flex",
            gap: "0.5rem",
            marginTop: "0.5rem",
          }}
        >
          <button
            type="button"
            onClick={() => {
              resetMessages();
              if (!hasActiveClub) return;
              setShowCreate(true);
            }}
            disabled={!hasActiveClub}
            style={{
              flex: 1,
              borderRadius: "999px",
              border: "none",
              padding: "0.55rem 0.7rem",
              background: hasActiveClub
                ? "linear-gradient(135deg, var(--accent), rgba(59,130,246,0.9))"
                : "var(--border)",
              color: "#ffffff",
              fontSize: "0.85rem",
              fontWeight: 600,
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              gap: "0.35rem",
              cursor: hasActiveClub ? "pointer" : "default",
            }}
          >
            <Icon name="add" size={16} color="#ffffff" />
            Crear torneo
          </button>
          <button
            type="button"
            onClick={() => navigate("/clubes")}
            style={{
              borderRadius: "999px",
              border: "1px solid var(--border)",
              padding: "0.55rem 0.7rem",
              background: "var(--bg)",
              color: "var(--fg)",
              fontSize: "0.85rem",
              fontWeight: 500,
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              gap: "0.35rem",
              cursor: "pointer",
            }}
          >
            <Icon name="club" size={16} color="var(--muted)" />
            Clubes
          </button>
        </div>

        {(errorMsg || successMsg) && (
          <p
            style={{
              margin: 0,
              marginTop: "0.55rem",
              fontSize: "0.75rem",
              color: errorMsg ? "#fca5a5" : "#bbf7d0",
            }}
          >
            {errorMsg || successMsg}
          </p>
        )}
      </section>

      {/* FORM CREAR TORNEO */}
      {showCreate && hasActiveClub && (
        <section className="card">
          <h2
            style={{
              margin: 0,
              marginBottom: "0.6rem",
              fontSize: "0.95rem",
            }}
          >
            Crear torneo
          </h2>

          <form
            onSubmit={(e) => {
              e.preventDefault();
              handleGeneratePreview();
            }}
            style={{
              display: "flex",
              flexDirection: "column",
              gap: "0.6rem",
            }}
          >
            {/* Nombre */}
            <div>
              <label
                style={{
                  fontSize: "0.75rem",
                  fontWeight: 600,
                  display: "block",
                  marginBottom: "0.2rem",
                }}
              >
                Nombre del torneo
              </label>
              <input
                type="text"
                value={form.name}
                onChange={(e) => handleFormChange("name", e.target.value)}
                placeholder="Ej. Torneo Nocturno"
                style={{
                  width: "100%",
                  borderRadius: "0.8rem",
                  border: "1px solid var(--border)",
                  padding: "0.45rem 0.55rem",
                  backgroundColor: "var(--bg)",
                  color: "var(--fg)",
                  fontSize: "0.85rem",
                  outline: "none",
                }}
              />
              <p
                style={{
                  margin: 0,
                  marginTop: "0.2rem",
                  fontSize: "0.7rem",
                  color: "var(--muted)",
                }}
              >
                Si lo dejas vacío, se generará un nombre automáticamente (único
                por día y club).
              </p>
            </div>

            {/* Slider partidos */}
            <div>
              <label
                style={{
                  fontSize: "0.75rem",
                  fontWeight: 600,
                  display: "block",
                  marginBottom: "0.2rem",
                }}
              >
                Número de partidos a crear
              </label>

              <input
                type="range"
                min={6}
                max={18}
                value={form.matchCount}
                onChange={(e) =>
                  handleFormChange("matchCount", Number(e.target.value) || 1)
                }
                style={{
                  width: "100%",
                  cursor: "pointer",
                }}
              />

              <div
                style={{
                  marginTop: "0.2rem",
                  display: "flex",
                  justifyContent: "space-between",
                  fontSize: "0.72rem",
                  color: "var(--muted)",
                }}
              >
                <span>{form.matchCount} partidos</span>
                <span>
                  Aprox. {approxMatchesPerPlayer} partidos por jugador
                </span>
              </div>
            </div>

            {/* Canchas */}
            <div>
              <label
                style={{
                  fontSize: "0.75rem",
                  fontWeight: 600,
                  display: "block",
                  marginBottom: "0.2rem",
                }}
              >
                Canchas simultáneas
              </label>
              <div
                style={{
                  display: "flex",
                  gap: "0.4rem",
                }}
              >
                {[1, 2].map((n) => {
                  const active = form.courts === n;
                  return (
                    <button
                      key={n}
                      type="button"
                      onClick={() => handleFormChange("courts", n)}
                      style={{
                        flex: 1,
                        borderRadius: "999px",
                        border: active
                          ? "1px solid var(--accent)"
                          : "1px solid var(--border)",
                        padding: "0.4rem 0.5rem",
                        background: active ? "var(--accent-soft)" : "var(--bg)",
                        color: active ? "var(--accent)" : "var(--muted)",
                        fontSize: "0.8rem",
                        cursor: "pointer",
                        display: "flex",
                        alignItems: "center",
                        justifyContent: "center",
                        gap: "0.3rem",
                      }}
                    >
                      <Icon
                        name="court"
                        size={14}
                        color={active ? "var(--accent)" : "var(--muted)"}
                      />
                      {n === 1 ? "1 cancha" : "2 canchas"}
                    </button>
                  );
                })}
              </div>
            </div>

            {/* Jugadores club */}
            <div>
              <label
                style={{
                  fontSize: "0.75rem",
                  fontWeight: 600,
                  display: "block",
                  marginBottom: "0.2rem",
                }}
              >
                Jugadores del club
              </label>

              {clubMembers.length === 0 ? (
                <p
                  style={{
                    margin: 0,
                    fontSize: "0.8rem",
                    color: "var(--muted)",
                  }}
                >
                  Tu club aún no tiene jugadores registrados.
                </p>
              ) : (
                <div
                  style={{
                    display: "flex",
                    flexWrap: "wrap",
                    gap: "0.35rem",
                  }}
                >
                  {clubMembers.map((m) => {
                    const selected = form.players.includes(m.id);
                    return (
                      <button
                        key={m.id}
                        type="button"
                        onClick={() => togglePlayer(m.id)}
                        style={{
                          borderRadius: "999px",
                          border: selected
                            ? "1px solid var(--accent)"
                            : "1px solid var(--border)",
                          padding: "0.3rem 0.55rem",
                          background: selected
                            ? "var(--accent-soft)"
                            : "var(--bg)",
                          color: selected ? "var(--accent)" : "var(--fg)",
                          fontSize: "0.75rem",
                          display: "flex",
                          alignItems: "center",
                          gap: "0.25rem",
                          cursor: "pointer",
                        }}
                      >
                        <div
                          style={{
                            width: 18,
                            height: 18,
                            borderRadius: "999px",
                            overflow: "hidden",
                            backgroundColor: "var(--bg-elevated)",
                            display: "flex",
                            alignItems: "center",
                            justifyContent: "center",
                            fontSize: "0.65rem",
                            fontWeight: 600,
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
                            (m.name || "J")[0].toUpperCase()
                          )}
                        </div>
                        <span
                          style={{
                            maxWidth: 130,
                            overflow: "hidden",
                            textOverflow: "ellipsis",
                            whiteSpace: "nowrap",
                          }}
                        >
                          {m.name}
                        </span>
                      </button>
                    );
                  })}
                </div>
              )}

              <p
                style={{
                  margin: 0,
                  marginTop: "0.25rem",
                  fontSize: "0.7rem",
                  color: "var(--muted)",
                }}
              >
                Jugadores seleccionados: {form.players.length}
              </p>
            </div>

            {/* Invitados */}
            <div>
              <label
                style={{
                  fontSize: "0.75rem",
                  fontWeight: 600,
                  display: "block",
                  marginBottom: "0.2rem",
                }}
              >
                Invitados
              </label>
              <div
                style={{
                  display: "flex",
                  gap: "0.4rem",
                  marginBottom: "0.35rem",
                }}
              >
                <input
                  type="text"
                  value={form.guestName}
                  onChange={(e) =>
                    handleFormChange("guestName", e.target.value)
                  }
                  onKeyDown={(e) => {
                    if (e.key === "Enter") {
                      e.preventDefault();
                      addGuest();
                    }
                  }}
                  placeholder="Nombre del invitado"
                  style={{
                    flex: 1,
                    borderRadius: "0.8rem",
                    border: "1px solid var(--border)",
                    padding: "0.45rem 0.55rem",
                    backgroundColor: "var(--bg)",
                    color: "var(--fg)",
                    fontSize: "0.85rem",
                    outline: "none",
                  }}
                />
                <button
                  type="button"
                  onClick={addGuest}
                  style={{
                    borderRadius: "0.9rem",
                    border: "none",
                    padding: "0.45rem 0.7rem",
                    background:
                      "linear-gradient(135deg, var(--accent), rgba(59,130,246,0.9))",
                    color: "#ffffff",
                    fontSize: "0.8rem",
                    fontWeight: 600,
                    cursor: "pointer",
                    display: "flex",
                    alignItems: "center",
                    gap: "0.25rem",
                  }}
                >
                  <Icon name="add" size={14} color="#ffffff" />
                  Agregar
                </button>
              </div>

              {form.guests.length > 0 && (
                <div
                  style={{
                    display: "flex",
                    flexWrap: "wrap",
                    gap: "0.35rem",
                  }}
                >
                  {form.guests.map((g) => (
                    <div
                      key={g}
                      style={{
                        display: "flex",
                        alignItems: "center",
                        gap: "0.25rem",
                        borderRadius: "999px",
                        border: "1px solid var(--border)",
                        padding: "0.25rem 0.5rem",
                        fontSize: "0.75rem",
                        backgroundColor: "var(--bg-elevated)",
                      }}
                    >
                      <span>{g}</span>
                      <button
                        type="button"
                        onClick={() => removeGuest(g)}
                        style={{
                          border: "none",
                          background: "transparent",
                          color: "var(--muted)",
                          cursor: "pointer",
                          fontSize: "0.8rem",
                        }}
                      >
                        ×
                      </button>
                    </div>
                  ))}
                </div>
              )}

              <p
                style={{
                  margin: 0,
                  marginTop: "0.25rem",
                  fontSize: "0.7rem",
                  color: "var(--muted)",
                }}
              >
                Invitados: {form.guests.length}
              </p>
            </div>

            {/* Resumen rápido */}
            <div
              style={{
                borderRadius: "0.8rem",
                padding: "0.5rem 0.6rem",
                backgroundColor: "var(--bg-elevated)",
                border: "1px dashed var(--border)",
                fontSize: "0.78rem",
              }}
            >
              Total de jugadores:{" "}
              <strong>
                {totalPlayersForm >= 4
                  ? totalPlayersForm
                  : `${totalPlayersForm} (mínimo 4)`}
              </strong>
              <br />
              Partidos a crear: <strong>{form.matchCount}</strong> • Aprox.{" "}
              <strong>{approxMatchesPerPlayer}</strong> partidos por jugador.
            </div>

            {/* Botones finales */}
            <div
              style={{
                display: "flex",
                flexDirection: "column",
                gap: "0.4rem",
                marginTop: "0.3rem",
              }}
            >
              <button
                type="button"
                onClick={handleGeneratePreview}
                disabled={saving}
                style={{
                  width: "100%",
                  borderRadius: "0.9rem",
                  border: "1px solid var(--border)",
                  padding: "0.55rem 0.7rem",
                  background: "var(--bg)",
                  fontSize: "0.85rem",
                  color: "var(--fg)",
                  fontWeight: 500,
                  cursor: saving ? "default" : "pointer",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  gap: "0.3rem",
                }}
              >
                <Icon name="eye" size={14} color="var(--muted)" />
                Generar vista previa
              </button>

              <button
                type="button"
                onClick={() => {
                  setShowCreate(false);
                  setPreviewMatches([]);
                  setShowPreview(false);
                  resetMessages();
                }}
                disabled={saving}
                style={{
                  width: "100%",
                  borderRadius: "0.9rem",
                  border: "1px solid var(--border)",
                  padding: "0.55rem 0.7rem",
                  background: "transparent",
                  fontSize: "0.85rem",
                  color: "var(--muted)",
                  cursor: saving ? "default" : "pointer",
                }}
              >
                Cancelar
              </button>
            </div>
          </form>
        </section>
      )}

      {/* TORNEOS ACTIVOS */}
      <section>
        <h2
          style={{
            margin: 0,
            marginBottom: "0.4rem",
            fontSize: "0.95rem",
          }}
        >
          Activos ({activeTournaments.length})
        </h2>

        {activeTournaments.length === 0 ? (
          <p
            style={{
              margin: 0,
              fontSize: "0.8rem",
              color: "var(--muted)",
            }}
          >
            No tienes torneos activos en tu club.
          </p>
        ) : (
          <div
            style={{
              display: "flex",
              flexDirection: "column",
              gap: "0.6rem",
            }}
          >
            {activeTournaments.map((t) => (
              <article
                key={t.id}
                onClick={() => navigate(`/torneos/${t.id}`)}
                style={{
                  borderRadius: "0.9rem",
                  border: "1px solid var(--border)",
                  padding: "0.65rem 0.7rem",
                  background: "var(--bg-elevated)",
                  cursor: "pointer",
                }}
              >
                <div
                  style={{
                    display: "flex",
                    alignItems: "center",
                    gap: "0.55rem",
                  }}
                >
                  <div
                    style={{
                      width: 30,
                      height: 30,
                      borderRadius: "0.8rem",
                      background:
                        "linear-gradient(135deg, rgba(59,130,246,0.95), rgba(147,51,234,0.9))",
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "center",
                      flexShrink: 0,
                    }}
                  >
                    <Icon name="tournament" size={18} color="#ffffff" />
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
                        fontSize: "0.9rem",
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
                        marginTop: "0.15rem",
                        fontSize: "0.75rem",
                        color: "var(--muted)",
                      }}
                    >
                      {getTournamentPlayersCount(t)} jugadores •{" "}
                      {getMatchesCount(t)} partidos •{` `}
                      {getPendingCount(t)} pendientes • {getCourtsCount(t)}{" "}
                      {getCourtsCount(t) === 1 ? "cancha" : "canchas"}
                    </p>
                  </div>
                  <button
                    type="button"
                    onClick={(e) => {
                      e.stopPropagation();
                      navigate(`/torneos/${t.id}/jugar`);
                    }}
                    style={{
                      borderRadius: "999px",
                      border: "none",
                      padding: "0.32rem 0.75rem",
                      background:
                        "linear-gradient(135deg, var(--accent), rgba(59,130,246,0.9))",
                      color: "#ffffff",
                      fontSize: "0.75rem",
                      fontWeight: 600,
                      display: "flex",
                      alignItems: "center",
                      gap: "0.25rem",
                      cursor: "pointer",
                      flexShrink: 0,
                    }}
                  >
                    <Icon name="play" size={12} color="#ffffff" />
                    Jugar
                  </button>
                </div>
              </article>
            ))}
          </div>
        )}
      </section>

      {/* TORNEOS COMPLETADOS - RESUMEN + MODAL */}
      <section>
        <h2
          style={{
            margin: 0,
            marginBottom: "0.4rem",
            fontSize: "0.95rem",
          }}
        >
          Completados ({completedTournaments.length})
        </h2>

        {completedTournaments.length === 0 ? (
          <p
            style={{
              margin: 0,
              fontSize: "0.8rem",
              color: "var(--muted)",
            }}
          >
            Aquí aparecerán los torneos finalizados y sus rankings.
          </p>
        ) : (
          <div
            style={{
              borderRadius: "0.9rem",
              border: "1px solid var(--border)",
              padding: "0.6rem 0.7rem",
              background: "var(--bg-elevated)",
              display: "flex",
              alignItems: "center",
              gap: "0.6rem",
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
              <Icon name="check" size={16} color="#ffffff" />
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
                  fontSize: "0.83rem",
                  fontWeight: 600,
                }}
              >
                Historial de torneos
              </p>
              <p
                style={{
                  margin: 0,
                  marginTop: "0.15rem",
                  fontSize: "0.75rem",
                  color: "var(--muted)",
                }}
              >
                Tienes {completedTournaments.length} torneos completados.
              </p>
            </div>
            <button
              type="button"
              onClick={() => setShowCompletedModal(true)}
              style={{
                borderRadius: "999px",
                border: "none",
                padding: "0.38rem 0.85rem",
                background:
                  "linear-gradient(135deg, var(--accent), rgba(59,130,246,0.9))",
                color: "#ffffff",
                fontSize: "0.78rem",
                fontWeight: 600,
                cursor: "pointer",
                display: "flex",
                alignItems: "center",
                gap: "0.35rem",
                boxShadow: "0 0 0 1px rgba(15,23,42,0.12)",
              }}
            >
              <Icon name="eye" size={14} color="#ffffff" />
              Ver torneos
            </button>
          </div>
        )}
      </section>

      {/* MODAL TORNEOS COMPLETADOS */}
      {showCompletedModal && (
        <div
          style={{
            position: "fixed",
            inset: 0,
            background: "rgba(0,0,0,0.45)",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            zIndex: 40,
          }}
        >
          <div
            style={{
              width: "100%",
              maxWidth: 480,
              maxHeight: "80vh",
              margin: "0 1rem",
              borderRadius: "1rem",
              background: "var(--bg)",
              border: "1px solid var(--border)",
              padding: "0.8rem 0.9rem",
              display: "flex",
              flexDirection: "column",
              gap: "0.6rem",
              overflowY: "auto",
            }}
          >
            <div
              style={{
                display: "flex",
                alignItems: "center",
                gap: "0.5rem",
              }}
            >
              <div
                style={{
                  width: 28,
                  height: 28,
                  borderRadius: "0.8rem",
                  background:
                    "linear-gradient(135deg, rgba(16,185,129,0.95), rgba(22,163,74,0.9))",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  flexShrink: 0,
                }}
              >
                <Icon name="check" size={16} color="#ffffff" />
              </div>
              <div style={{ flex: 1, minWidth: 0 }}>
                <h3
                  style={{
                    margin: 0,
                    fontSize: "0.9rem",
                  }}
                >
                  Torneos completados
                </h3>
                <p
                  style={{
                    margin: 0,
                    marginTop: "0.15rem",
                    fontSize: "0.75rem",
                    color: "var(--muted)",
                  }}
                >
                  Agrupados por mes y año.
                </p>
              </div>
              <button
                type="button"
                onClick={() => setShowCompletedModal(false)}
                style={{
                  border: "none",
                  background: "transparent",
                  color: "var(--muted)",
                  cursor: "pointer",
                  fontSize: "1.1rem",
                }}
              >
                ×
              </button>
            </div>

            {completedByMonth.length === 0 ? (
              <p
                style={{
                  margin: 0,
                  fontSize: "0.8rem",
                  color: "var(--muted)",
                }}
              >
                No hay torneos completados aún.
              </p>
            ) : (
              <div
                style={{
                  display: "flex",
                  flexDirection: "column",
                  gap: "0.75rem",
                  marginTop: "0.2rem",
                }}
              >
                {completedByMonth.map((group) => (
                  <div key={group.key}>
                    <h4
                      style={{
                        margin: 0,
                        marginBottom: "0.25rem",
                        fontSize: "0.85rem",
                        color: "var(--muted)",
                      }}
                    >
                      {group.label}
                    </h4>
                    <div
                      style={{
                        display: "flex",
                        flexDirection: "column",
                        gap: "0.45rem",
                      }}
                    >
                      {group.items.map((t) => (
                        <article
                          key={t.id}
                          onClick={() => {
                            setShowCompletedModal(false);
                            navigate(`/torneos/${t.id}`);
                          }}
                          style={{
                            borderRadius: "0.9rem",
                            border: "1px solid var(--border)",
                            padding: "0.6rem 0.7rem",
                            background: "var(--bg-elevated)",
                            cursor: "pointer",
                          }}
                        >
                          <div
                            style={{
                              display: "flex",
                              alignItems: "center",
                              gap: "0.55rem",
                            }}
                          >
                            <div
                              style={{
                                width: 24,
                                height: 24,
                                borderRadius: "0.7rem",
                                background:
                                  "linear-gradient(135deg, rgba(16,185,129,0.95), rgba(22,163,74,0.9))",
                                display: "flex",
                                alignItems: "center",
                                justifyContent: "center",
                                flexShrink: 0,
                              }}
                            >
                              <Icon name="trophy" size={15} color="#ffffff" />
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
                                  fontSize: "0.88rem",
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
                                  marginTop: "0.15rem",
                                  fontSize: "0.75rem",
                                  color: "var(--muted)",
                                }}
                              >
                                {getTournamentPlayersCount(t)} jugadores •{" "}
                                {getMatchesCount(t)} partidos •{" "}
                                {getCourtsCount(t)}{" "}
                                {getCourtsCount(t) === 1
                                  ? "cancha"
                                  : "canchas"}
                              </p>
                            </div>
                            <Icon
                              name="chevron-right"
                              size={16}
                              color="var(--muted)"
                            />
                          </div>
                        </article>
                      ))}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      )}

      {/* MODAL VISTA PREVIA DEL TORNEO */}
      {showPreview && previewMatches.length > 0 && (
        <div
          style={{
            position: "fixed",
            inset: 0,
            background: "rgba(0,0,0,0.45)",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            zIndex: 50,
          }}
        >
          <div
            style={{
              width: "100%",
              maxWidth: 480,
              maxHeight: "80vh",
              margin: "0 1rem",
              borderRadius: "1rem",
              background: "var(--bg)",
              border: "1px solid var(--border)",
              padding: "0.9rem 0.9rem",
              display: "flex",
              flexDirection: "column",
              gap: "0.6rem",
              overflowY: "auto",
            }}
          >
            <div
              style={{
                display: "flex",
                alignItems: "center",
                gap: "0.5rem",
              }}
            >
              <div
                style={{
                  width: 28,
                  height: 28,
                  borderRadius: "0.8rem",
                  background:
                    "linear-gradient(135deg, rgba(59,130,246,0.95), rgba(147,51,234,0.9))",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  flexShrink: 0,
                }}
              >
                <Icon name="tournament" size={16} color="#ffffff" />
              </div>
              <div style={{ flex: 1, minWidth: 0 }}>
                <h3
                  style={{
                    margin: 0,
                    fontSize: "0.9rem",
                  }}
                >
                  Vista previa del torneo
                </h3>
                <p
                  style={{
                    margin: 0,
                    marginTop: "0.15rem",
                    fontSize: "0.75rem",
                    color: "var(--muted)",
                  }}
                >
                  Revisa participantes y emparejamientos antes de crearlo.
                </p>
              </div>
              <button
                type="button"
                onClick={() => setShowPreview(false)}
                style={{
                  border: "none",
                  background: "transparent",
                  color: "var(--muted)",
                  cursor: "pointer",
                  fontSize: "1.1rem",
                }}
              >
                ×
              </button>
            </div>

            <div
              style={{
                fontSize: "0.78rem",
                color: "var(--muted)",
                borderRadius: "0.8rem",
                border: "1px solid var(--border)",
                padding: "0.45rem 0.55rem",
                background: "var(--bg-elevated)",
              }}
            >
              <div>
                <strong>Nombre:</strong> {buildPreviewName()}
              </div>
              <div style={{ marginTop: "0.25rem" }}>
                <strong>Participantes:</strong>{" "}
                {allPreviewPlayers.length === 0
                  ? "—"
                  : allPreviewPlayers.join(", ")}
              </div>
              <div style={{ marginTop: "0.25rem" }}>
                <strong>Partidos:</strong> {previewMatches.length}
              </div>
            </div>

            <div
              style={{
                display: "flex",
                flexDirection: "column",
                gap: "0.3rem",
                marginTop: "0.1rem",
              }}
            >
              {previewMatches.slice(0, 10).map((m, idx) => {
                const t1a = getPlayerDisplayName(m.team1[0]);
                const t1b = getPlayerDisplayName(m.team1[1]);
                const t2a = getPlayerDisplayName(m.team2[0]);
                const t2b = getPlayerDisplayName(m.team2[1]);

                return (
                  <div
                    key={m.id || idx}
                    style={{
                      borderRadius: "0.7rem",
                      border: "1px solid var(--border)",
                      padding: "0.35rem 0.45rem",
                      background: "var(--bg-elevated)",
                      fontSize: "0.75rem",
                    }}
                  >
                    <span
                      style={{
                        fontWeight: 600,
                        marginRight: "0.25rem",
                      }}
                    >
                      Partido {idx + 1}:
                    </span>
                    <span>
                      {t1a} &amp; {t1b} vs {t2a} &amp; {t2b}
                    </span>
                  </div>
                );
              })}
              {previewMatches.length > 10 && (
                <p
                  style={{
                    margin: 0,
                    marginTop: "0.15rem",
                    fontSize: "0.72rem",
                    color: "var(--muted)",
                  }}
                >
                  Y {previewMatches.length - 10} partidos más...
                </p>
              )}
            </div>

            <div
              style={{
                display: "flex",
                flexDirection: "column",
                gap: "0.4rem",
                marginTop: "0.4rem",
              }}
            >
              <button
                type="button"
                onClick={handleGeneratePreview}
                disabled={saving}
                style={{
                  width: "100%",
                  borderRadius: "0.9rem",
                  border: "1px solid var(--border)",
                  padding: "0.5rem 0.7rem",
                  background: "var(--bg)",
                  fontSize: "0.83rem",
                  color: "var(--fg)",
                  cursor: saving ? "default" : "pointer",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  gap: "0.3rem",
                }}
              >
                <Icon name="refresh" size={14} color="var(--muted)" />
                Recalcular emparejamientos
              </button>

              <button
                type="button"
                onClick={handleCreateTournament}
                disabled={saving}
                style={{
                  width: "100%",
                  borderRadius: "0.9rem",
                  border: "none",
                  padding: "0.55rem 0.7rem",
                  background:
                    "linear-gradient(135deg, var(--accent), rgba(59,130,246,0.9))",
                  color: "#ffffff",
                  fontSize: "0.85rem",
                  fontWeight: 600,
                  cursor: saving ? "default" : "pointer",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  gap: "0.3rem",
                }}
              >
                <Icon name="check" size={14} color="#ffffff" />
                Todo bien, crear torneo
              </button>
            </div>
          </div>
        </div>
      )}

      <style>{`
        .card {
          border-radius: 1rem;
          padding: 0.8rem 0.9rem;
          border: 1px solid var(--border);
          background: var(--bg-elevated);
        }
      `}</style>
    </div>
  );
}
