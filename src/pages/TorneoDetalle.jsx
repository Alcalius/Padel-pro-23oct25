import { useEffect, useMemo, useState } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { doc, getDoc, onSnapshot, updateDoc } from "firebase/firestore";
import { db } from "../firebase/firebase";
import { useAuth } from "../context/AuthContext";
import Icon from "../components/common/Icon";

export default function TorneoDetalle() {
  const { id } = useParams();
  const navigate = useNavigate();
  const { user } = useAuth();
  const userId = user?.uid || null;

  const [tournament, setTournament] = useState(null);
  const [playersInfo, setPlayersInfo] = useState({});
  const [loading, setLoading] = useState(true);
  const [loadingPlayers, setLoadingPlayers] = useState(false);
  const [savingStatus, setSavingStatus] = useState(false);
  const [errorMsg, setErrorMsg] = useState("");
  const [successMsg, setSuccessMsg] = useState("");
  const [activeTab, setActiveTab] = useState("summary"); // summary | ranking | history
  const [creatingFinal, setCreatingFinal] = useState(false);

  // Modal calcular costos
  const [showCostModal, setShowCostModal] = useState(false);
  const [costPerHour, setCostPerHour] = useState("");
  const [hoursCourt1, setHoursCourt1] = useState("");
  const [hoursCourt2, setHoursCourt2] = useState("");
  const [playersPaying, setPlayersPaying] = useState("");

  const resetMessages = () => {
    setErrorMsg("");
    setSuccessMsg("");
  };

  // Escuchar el torneo en tiempo real
  useEffect(() => {
    if (!id) return;

    const ref = doc(db, "tournaments", id);
    const unsub = onSnapshot(
      ref,
      (snap) => {
        if (!snap.exists()) {
          setTournament(null);
          setLoading(false);
          return;
        }
        setTournament({ id: snap.id, ...snap.data() });
        setLoading(false);
      },
      (err) => {
        console.error("Error escuchando torneo:", err);
        setErrorMsg("No se pudo cargar el torneo.");
        setLoading(false);
      }
    );

    return () => unsub();
  }, [id]);

  // Cargar info de jugadores (colección users)
  useEffect(() => {
    const loadPlayersInfo = async () => {
      if (!tournament || !Array.isArray(tournament.players)) {
        setPlayersInfo({});
        return;
      }

      setLoadingPlayers(true);
      const map = {};

      try {
        for (const playerId of tournament.players) {
          try {
            const ref = doc(db, "users", playerId);
            const snap = await getDoc(ref);
            if (snap.exists()) {
              const data = snap.data();
              map[playerId] = {
                id: playerId,
                name:
                  data.name ||
                  data.displayName ||
                  (data.email ? data.email.split("@")[0] : "Jugador"),
                email: data.email || "",
                profilePicture: data.profilePicture || data.photoURL || "",
              };
            }
          } catch (err) {
            console.error("Error cargando usuario:", err);
          }
        }
      } finally {
        setPlayersInfo(map);
        setLoadingPlayers(false);
      }
    };

    loadPlayersInfo();
  }, [tournament]);

  const hasTournament = !!tournament;

  const isCreator = useMemo(() => {
    if (!tournament || !userId) return false;
    return tournament.createdBy === userId;
  }, [tournament, userId]);


  const statusLabel = useMemo(() => {
    if (!tournament) return "";
    if (tournament.status === "completed") return "Completado";
    if (tournament.status === "active") return "Activo";
    return tournament.status || "Desconocido";
  }, [tournament]);

  const hasFinalMatches = useMemo(() => {
    if (!tournament?.matches) return false;
    return (tournament.matches || []).some(
      (m) => m.type === "final" || m.stage === "round_robin_final"
    );
  }, [tournament]);

  // Helpers para nombres / fotos
  const getPlayerName = (playerId) => {
    if (!tournament) return "Jugador";

    if (typeof playerId === "string" && playerId.startsWith("guest-")) {
      const index = parseInt(playerId.split("-")[1], 10);
      const guestName =
        Array.isArray(tournament.guestPlayers) &&
        tournament.guestPlayers[index]
          ? tournament.guestPlayers[index]
          : "Invitado";
      return `${guestName} (Invitado)`;
    }

    const info = playersInfo[playerId];
    if (info && info.name) return info.name;

    return "Jugador";
  };

  const getPlayerPhoto = (playerId) => {
    if (typeof playerId === "string" && playerId.startsWith("guest-")) {
      return "";
    }
    const info = playersInfo[playerId];
    return info?.profilePicture || "";
  };

  const getPlayerInitial = (playerId) => {
    const name = getPlayerName(playerId);
    return name?.charAt(0)?.toUpperCase() || "J";
  };

  // Calcular estadísticas del torneo
  const stats = useMemo(() => {
    if (!tournament) return null;

    const completedMatches =
      tournament.matches?.filter((m) => m.status === "completed") || [];
    const pendingMatches =
      tournament.matches?.filter((m) => m.status === "pending") || [];

    const allPlayers = [
      ...(tournament.players || []),
      ...(Array.isArray(tournament.guestPlayers)
        ? tournament.guestPlayers.map((_, idx) => `guest-${idx}`)
        : []),
    ];

    if (allPlayers.length === 0) {
      return {
        totalMatches: tournament.matches?.length || 0,
        completedMatches: completedMatches.length,
        pendingMatches: pendingMatches.length,
        totalPlayers: 0,
        ranking: [],
        completedMatchesList: completedMatches,
        pendingMatchesList: pendingMatches,
      };
    }

    const playerStats = {};
    allPlayers.forEach((playerId) => {
      playerStats[playerId] = {
        id: playerId,
        name: getPlayerName(playerId),
        profilePicture: getPlayerPhoto(playerId),
        matchesPlayed: 0,
        matchesWon: 0,
        totalPoints: 0,
        pointsAgainst: 0,
      };
    });

    completedMatches.forEach((match) => {
      const s1 = Number(match.scoreTeam1 || 0);
      const s2 = Number(match.scoreTeam2 || 0);

      (match.team1 || []).forEach((playerId) => {
        if (!playerStats[playerId]) return;
        playerStats[playerId].matchesPlayed++;
        playerStats[playerId].totalPoints += s1;
        playerStats[playerId].pointsAgainst += s2;
        if (s1 > s2) playerStats[playerId].matchesWon++;
      });

      (match.team2 || []).forEach((playerId) => {
        if (!playerStats[playerId]) return;
        playerStats[playerId].matchesPlayed++;
        playerStats[playerId].totalPoints += s2;
        playerStats[playerId].pointsAgainst += s1;
        if (s2 > s1) playerStats[playerId].matchesWon++;
      });
    });

    Object.values(playerStats).forEach((p) => {
      p.winRate =
        p.matchesPlayed > 0
          ? (p.matchesWon / p.matchesPlayed) * 100
          : 0;
      p.avgPointsPerMatch =
        p.matchesPlayed > 0
          ? (p.totalPoints / p.matchesPlayed).toFixed(1)
          : "0.0";
      p.pointDifference = p.totalPoints - p.pointsAgainst;
    });

    const ranking = Object.values(playerStats).sort((a, b) => {
      const ap = parseFloat(a.avgPointsPerMatch);
      const bp = parseFloat(b.avgPointsPerMatch);
      if (bp !== ap) return bp - ap;
      return b.winRate - a.winRate;
    });

    return {
      totalMatches: tournament.matches?.length || 0,
      completedMatches: completedMatches.length,
      pendingMatches: pendingMatches.length,
      totalPlayers: allPlayers.length,
      ranking,
      completedMatchesList: completedMatches,
      pendingMatchesList: pendingMatches,
    };
  }, [tournament, playersInfo]);

  // Datos derivados para el modal de costos
  const courtsCount =
    tournament?.maxCourts ||
    tournament?.courts ||
    tournament?.activeCourts ||
    1;

  const numericCostPerHour = Number(costPerHour) || 0;
  const numericHours1 = Number(hoursCourt1) || 0;
  const numericHours2 = courtsCount >= 2 ? Number(hoursCourt2) || 0 : 0;
  const totalHours = numericHours1 + numericHours2;
  const totalCost = numericCostPerHour * totalHours;
  const numericPlayersPaying = Number(playersPaying) || 0;
  const costPerPlayer =
    totalCost > 0 && numericPlayersPaying > 0
      ? totalCost / numericPlayersPaying
      : 0;

  const openCostModal = () => {
    const totalPlayers = stats?.totalPlayers || 0;
    if (!playersPaying && totalPlayers > 0) {
      setPlayersPaying(String(totalPlayers));
    }

    if (!hoursCourt1) {
      setHoursCourt1("1");
    }
    if (courtsCount >= 2 && !hoursCourt2) {
      setHoursCourt2("1");
    }

    setShowCostModal(true);
  };

  const handleCreateFinalRoundRobin = async () => {
    if (!tournament || !stats?.ranking?.length) return;

    if (!isCreator) {
      setErrorMsg("Solo el creador del torneo puede crear la final.");
      return;
    }

    if (stats.ranking.length < 4) {
      window.alert(
        "Necesitas al menos 4 jugadores con partidos jugados para crear la final del Round Robin."
      );
      return;
    }

    const confirm = window.confirm(
      "Se crearán los partidos de final del Round Robin:\n\n" +
        "• Final A: puestos 1 y 2 vs 3 y 4\n" +
        "• Final B (opcional): puestos 5 y 6 vs 7 y 8 si hay al menos 8 jugadores.\n\n¿Continuar?"
    );

    if (!confirm) return;

    resetMessages();
    setCreatingFinal(true);

    try {
      const ranking = stats.ranking;
      const nowIso = new Date().toISOString();

      const finals = [];

      // Final principal (puestos 1-4)
      finals.push({
        id: `final-main-${Date.now()}`,
        type: "final",
        stage: "round_robin_final",
        status: "pending",
        team1: [ranking[0].id, ranking[1].id],
        team2: [ranking[2].id, ranking[3].id],
        createdAt: nowIso,
        label: "Final A (puestos 1-4)",
      });

      // Segunda final si hay 8+ jugadores
      if (ranking.length >= 8) {
        finals.push({
          id: `final-secondary-${Date.now() + 1}`,
          type: "final",
          stage: "round_robin_final",
          status: "pending",
          team1: [ranking[4].id, ranking[5].id],
          team2: [ranking[6].id, ranking[7].id],
          createdAt: nowIso,
          label: "Final B (puestos 5-8)",
        });
      }

      const existingMatches = Array.isArray(tournament.matches)
        ? tournament.matches.slice()
        : [];

      const alreadyHasFinals = existingMatches.some(
        (m) => m.type === "final" || m.stage === "round_robin_final"
      );

      let newMatches = existingMatches;

      if (alreadyHasFinals) {
        const overwrite = window.confirm(
          "Ya existen partidos de final en este torneo.\n\n" +
            "¿Quieres reemplazarlos por una nueva final basada en el ranking actual?"
        );
        if (!overwrite) {
          setCreatingFinal(false);
          return;
        }

        newMatches = existingMatches.filter(
          (m) => m.type !== "final" && m.stage !== "round_robin_final"
        );
      }

      newMatches = [...newMatches, ...finals];

      const ref = doc(db, "tournaments", tournament.id);
      await updateDoc(ref, { matches: newMatches });

      setSuccessMsg(
        "Partidos de final creados. Podrás jugarlos desde la vista de 'Jugar torneo'."
      );
    } catch (err) {
      console.error("Error creando final Round Robin:", err);
      setErrorMsg("No se pudo crear la final del Round Robin.");
    } finally {
      setCreatingFinal(false);
    }
  };

  const handleCompleteTournament = async () => {
    if (!tournament || !isCreator) return;

    const confirm = window.confirm(
      "¿Marcar este torneo como completado?\n\nLuego podrás seguir viendo el ranking, pero ya no podrás editar los partidos."
    );
    if (!confirm) return;

    resetMessages();
    setSavingStatus(true);

    try {
      const ref = doc(db, "tournaments", tournament.id);
      await updateDoc(ref, {
        status: "completed",
        completedAt: new Date().toISOString(),
      });
      setSuccessMsg("Torneo marcado como completado 🏆");
    } catch (err) {
      console.error("Error completando torneo:", err);
      setErrorMsg("No se pudo completar el torneo.");
    } finally {
      setSavingStatus(false);
    }
  };

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
        Cargando torneo...
      </div>
    );
  }

  if (!hasTournament) {
    return (
      <div
        style={{
          padding: "1.5rem 1rem",
          textAlign: "center",
        }}
      >
        <Icon name="tournament" size={40} color="var(--muted)" />
        <p
          style={{
            marginTop: "0.75rem",
            fontSize: "0.9rem",
            color: "var(--muted)",
          }}
        >
          Torneo no encontrado.
        </p>
      </div>
    );
  }

  const createdDate = tournament.createdAt
    ? new Date(tournament.createdAt).toLocaleString("es-MX", {
        day: "2-digit",
        month: "2-digit",
        year: "2-digit",
        hour: "2-digit",
        minute: "2-digit",
      })
    : "";

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
        <button
          type="button"
          onClick={() => navigate("/torneos")}
          style={{
            border: "none",
            background: "transparent",
            padding: 0,
            margin: 0,
            marginBottom: "0.5rem",
            display: "flex",
            alignItems: "center",
            gap: "0.35rem",
            fontSize: "0.78rem",
            color: "var(--muted)",
            cursor: "pointer",
          }}
        >
          <Icon name="chevron-left" size={14} color="var(--muted)" />
          Torneos
        </button>

        <div
          style={{
            display: "flex",
            gap: "0.75rem",
            alignItems: "center",
          }}
        >
          <div
            style={{
              width: 44,
              height: 44,
              borderRadius: "1.1rem",
              background:
                "linear-gradient(135deg, rgba(59,130,246,0.95), rgba(147,51,234,0.95))",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              flexShrink: 0,
            }}
          >
            <Icon name="tournament" size={24} color="#ffffff" />
          </div>

          <div style={{ flex: 1, minWidth: 0 }}>
            <h1
              style={{
                margin: 0,
                fontSize: "1.02rem",
                fontWeight: 700,
                overflow: "hidden",
                textOverflow: "ellipsis",
                whiteSpace: "nowrap",
              }}
            >
              {tournament.name}
            </h1>
            <p
              style={{
                margin: 0,
                marginTop: "0.15rem",
                fontSize: "0.78rem",
                color: "var(--muted)",
              }}
            >
              {tournament.clubName || "Club"} • Creado: {createdDate}
            </p>

            <div
              style={{
                display: "flex",
                gap: "0.4rem",
                marginTop: "0.4rem",
                flexWrap: "wrap",
              }}
            >
              <span
                style={{
                  fontSize: "0.72rem",
                  padding: "0.15rem 0.5rem",
                  borderRadius: "999px",
                  border: "1px solid var(--border)",
                  color:
                    tournament.status === "completed"
                      ? "#22c55e"
                      : "var(--accent)",
                }}
              >
                {statusLabel}
              </span>
              <span
                style={{
                  fontSize: "0.72rem",
                  padding: "0.15rem 0.5rem",
                  borderRadius: "999px",
                  border: "1px solid var(--border)",
                  color: "var(--muted)",
                }}
              >
                {stats?.totalPlayers || 0} jugadores
              </span>
              <span
                style={{
                  fontSize: "0.72rem",
                  padding: "0.15rem 0.5rem",
                  borderRadius: "999px",
                  border: "1px solid var(--border)",
                  color: "var(--muted)",
                }}
              >
                {stats?.totalMatches || 0} partidos
              </span>
            </div>
          </div>
        </div>

        {/* Botones de acción */}
        <div
          style={{
            display: "flex",
            gap: "0.5rem",
            marginTop: "0.75rem",
          }}
        >
          <button
            type="button"
            onClick={() => navigate(`/torneos/${tournament.id}/jugar`)}
            style={{
              flex: 1,
              borderRadius: "999px",
              border: "none",
              padding: "0.5rem 0.7rem",
              background:
                "linear-gradient(135deg, var(--accent), rgba(59,130,246,0.9))",
              color: "#ffffff",
              fontSize: "0.85rem",
              fontWeight: 600,
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              gap: "0.3rem",
              cursor: "pointer",
            }}
          >
            <Icon name="play" size={14} color="#ffffff" />
            Jugar
          </button>

          {tournament.status === "active" && isCreator && (
            <button
              type="button"
              onClick={handleCompleteTournament}
              disabled={savingStatus}
              style={{
                borderRadius: "999px",
                border: "1px solid var(--border)",
                padding: "0.5rem 0.7rem",
                background: "var(--bg)",
                color: "#22c55e",
                fontSize: "0.8rem",
                fontWeight: 600,
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                gap: "0.3rem",
                cursor: savingStatus ? "default" : "pointer",
                opacity: savingStatus ? 0.7 : 1,
              }}
            >
              <Icon name="check" size={14} color="#22c55e" />
              {savingStatus ? "Procesando..." : "Marcar completado"}
            </button>
          )}
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

      {/* TABS */}
      <section
        style={{
          display: "flex",
          gap: "0.4rem",
          borderRadius: "999px",
          padding: "0.2rem",
          border: "1px solid var(--border)",
          background: "var(--bg-elevated)",
        }}
      >
        {[
          { key: "summary", label: "Resumen" },
          { key: "ranking", label: "Ranking" },
          { key: "history", label: "Historial" },
        ].map((tab) => {
          const active = activeTab === tab.key;
          return (
            <button
              key={tab.key}
              type="button"
              onClick={() => setActiveTab(tab.key)}
              style={{
                flex: 1,
                border: "none",
                borderRadius: "999px",
                padding: "0.4rem 0.2rem",
                background: active ? "var(--bg)" : "transparent",
                color: active ? "var(--fg)" : "var(--muted)",
                fontSize: "0.8rem",
                fontWeight: active ? 600 : 500,
                cursor: "pointer",
              }}
            >
              {tab.label}
            </button>
          );
        })}
      </section>

      {/* CONTENIDO TABS */}
      {/* RESUMEN */}
      {activeTab === "summary" && (
        <>
          {/* Título + botón calcular costos */}
          <div
            style={{
              display: "flex",
              alignItems: "center",
              justifyContent: "space-between",
              gap: "0.6rem",
              padding: "0 0.1rem",
            }}
          >
            <h2
              style={{
                margin: 0,
                fontSize: "0.95rem",
              }}
            >
              Resumen del torneo
            </h2>

            <button
              type="button"
              onClick={openCostModal}
              style={{
                borderRadius: "999px",
                border: "none",
                padding: "0.35rem 0.8rem",
                background:
                  "linear-gradient(135deg, var(--accent), rgba(59,130,246,0.9))",
                color: "#ffffff",
                fontSize: "0.78rem",
                fontWeight: 600,
                display: "flex",
                alignItems: "center",
                gap: "0.3rem",
                cursor: "pointer",
                whiteSpace: "nowrap",
              }}
            >
              <Icon name="calculator" size={14} color="#ffffff" />
              Calcular costos
            </button>
          </div>

          <section
            className="card"
            style={{
              marginTop: "0.6rem",
            }}
          >
            <div
              style={{
                display: "grid",
                gridTemplateColumns: "repeat(2, minmax(0, 1fr))",
                gap: "0.6rem",
              }}
            >
              <div
                style={{
                  borderRadius: "0.9rem",
                  padding: "0.5rem 0.6rem",
                  border: "1px solid var(--border)",
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
                  Partidos jugados
                </p>
                <p
                  style={{
                    margin: 0,
                    marginTop: "0.2rem",
                    fontSize: "1rem",
                    fontWeight: 700,
                  }}
                >
                  {stats?.completedMatches || 0}
                </p>
              </div>

              <div
                style={{
                  borderRadius: "0.9rem",
                  padding: "0.5rem 0.6rem",
                  border: "1px solid var(--border)",
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
                  Partidos pendientes
                </p>
                <p
                  style={{
                    margin: 0,
                    marginTop: "0.2rem",
                    fontSize: "1rem",
                    fontWeight: 700,
                  }}
                >
                  {stats?.pendingMatches || 0}
                </p>
              </div>

              <div
                style={{
                  borderRadius: "0.9rem",
                  padding: "0.5rem 0.6rem",
                  border: "1px solid var(--border)",
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
                  Jugadores
                </p>
                <p
                  style={{
                    margin: 0,
                    marginTop: "0.2rem",
                    fontSize: "1rem",
                    fontWeight: 700,
                  }}
                >
                  {stats?.totalPlayers || 0}
                </p>
              </div>

              <div
                style={{
                  borderRadius: "0.9rem",
                  padding: "0.5rem 0.6rem",
                  border: "1px solid var(--border)",
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
                  Estado
                </p>
                <p
                  style={{
                    margin: 0,
                    marginTop: "0.2rem",
                    fontSize: "0.9rem",
                    fontWeight: 600,
                    textTransform: "capitalize",
                  }}
                >
                  {statusLabel}
                </p>
              </div>
            </div>

            {loadingPlayers && (
              <p
                style={{
                  margin: 0,
                  marginTop: "0.7rem",
                  fontSize: "0.78rem",
                  color: "var(--muted)",
                }}
              >
                Cargando jugadores...
              </p>
            )}

            {!loadingPlayers && !!stats?.ranking?.length && (
              <div
                style={{
                  marginTop: "0.9rem",
                }}
              >
                <h3
                  style={{
                    margin: 0,
                    marginBottom: "0.4rem",
                    fontSize: "0.9rem",
                  }}
                >
                  Top 3 jugadores
                </h3>
                <div
                  style={{
                    display: "flex",
                    flexDirection: "column",
                    gap: "0.4rem",
                  }}
                >
                  {stats.ranking.slice(0, 3).map((p, index) => {
                    const hasPhoto = p.profilePicture || getPlayerPhoto(p.id);

                    return (
                      <div
                        key={p.id}
                        style={{
                          borderRadius: "0.8rem",
                          border: "1px solid var(--border)",
                          padding: "0.45rem 0.55rem",
                          display: "flex",
                          alignItems: "center",
                          gap: "0.5rem",
                          background:
                            index === 0 ? "var(--bg-elevated)" : "var(--bg)",
                        }}
                      >
                        <div
                          style={{
                            width: 28,
                            height: 28,
                            borderRadius: "999px",
                            overflow: "hidden",
                            background: hasPhoto
                              ? "var(--bg-elevated)"
                              : "radial-gradient(circle at 30% 20%, #4084d6ff, #174ab8ff)",
                            boxShadow: hasPhoto
                              ? "0 4px 12px rgba(15, 23, 42, 0.19)"
                              : "0 8px 20px rgba(37, 100, 235, 0.12)",
                            display: "flex",
                            alignItems: "center",
                            justifyContent: "center",
                            fontSize: "0.9rem",
                            fontWeight: 600,
                            color: "#ffffff",
                            flexShrink: 0,
                          }}
                        >
                          {hasPhoto ? (
                            <img
                              src={p.profilePicture || getPlayerPhoto(p.id)}
                              alt={p.name}
                              style={{
                                width: "100%",
                                height: "100%",
                                objectFit: "cover",
                              }}
                            />
                          ) : (
                            getPlayerInitial(p.id)
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
                              fontSize: "0.86rem",
                              fontWeight: 600,
                              overflow: "hidden",
                              textOverflow: "ellipsis",
                              whiteSpace: "nowrap",
                            }}
                          >
                            #{index + 1} {p.name}
                          </p>
                          <p
                            style={{
                              margin: 0,
                              marginTop: "0.1rem",
                              fontSize: "0.72rem",
                              color: "var(--muted)",
                            }}
                          >
                            Win rate: {Math.round(p.winRate)}% • Pts/partido:{" "}
                            {p.avgPointsPerMatch}
                          </p>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            )}
          </section>
        </>
      )}

{/* RANKING */}
{activeTab === "ranking" && (
  <>
    {/* Título + botones de acciones de final */}
    <div
      style={{
        display: "flex",
        alignItems: "center",
        justifyContent: "space-between",
        gap: "0.6rem",
        padding: "0 0.1rem",
      }}
    >
      <h2
        style={{
          margin: 0,
          fontSize: "0.95rem",
        }}
      >
        Ranking de jugadores
      </h2>

      <div
        style={{
          display: "flex",
          alignItems: "center",
          gap: "0.4rem",
        }}
      >
        {isCreator && stats?.ranking?.length >= 4 && (
          <button
            type="button"
            onClick={handleCreateFinalRoundRobin}
            disabled={creatingFinal}
            style={{
              borderRadius: "999px",
              border: "none",
              padding: "0.35rem 0.7rem",
              background:
                "linear-gradient(135deg, var(--accent), rgba(59,130,246,0.9))",
              color: "#ffffff",
              fontSize: "0.78rem",
              fontWeight: 600,
              display: "flex",
              alignItems: "center",
              gap: "0.3rem",
              cursor: creatingFinal ? "default" : "pointer",
              opacity: creatingFinal ? 0.8 : 1,
              whiteSpace: "nowrap",
            }}
          >
            <Icon name="trophy" size={14} color="#ffffff" />
            {creatingFinal ? "Creando final..." : "Crear Final Round Robin"}
          </button>
        )}

        {hasFinalMatches && (
          <button
            type="button"
            onClick={() => navigate(`/torneos/${tournament.id}/final`)}
            style={{
              borderRadius: "999px",
              border: "1px solid var(--border)",
              padding: "0.35rem 0.7rem",
              background: "var(--bg-elevated)",
              color: "var(--fg)",
              fontSize: "0.78rem",
              fontWeight: 600,
              display: "flex",
              alignItems: "center",
              gap: "0.3rem",
              cursor: "pointer",
              whiteSpace: "nowrap",
            }}
          >
            <Icon name="play" size={14} color="var(--accent)" />
            Jugar final
          </button>
        )}
      </div>
    </div> 

    {!stats?.ranking?.length ? (
      <p
        style={{
          margin: "0.6rem 0 0",
          fontSize: "0.8rem",
          color: "var(--muted)",
        }}
      >
        Juega algunos partidos para generar el ranking.
      </p>
    ) : (
      <div
        style={{
          marginTop: "0.6rem",
          display: "flex",
          flexDirection: "column",
          gap: "0.4rem",
        }}
      >
        {stats.ranking.map((p, index) => {
          const hasPhoto = p.profilePicture || getPlayerPhoto(p.id);

          return (
            <div
              key={p.id}
              style={{
                borderRadius: "0.8rem",
                border: "1px solid var(--border)",
                padding: "0.5rem 0.55rem",
                display: "flex",
                alignItems: "center",
                gap: "0.6rem",
                background: "var(--bg-elevated)",
              }}
            >
              <div
                style={{
                  width: 22,
                  textAlign: "center",
                  fontSize: "0.85rem",
                  fontWeight: 600,
                  color:
                    index === 0
                      ? "var(--accent)"
                      : index === 1
                      ? "var(--muted)"
                      : "var(--fg)",
                }}
              >
                {index + 1}
              </div>

              <div
                style={{
                  width: 32,
                  height: 32,
                  borderRadius: "999px",
                  overflow: "hidden",
                  background: hasPhoto
                    ? "var(--bg-elevated)"
                    : "radial-gradient(circle at 30% 20%, #4084d6ff, #174ab8ff)",
                  boxShadow: hasPhoto
                    ? "0 5px 14px rgba(15, 23, 42, 0.09)"
                    : "0 9px 24px rgba(37, 100, 235, 0.16)",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  fontSize: "0.9rem",
                  fontWeight: 600,
                  color: "#ffffff",
                  flexShrink: 0,
                }}
              >
                {hasPhoto ? (
                  <img
                    src={p.profilePicture || getPlayerPhoto(p.id)}
                    alt={p.name}
                    style={{
                      width: "100%",
                      height: "100%",
                      objectFit: "cover",
                    }}
                  />
                ) : (
                  getPlayerInitial(p.id)
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
                    fontSize: "0.88rem",
                    fontWeight: 600,
                    overflow: "hidden",
                    textOverflow: "ellipsis",
                    whiteSpace: "nowrap",
                  }}
                >
                  {p.name}
                </p>
                <p
                  style={{
                    margin: 0,
                    marginTop: "0.1rem",
                    fontSize: "0.72rem",
                    color: "var(--muted)",
                  }}
                >
                  {p.matchesPlayed} partidos • {p.matchesWon} victorias • Dif:{" "}
                  {p.pointDifference}
                </p>
              </div>

              <div
                style={{
                  borderRadius: "0.7rem",
                  padding: "0.25rem 0.45rem",
                  background: "var(--bg)",
                  fontSize: "0.72rem",
                  fontWeight: 600,
                  textAlign: "center",
                  minWidth: 70,
                }}
              >
                <div
                  style={{
                    fontSize: "0.7rem",
                    color: "var(--muted)",
                  }}
                >
                  Pts/partido
                </div>
                <div>{p.avgPointsPerMatch}</div>
              </div>
            </div>
          );
        })}
      </div>
    )}
  </>
)}

      {/* HISTORIAL */}
      {activeTab === "history" && (
        <>
          <div
            style={{
              display: "flex",
              alignItems: "center",
              justifyContent: "space-between",
              gap: "0.6rem",
              padding: "0 0.1rem",
            }}
          >
            <h2
              style={{
                margin: 0,
                fontSize: "0.95rem",
              }}
            >
              Historial de partidos
            </h2>
          </div>

          {!stats?.completedMatchesList?.length ? (
            <p
              style={{
                margin: "0.6rem 0 0",
                fontSize: "0.8rem",
                color: "var(--muted)",
              }}
            >
              Cuando registres resultados, aparecerán aquí.
            </p>
          ) : (
            <div
              style={{
                marginTop: "0.6rem",
                display: "flex",
                flexDirection: "column",
                gap: "0.5rem",
              }}
            >
              {stats.completedMatchesList.map((match, idx) => {
                const s1 = Number(match.scoreTeam1 || 0);
                const s2 = Number(match.scoreTeam2 || 0);
                const team1Wins = s1 > s2;

                const date = match.completedAt
                  ? new Date(match.completedAt).toLocaleString("es-MX", {
                      day: "2-digit",
                      month: "2-digit",
                      hour: "2-digit",
                      minute: "2-digit",
                    })
                  : "";

                const renderTeam = (team, isWinner, alignRight = false) => (
                  <div
                    style={{
                      flex: 1,
                      minWidth: 0,
                      textAlign: alignRight ? "right" : "left",
                    }}
                  >
                    {(team || []).map((playerId) => (
                      <p
                        key={playerId}
                        style={{
                          margin: 0,
                          fontSize: "0.76rem",
                          color: isWinner ? "var(--fg)" : "var(--muted)",
                          overflow: "hidden",
                          textOverflow: "ellipsis",
                          whiteSpace: "nowrap",
                        }}
                      >
                        {getPlayerName(playerId)}
                      </p>
                    ))}
                  </div>
                );

                return (
                  <div
                    key={match.id || idx}
                    style={{
                      borderRadius: "0.9rem",
                      border: "1px solid var(--border)",
                      padding: "0.5rem 0.55rem",
                      background: "var(--bg)",
                    }}
                  >
                    <div
                      style={{
                        display: "flex",
                        justifyContent: "space-between",
                        alignItems: "center",
                        marginBottom: "0.35rem",
                      }}
                    >
                      <span
                        style={{
                          fontSize: "0.75rem",
                          color: "var(--muted)",
                        }}
                      >
                        Partido #{idx + 1}
                      </span>
                      <span
                        style={{
                          fontSize: "0.72rem",
                          color: "var(--muted)",
                        }}
                      >
                        {date}
                      </span>
                    </div>

                    <div
                      style={{
                        display: "flex",
                        alignItems: "center",
                        gap: "0.4rem",
                      }}
                    >
                      {renderTeam(match.team1, team1Wins, false)}

                      <div
                        style={{
                          borderRadius: "0.8rem",
                          padding: "0.25rem 0.45rem",
                          background: "var(--bg-elevated)",
                          fontSize: "0.8rem",
                          fontWeight: 600,
                          textAlign: "center",
                          minWidth: 60,
                        }}
                      >
                        {s1} - {s2}
                      </div>

                      {renderTeam(match.team2, !team1Wins, true)}
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </>
      )}

      {/* MODAL CALCULAR COSTOS */}
      {showCostModal && (
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
          onClick={() => setShowCostModal(false)}
        >
          <div
            className="card"
            style={{
              maxWidth: 380,
              width: "90%",
              padding: "0.9rem 1rem 0.8rem 1rem",
              cursor: "default",
            }}
            onClick={(e) => e.stopPropagation()}
          >
            <h3
              style={{
                margin: 0,
                marginBottom: "0.4rem",
                fontSize: "0.9rem",
              }}
            >
              Calcular costos de canchas
            </h3>
            <p
              style={{
                margin: 0,
                marginBottom: "0.5rem",
                fontSize: "0.78rem",
                color: "var(--muted)",
              }}
            >
              Ingresa el costo por hora y las horas jugadas para estimar cuánto
              debe aportar cada jugador.
            </p>

            <div
              style={{
                display: "flex",
                flexDirection: "column",
                gap: "0.5rem",
                marginBottom: "0.4rem",
              }}
            >
              <label
                style={{
                  fontSize: "0.78rem",
                  color: "var(--muted)",
                  display: "flex",
                  flexDirection: "column",
                  gap: "0.25rem",
                }}
              >
                Costo por hora (por cancha)
                <div
                  style={{
                    display: "flex",
                    alignItems: "center",
                    gap: "0.25rem",
                    borderRadius: "0.7rem",
                    border: "1px solid var(--border)",
                    padding: "0.25rem 0.5rem",
                    background: "var(--bg)",
                  }}
                >
                  <span
                    style={{
                      fontSize: "0.8rem",
                      color: "var(--muted)",
                    }}
                  >
                    $
                  </span>
                  <input
                    type="number"
                    inputMode="decimal"
                    min="0"
                    value={costPerHour}
                    onChange={(e) => setCostPerHour(e.target.value)}
                    style={{
                      border: "none",
                      outline: "none",
                      background: "transparent",
                      fontSize: "0.8rem",
                      flex: 1,
                    }}
                  />
                </div>
              </label>

              <div
                style={{
                  display: "flex",
                  flexDirection: "column",
                  gap: "0.4rem",
                }}
              >
                <label
                  style={{
                    fontSize: "0.78rem",
                    color: "var(--muted)",
                    display: "flex",
                    flexDirection: "column",
                    gap: "0.25rem",
                  }}
                >
                  Horas cancha 1
                  <input
                    type="number"
                    inputMode="decimal"
                    min="0"
                    value={hoursCourt1}
                    onChange={(e) => setHoursCourt1(e.target.value)}
                    style={{
                      borderRadius: "0.7rem",
                      border: "1px solid var(--border)",
                      padding: "0.25rem 0.5rem",
                      background: "var(--bg)",
                      fontSize: "0.8rem",
                    }}
                  />
                </label>

                {courtsCount >= 2 && (
                  <label
                    style={{
                      fontSize: "0.78rem",
                      color: "var(--muted)",
                      display: "flex",
                      flexDirection: "column",
                      gap: "0.25rem",
                    }}
                  >
                    Horas cancha 2
                    <input
                      type="number"
                      inputMode="decimal"
                      min="0"
                      value={hoursCourt2}
                      onChange={(e) => setHoursCourt2(e.target.value)}
                      style={{
                        borderRadius: "0.7rem",
                        border: "1px solid var(--border)",
                        padding: "0.25rem 0.5rem",
                        background: "var(--bg)",
                        fontSize: "0.8rem",
                      }}
                    />
                  </label>
                )}
              </div>

              <label
                style={{
                  fontSize: "0.78rem",
                  color: "var(--muted)",
                  display: "flex",
                  flexDirection: "column",
                  gap: "0.25rem",
                }}
              >
                Jugadores que pagan
                <input
                  type="number"
                  min="1"
                  value={playersPaying}
                  onChange={(e) => setPlayersPaying(e.target.value)}
                  style={{
                    borderRadius: "0.7rem",
                    border: "1px solid var(--border)",
                    padding: "0.25rem 0.5rem",
                    background: "var(--bg)",
                    fontSize: "0.8rem",
                  }}
                />
                <span
                  style={{
                    fontSize: "0.72rem",
                    color: "var(--muted)",
                  }}
                >
                  Total de jugadores en el torneo: {stats?.totalPlayers || 0}
                </span>
              </label>
            </div>

            <div
              style={{
                borderTop: "1px solid var(--border)",
                paddingTop: "0.4rem",
                marginTop: "0.2rem",
                fontSize: "0.78rem",
              }}
            >
              <p
                style={{
                  margin: 0,
                  marginBottom: "0.15rem",
                }}
              >
                Horas totales:{" "}
                <strong>
                  {totalHours.toFixed ? totalHours.toFixed(1) : totalHours} h
                </strong>
              </p>
              <p
                style={{
                  margin: 0,
                  marginBottom: "0.15rem",
                }}
              >
                Costo total aproximado:{" "}
                <strong>${totalCost.toFixed(2)}</strong>
              </p>
              <p
                style={{
                  margin: 0,
                }}
              >
                A cada jugador le toca:{" "}
                <strong>
                  $
                  {costPerPlayer && costPerPlayer > 0
                    ? costPerPlayer.toFixed(2)
                    : "0.00"}
                </strong>
              </p>
            </div>

            <div
              style={{
                marginTop: "0.6rem",
                display: "flex",
                justifyContent: "flex-end",
              }}
            >
              <button
                type="button"
                onClick={() => setShowCostModal(false)}
                style={{
                  borderRadius: "999px",
                  border: "1px solid var(--border)",
                  padding: "0.35rem 0.8rem",
                  background: "var(--bg)",
                  fontSize: "0.78rem",
                  cursor: "pointer",
                }}
              >
                Cerrar
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
