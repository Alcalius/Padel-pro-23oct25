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
    players: [], // ids de usuarios del club
    guests: [], // nombres de invitados
    guestName: "",
    matchCount: 8, // número de partidos (slider)
    courts: 1, // número de canchas simultáneas
  });

  // -----------------------------
  // Helpers
  // -----------------------------
  const resetMessages = () => {
    setErrorMsg("");
    setSuccessMsg("");
  };

  const handleFormChange = (field, value) => {
    setForm((prev) => ({
      ...prev,
      [field]: value,
    }));
  };

  // -----------------------------
  // Cargar club activo del usuario
  // -----------------------------
  useEffect(() => {
    const loadActiveClub = async () => {
      if (!userId) {
        setLoading(false);
        return;
      }

      try {
        // 1) User -> activeClubId
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

        // 2) Club info
        const clubRef = doc(db, "clubs", clubId);
        const clubSnap = await getDoc(clubRef);

        if (!clubSnap.exists()) {
          setLoading(false);
          return;
        }

        const clubData = { id: clubSnap.id, ...clubSnap.data() };
        setActiveClub(clubData);

        // 3) Miembros del club (colección users)
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
  // Escuchar torneos del club activo
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
      (err) => {
        console.error("Error escuchando torneos:", err);
      }
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

  // -----------------------------
  // Selección de jugadores del club
  // -----------------------------
  const togglePlayer = (memberId) => {
    setForm((prev) => {
      const isSelected = prev.players.includes(memberId);
      return {
        ...prev,
        players: isSelected
          ? prev.players.filter((id) => id !== memberId)
          : [...prev.players, memberId],
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
  };

  const removeGuest = (name) => {
    setForm((prev) => ({
      ...prev,
      guests: prev.guests.filter((g) => g !== name),
    }));
  };

  // -----------------------------
  // Generador de partidos con rotación y variedad
  // -----------------------------
  const generateInitialMatches = (playerIds, desiredMatchCount) => {
    if (!Array.isArray(playerIds) || playerIds.length < 4) return [];

    // El slider manda: número exacto de partidos (mínimo 1)
    const matchCount = Math.max(1, desiredMatchCount || 1);

    // Stats para fairness (quién ha jugado menos / hace más tiempo)
    const stats = {};
    playerIds.forEach((id) => {
      stats[id] = { matches: 0, last: -1 }; // last = índice del último partido jugado
    });

    // Contadores para variedad de compañeros / rivales
    const teammateCounts = {}; // pareja en el mismo equipo
    const opponentCounts = {}; // pareja en equipos opuestos

    const pairKey = (a, b) => {
      return a < b ? `${a}|${b}` : `${b}|${a}`;
    };

    const addTeammates = (team) => {
      for (let i = 0; i < team.length; i++) {
        for (let j = i + 1; j < team.length; j++) {
          const key = pairKey(team[i], team[j]);
          teammateCounts[key] = (teammateCounts[key] || 0) + 3;
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

    const costTeams = (team1, team2) => {
      let cost = 0;

      // Penalizar repetir compañeros
      const addTeamCost = (team) => {
        for (let i = 0; i < team.length; i++) {
          for (let j = i + 1; j < team.length; j++) {
            const key = pairKey(team[i], team[j]);
            cost += (teammateCounts[key] || 0) * 3; // peso más alto
          }
        }
      };

      addTeamCost(team1);
      addTeamCost(team2);

      // Penalizar repetir rivales
      for (const a of team1) {
        for (const b of team2) {
          const key = pairKey(a, b);
          cost += (opponentCounts[key] || 0) * 1;
        }
      }

      return cost;
    };

    const matches = [];

    for (let matchIndex = 0; matchIndex < matchCount; matchIndex++) {
      // Ordenar jugadores por:
      // 1) menos partidos jugados
      // 2) jugaron hace más tiempo (last más pequeño)
      const sorted = [...playerIds].sort((a, b) => {
        const sa = stats[a];
        const sb = stats[b];
        if (sa.matches !== sb.matches) return sa.matches - sb.matches;
        return sa.last - sb.last;
      });

      const candidates = sorted.slice(0, 4);
      if (candidates.length < 4) break;

      const [p1, p2, p3, p4] = candidates;

      const options = [
        { team1: [p1, p2], team2: [p3, p4] },
        { team1: [p1, p3], team2: [p2, p4] },
        { team1: [p1, p4], team2: [p2, p3] },
      ];

      // Elegir la combinación con menor "costo" de repetición
      let bestOpt = options[0];
      let bestCost = costTeams(options[0].team1, options[0].team2);

      for (let i = 1; i < options.length; i++) {
        const c = costTeams(options[i].team1, options[i].team2);
        if (c < bestCost) {
          bestCost = c;
          bestOpt = options[i];
        }
      }

      matches.push({
        id: `match-${Date.now()}-${matchIndex}-${Math.random()
          .toString(36)
          .slice(2, 8)}`,
        team1: bestOpt.team1,
        team2: bestOpt.team2,
        scoreTeam1: null,
        scoreTeam2: null,
        status: "pending",
        createdAt: new Date().toISOString(),
      });

      // Actualizar stats y contadores
      for (const pid of [...bestOpt.team1, ...bestOpt.team2]) {
        stats[pid].matches++;
        stats[pid].last = matchIndex;
      }
      addTeammates(bestOpt.team1);
      addTeammates(bestOpt.team2);
      addOpponents(bestOpt.team1, bestOpt.team2);
    }

    return matches;
  };

  // -----------------------------
  // Crear torneo
  // -----------------------------
  const handleCreateTournament = async (e) => {
    e.preventDefault();
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
      // jugadores para partidos: usuarios + invitados
      const allPlayerIds = [
        ...form.players,
        ...form.guests.map((_, idx) => `guest-${idx}`),
      ];

      // Generar exactamente la cantidad de partidos elegida en el slider
      const matches = generateInitialMatches(
        allPlayerIds,
        Number(form.matchCount) || 8
      );

      // Nombre del torneo (único por día y club)
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
        players: form.players, // ids de user
        guestPlayers: form.guests, // nombres
        matches,
        maxCourts: form.courts, // 👈 número de canchas simultáneas (1 o 2)
      };

      await addDoc(collection(db, "tournaments"), payload);

      setForm({
        name: "",
        players: [],
        guests: [],
        guestName: "",
        matchCount: 8,
        courts: 1,
      });
      setShowCreate(false);
      setSuccessMsg("Torneo creado correctamente.");
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

  const getMatchesCount = (t) => {
    return Array.isArray(t.matches) ? t.matches.length : 0;
  };

  const getPendingCount = (t) => {
    if (!Array.isArray(t.matches)) return 0;
    return t.matches.filter((m) => m.status === "pending").length;
  };

  const getCourtsCount = (t) => {
    return t.maxCourts || t.courts || 1;
  };

  const totalPlayersForm = form.players.length + form.guests.length || 0;
  const approxMatchesPerPlayer =
    totalPlayersForm > 0
      ? ((form.matchCount * 4) / totalPlayersForm).toFixed(1)
      : "0.0";

  // -----------------------------
  // Render
  // -----------------------------
  if (loading) {
    return (
      <div
        style={{
          padding: "1rem",
          paddingBottom: "0.75rem",
          fontSize: "0.9rem",
          color: "var(--muted)",
        }}
      >
        Cargando torneos...
      </div>
    );
  }

  const hasActiveClub = !!activeClubId;

  return (
    <div
      style={{
        display: "flex",
        flexDirection: "column",
        gap: "1rem",
        paddingBottom: "0.75rem",
      }}
    >
      {/* HEADER / INTRO */}
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

      {/* FORMULARIO CREAR TORNEO */}
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
            onSubmit={handleCreateTournament}
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

            {/* Slider número de partidos */}
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
                min={1}
                max={40}
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

              <p
                style={{
                  margin: 0,
                  marginTop: "0.2rem",
                  fontSize: "0.7rem",
                  color: "var(--muted)",
                }}
              >
                Los partidos se emparejan automáticamente 2 vs 2, priorizando a
                los que llevan más tiempo sin jugar y variando compañeros y
                rivales.
              </p>
            </div>

            {/* Número de canchas simultáneas */}
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
                        color: active ? "var(--fg)" : "var(--muted)",
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
              <p
                style={{
                  margin: 0,
                  marginTop: "0.25rem",
                  fontSize: "0.7rem",
                  color: "var(--muted)",
                }}
              >
                Puedes llevar partidos en una o dos canchas en paralelo. En
                <strong> Jugar torneo</strong> podrás verlos organizados por
                cancha.
              </p>
            </div>

            {/* Jugadores del club */}
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
                          background: selected ? "var(--accent-soft)" : "var(--bg)",
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

            {/* Resumen jugadores */}
            <div
              style={{
                borderRadius: "0.8rem",
                padding: "0.5rem 0.6rem",
                backgroundColor: "var(--bg-elevated)",
                border: "1px dashed var(--border)",
                fontSize: "0.78rem",
              }}
            >
              Total de jugadores para el torneo:{" "}
              <strong>
                {totalPlayersForm >= 4
                  ? totalPlayersForm
                  : `${totalPlayersForm} (mínimo 4)`}
              </strong>
            </div>

            {/* Botones */}
            <div
              style={{
                display: "flex",
                gap: "0.5rem",
                marginTop: "0.3rem",
              }}
            >
              <button
                type="submit"
                disabled={saving}
                style={{
                  flex: 1,
                  borderRadius: "0.9rem",
                  border: "none",
                  padding: "0.55rem 0.7rem",
                  background:
                    "linear-gradient(135deg, var(--accent), rgba(59,130,246,0.9))",
                  color: "#ffffff",
                  fontSize: "0.85rem",
                  fontWeight: 600,
                  cursor: saving ? "default" : "pointer",
                }}
              >
                {saving ? "Creando..." : "Crear torneo"}
              </button>
              <button
                type="button"
                onClick={() => setShowCreate(false)}
                disabled={saving}
                style={{
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
                      {getMatchesCount(t)} partidos •{" "}
                      {getPendingCount(t)} pendientes •{" "}
                      {getCourtsCount(t)}{" "}
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

      {/* TORNEOS COMPLETADOS */}
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
              display: "flex",
              flexDirection: "column",
              gap: "0.6rem",
            }}
          >
            {completedTournaments.map((t) => (
              <article
                key={t.id}
                onClick={() => navigate(`/torneos/${t.id}`)}
                style={{
                  borderRadius: "0.9rem",
                  border: "1px solid var(--border)",
                  padding: "0.6rem 0.7rem",
                  background: "var(--bg)",
                  cursor: "pointer",
                  opacity: 0.9,
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
                      {getCourtsCount(t) === 1 ? "cancha" : "canchas"}
                    </p>
                  </div>
                  <Icon name="chevron-right" size={16} color="var(--muted)" />
                </div>
              </article>
            ))}
          </div>
        )}
      </section>

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
