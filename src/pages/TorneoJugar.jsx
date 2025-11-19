// src/pages/TorneoJugar.jsx
import React, { useEffect, useMemo, useState } from "react";
import { useParams } from "react-router-dom";
import { doc, getDoc, updateDoc, collection } from "firebase/firestore";
import { db } from "../firebase/firebase";
import Icon from "../components/common/Icon";
import { applyMatchPLChanges, getDivisionIndex } from "../utils/ranking";

const TOTAL_POINTS = 4;

export default function TorneoJugar() {
  const { id } = useParams();
  const tournamentId = id;

  const [loading, setLoading] = useState(true);
  const [savingResult, setSavingResult] = useState(false);
  const [savingNewMatch, setSavingNewMatch] = useState(false);
  const [completingTournament, setCompletingTournament] = useState(false);

  const [tournament, setTournament] = useState(null);
  const [matches, setMatches] = useState([]);
  const [playersMap, setPlayersMap] = useState({});
  const [guestMap, setGuestMap] = useState({});

  const [activeTab, setActiveTab] = useState("partidos"); // "partidos" | "ranking" | "historial"
  const [activeCourt, setActiveCourt] = useState(1); // 1 ó 2 (según maxCourts)

  const [scoreTeam1, setScoreTeam1] = useState(0);
  const [scoreTeam2, setScoreTeam2] = useState(0);

  // Para partido personalizado
  const [showCustom, setShowCustom] = useState(false);
  const [customSelected, setCustomSelected] = useState([]);
  const [customBalanceLabel, setCustomBalanceLabel] = useState("");

  // Modal de costos
  const [showCostModal, setShowCostModal] = useState(false);
  const [courtCostPerHour, setCourtCostPerHour] = useState("");
  const [hoursCourt1, setHoursCourt1] = useState("");
  const [hoursCourt2, setHoursCourt2] = useState("");
  const [costResult, setCostResult] = useState(null);

  // Reacomodar pendientes (manual)
  const [reorderingPending, setReorderingPending] = useState(false);

  const shortName = (fullName) => {
    if (!fullName) return "Jugador";
    const trimmed = fullName.trim();
    const idx = trimmed.indexOf(" ");
    if (idx === -1) return trimmed;
    return trimmed.slice(0, idx);
  };

  // -----------------------------------
  // Cargar torneo + jugadores
  // -----------------------------------
  useEffect(() => {
    const load = async () => {
      if (!tournamentId) return;
      setLoading(true);
      try {
        const tRef = doc(db, "tournaments", tournamentId);
        const tSnap = await getDoc(tRef);
        if (!tSnap.exists()) {
          setTournament(null);
          setMatches([]);
          setPlayersMap({});
          setGuestMap({});
          setLoading(false);
          return;
        }

        const tData = { id: tSnap.id, ...tSnap.data() };
        const tMatches = Array.isArray(tData.matches) ? tData.matches : [];
        setTournament(tData);
        setMatches(tMatches);

        const gMap = {};
        if (Array.isArray(tData.guestPlayers)) {
          tData.guestPlayers.forEach((name, idx) => {
            gMap[`guest-${idx}`] = name || `Invitado ${idx + 1}`;
          });
        }
        setGuestMap(gMap);

        const playerIds = Array.isArray(tData.players) ? tData.players : [];
        const map = {};

        if (playerIds.length > 0) {
          const usersRef = collection(db, "users");
          const snapshots = await Promise.all(
            playerIds.map((uid) => getDoc(doc(usersRef, uid)))
          );

          snapshots.forEach((snap, idx) => {
            const uid = playerIds[idx];
            if (!snap.exists()) return;
            const data = snap.data();
            const stats = data.stats || {};
            map[uid] = {
              id: uid,
              name:
                data.name ||
                data.displayName ||
                (data.email ? data.email.split("@")[0] : "Jugador"),
              email: data.email || "",
              profilePicture: data.profilePicture || data.photoURL || "",
              rank: data.rank || "Bronce III",
              leaguePoints:
                typeof data.leaguePoints === "number"
                  ? data.leaguePoints
                  : 0,
              stats: {
                totalMatches: stats.totalMatches || data.totalMatches || 0,
                wins: stats.wins || data.wins || 0,
                losses: stats.losses || data.losses || 0,
                tournamentsPlayed:
                  stats.tournamentsPlayed || data.tournamentsPlayed || 0,
                tournamentsWon:
                  stats.tournamentsWon || data.tournamentsWon || 0,
                streak: stats.streak || data.streak || 0,
                recentMatches: Array.isArray(stats.recentMatches)
                  ? stats.recentMatches
                  : [],
                achievements: Array.isArray(stats.achievements)
                  ? stats.achievements
                  : [],
              },
            };
          });
        }

        setPlayersMap(map);
      } catch (err) {
        console.error("Error cargando torneo:", err);
      } finally {
        setLoading(false);
      }
    };

    load();
  }, [tournamentId]);

  const getPlayerDisplay = (pid) => {
    if (!pid) return { name: "Jugador", avatar: "", isGuest: false };

    if (pid.startsWith("guest-")) {
      const name = guestMap[pid] || "Invitado";
      return {
        name,
        avatar: "",
        isGuest: true,
      };
    }

    const p = playersMap[pid];
    if (!p) {
      return {
        name: "Jugador",
        avatar: "",
        isGuest: false,
      };
    }
    return {
      name: p.name,
      avatar: p.profilePicture || "",
      isGuest: false,
    };
  };

  const pendingMatches = useMemo(
    () => matches.filter((m) => m.status === "pending"),
    [matches]
  );

  const sortedPendingMatches = useMemo(() => {
    const arr = [...pendingMatches];
    arr.sort((a, b) => {
      const da = a.createdAt || "";
      const db = b.createdAt || "";
      return da.localeCompare(db);
    });
    return arr;
  }, [pendingMatches]);

  const completedMatches = useMemo(
    () =>
      matches
        .filter((m) => m.status === "completed")
        .slice()
        .sort((a, b) => {
          const da = a.completedAt || a.createdAt || "";
          const db = b.completedAt || b.createdAt || "";
          return db.localeCompare(da);
        }),
    [matches]
  );

  const maxCourts =
    tournament?.maxCourts ||
    tournament?.courts ||
    tournament?.activeCourts ||
    1;

  // Partidos asignados a cada cancha (se toman de la cola de pendientes)
  const matchCourt1 = sortedPendingMatches[0] || null;
  const matchCourt2 =
    maxCourts >= 2 ? sortedPendingMatches[1] || null : null;

  // Partido actual (para el marcador) según la cancha activa
  const currentMatch =
    activeCourt === 1 ? matchCourt1 : matchCourt2;

  // Sincronizar marcador cuando cambia el partido actual
  useEffect(() => {
    if (!currentMatch) {
      setScoreTeam1(0);
      setScoreTeam2(0);
      return;
    }
    const s1 =
      typeof currentMatch.scoreTeam1 === "number"
        ? currentMatch.scoreTeam1
        : 0;
    const s2 =
      typeof currentMatch.scoreTeam2 === "number"
        ? currentMatch.scoreTeam2
        : 0;
    setScoreTeam1(Math.max(0, Math.min(TOTAL_POINTS, s1)));
    setScoreTeam2(Math.max(0, Math.min(TOTAL_POINTS, s2)));
  }, [currentMatch]);

  // Jugadores en espera = todos menos los que están en cancha 1/2
  const waitingPlayers = useMemo(() => {
    if (!tournament) return [];

    const allIds = [
      ...(Array.isArray(tournament.players) ? tournament.players : []),
      ...(Array.isArray(tournament.guestPlayers)
        ? tournament.guestPlayers.map((_, idx) => `guest-${idx}`)
        : []),
    ];

    const inCourts = new Set();
    if (matchCourt1) {
      (matchCourt1.team1 || []).forEach((id) => inCourts.add(id));
      (matchCourt1.team2 || []).forEach((id) => inCourts.add(id));
    }
    if (matchCourt2) {
      (matchCourt2.team1 || []).forEach((id) => inCourts.add(id));
      (matchCourt2.team2 || []).forEach((id) => inCourts.add(id));
    }

    return allIds.filter((id) => !inCourts.has(id));
  }, [tournament, matchCourt1, matchCourt2]);

  // Ranking del torneo
  const tournamentRanking = useMemo(() => {
    const statsByPlayer = {};

    completedMatches.forEach((m) => {
      const t1 = m.team1 || [];
      const t2 = m.team2 || [];
      const all = [...t1, ...t2];

      const s1 =
        typeof m.scoreTeam1 === "number" ? m.scoreTeam1 : null;
      const s2 =
        typeof m.scoreTeam2 === "number" ? m.scoreTeam2 : null;

      let winner = 0;
      if (s1 != null && s2 != null) {
        if (s1 > s2) winner = 1;
        else if (s2 > s1) winner = 2;
      }

      all.forEach((pid) => {
        if (!statsByPlayer[pid]) {
          statsByPlayer[pid] = {
            id: pid,
            wins: 0,
            losses: 0,
            draws: 0,
            matches: 0,
          };
        }
        const st = statsByPlayer[pid];
        st.matches += 1;

        const inTeam1 = t1.includes(pid);
        if (winner === 0) {
          st.draws += 1;
        } else if ((winner === 1 && inTeam1) || (winner === 2 && !inTeam1)) {
          st.wins += 1;
        } else {
          st.losses += 1;
        }
      });
    });

    const arr = Object.values(statsByPlayer);

    arr.sort((a, b) => {
      if (b.wins !== a.wins) return b.wins - a.wins;
      if (b.draws !== a.draws) return b.draws - a.draws;
      if (b.matches !== a.matches) return b.matches - a.matches;
      return 0;
    });

    return arr;
  }, [completedMatches]);

  // -----------------------------------
  // Marcador (auto llena el rival)
  // -----------------------------------
  const handleScoreTeam1Change = (value) => {
    const v = Math.max(0, Math.min(TOTAL_POINTS, value));
    setScoreTeam1(v);
    setScoreTeam2(TOTAL_POINTS - v);
  };

  const handleScoreTeam2Change = (value) => {
    const v = Math.max(0, Math.min(TOTAL_POINTS, value));
    setScoreTeam2(v);
    setScoreTeam1(TOTAL_POINTS - v);
  };

  const handleMarkDraw = () => {
    const half = TOTAL_POINTS / 2; // 2
    setScoreTeam1(half);
    setScoreTeam2(half);
  };

  // -----------------------------------
  // Guardar marcador
  // -----------------------------------
  const handleSaveResult = async () => {
    if (!currentMatch) return;

    const num1 = scoreTeam1;
    const num2 = scoreTeam2;

    if (
      num1 == null ||
      num2 == null ||
      Number.isNaN(num1) ||
      Number.isNaN(num2)
    ) {
      alert("Ingresa un marcador válido para ambos equipos.");
      return;
    }
    if (num1 < 0 || num2 < 0 || num1 > 4 || num2 > 4) {
      alert("El marcador debe estar entre 0 y 4.");
      return;
    }
    if (num1 + num2 !== TOTAL_POINTS) {
      alert("En este formato, la suma de puntos siempre debe ser 4.");
      return;
    }

    let winner = 0;
    if (num1 > num2) winner = 1;
    else if (num2 > num1) winner = 2;

    setSavingResult(true);

    try {
      const updatedMatches = matches.map((m) =>
        m.id === currentMatch.id
          ? {
              ...m,
              scoreTeam1: num1,
              scoreTeam2: num2,
              status: "completed",
              completedAt: new Date().toISOString(),
            }
          : m
      );

      const team1 = currentMatch.team1 || [];
      const team2 = currentMatch.team2 || [];

      const isRealUser = (id) => !id.startsWith("guest-");

      const plUpdates = {};

      applyMatchPLChanges({
        team1,
        team2,
        winner,
        getUserRank: (userId) => {
          if (userId.startsWith("guest-")) {
            return { rank: "Bronce III", leaguePoints: 0 };
          }
          const p = playersMap[userId];
          if (!p) {
            return { rank: "Bronce III", leaguePoints: 0 };
          }
          return {
            rank: p.rank || "Bronce III",
            leaguePoints: p.leaguePoints || 0,
          };
        },
        onUpdate: (userId, newRank, newPL, delta) => {
          if (!isRealUser(userId)) return;
          plUpdates[userId] = {
            newRank,
            newPL,
            delta,
          };
        },
      });

      const tRef = doc(db, "tournaments", tournamentId);

      const userUpdatesPromises = Object.entries(plUpdates).map(
        async ([uid, upd]) => {
          const current = playersMap[uid];
          if (!current) return;

          const resultForPlayer = (() => {
            if (winner === 0) return "draw";
            const inTeam1 = team1.includes(uid);
            const winningTeam = winner === 1 ? team1 : team2;
            return winningTeam.includes(uid) ? "win" : "loss";
          })();

          const scoreLabel = `${num1} - ${num2}`;

          const oldStats = current.stats || {
            totalMatches: 0,
            wins: 0,
            losses: 0,
            tournamentsPlayed: 0,
            tournamentsWon: 0,
            streak: 0,
            recentMatches: [],
            achievements: [],
          };

          const newStats = { ...oldStats };
          newStats.totalMatches = (newStats.totalMatches || 0) + 1;

          if (resultForPlayer === "win") {
            newStats.wins = (newStats.wins || 0) + 1;
            newStats.streak = (newStats.streak || 0) + 1;
          } else if (resultForPlayer === "loss") {
            newStats.losses = (newStats.losses || 0) + 1;
            newStats.streak = 0;
          } else {
            newStats.streak = 0;
          }

          const recent = Array.isArray(newStats.recentMatches)
            ? [...newStats.recentMatches]
            : [];

          recent.unshift({
            tournamentId,
            tournamentName: tournament?.name || "Torneo",
            result: resultForPlayer,
            score: scoreLabel,
            date: new Date().toISOString(),
            plDelta: upd.delta,
          });

          if (recent.length > 20) {
            recent.length = 20;
          }

          newStats.recentMatches = recent;

          const uRef = doc(db, "users", uid);
          await updateDoc(uRef, {
            rank: upd.newRank,
            leaguePoints: upd.newPL,
            stats: newStats,
          });
        }
      );

      await Promise.all([
        updateDoc(tRef, { matches: updatedMatches }),
        ...userUpdatesPromises,
      ]);

      setMatches(updatedMatches);

      const newPlayersMap = { ...playersMap };
      Object.entries(plUpdates).forEach(([uid, upd]) => {
        if (!newPlayersMap[uid]) return;
        const current = newPlayersMap[uid];
        newPlayersMap[uid] = {
          ...current,
          rank: upd.newRank,
          leaguePoints: upd.newPL,
        };
      });
      setPlayersMap(newPlayersMap);

      alert("Marcador guardado y ranking actualizado.");
    } catch (err) {
      console.error("Error guardando resultado:", err);
      alert("No se pudo guardar el resultado.");
    } finally {
      setSavingResult(false);
    }
  };

  // -----------------------------------
  // Completar torneo
  // -----------------------------------
  const handleCompleteTournament = async () => {
    if (!tournament) return;
    if (tournament.status === "completed") {
      alert("Este torneo ya está marcado como completado.");
      return;
    }

    const pendingCount = pendingMatches.length;
    const confirmMsg = pendingCount
      ? `Aún tienes ${pendingCount} partido(s) pendiente(s).\n\n¿Seguro que quieres marcar el torneo como completado?`
      : "¿Quieres marcar este torneo como completado?";

    if (!window.confirm(confirmMsg)) return;

    setCompletingTournament(true);
    try {
      const tRef = doc(db, "tournaments", tournamentId);
      const completedAt = new Date().toISOString();
      await updateDoc(tRef, {
        status: "completed",
        completedAt,
      });
      setTournament((prev) =>
        prev ? { ...prev, status: "completed", completedAt } : prev
      );
      alert("Torneo marcado como completado.");
    } catch (err) {
      console.error("Error completando torneo:", err);
      alert("No se pudo completar el torneo.");
    } finally {
      setCompletingTournament(false);
    }
  };

  // -----------------------------------
  // Eliminar partido pendiente
  // -----------------------------------
  const handleDeletePendingMatch = async (matchId, event) => {
    if (event && event.stopPropagation) event.stopPropagation();
    const match = matches.find((m) => m.id === matchId);
    if (!match) return;
    if (match.status !== "pending") {
      alert("Solo puedes eliminar partidos pendientes.");
      return;
    }
    if (!window.confirm("¿Eliminar este partido pendiente?")) return;

    const updated = matches.filter((m) => m.id !== matchId);

    try {
      await updateDoc(doc(db, "tournaments", tournamentId), {
        matches: updated,
      });
      setMatches(updated);
    } catch (err) {
      console.error("Error eliminando partido:", err);
      alert("No se pudo eliminar el partido.");
    }
  };

  // -----------------------------------
  // Reacomodar partidos pendientes (manual)
  // -----------------------------------
  const savePendingOrder = async (orderedPendingMatches) => {
    setReorderingPending(true);
    try {
      const pendingOrderMap = {};
      const baseTime = Date.now();

      orderedPendingMatches.forEach((m, idx) => {
        pendingOrderMap[m.id] = {
          ...m,
          createdAt: new Date(baseTime + idx).toISOString(),
        };
      });

      const updatedMatches = matches.map((m) => {
        if (m.status !== "pending") return m;
        const updated = pendingOrderMap[m.id];
        return updated ? updated : m;
      });

      await updateDoc(doc(db, "tournaments", tournamentId), {
        matches: updatedMatches,
      });
      setMatches(updatedMatches);
    } catch (err) {
      console.error("Error reacomodando partidos pendientes:", err);
      alert("No se pudo reacomodar el orden de los partidos.");
    } finally {
      setReorderingPending(false);
    }
  };

  const handleMovePendingMatch = async (matchId, direction) => {
    if (reorderingPending) return;

    const list = [...sortedPendingMatches];
    const index = list.findIndex((m) => m.id === matchId);
    if (index === -1) return;

    // En torneos de 2 canchas, los primeros 2 partidos están "en cancha"
    // y no se deben mover. En torneos de 1 cancha se puede reordenar todo.
    const pinnedCount = maxCourts >= 2 ? maxCourts : 0;
    const firstMovableIndex = pinnedCount;

    if (direction === "up") {
      if (index <= firstMovableIndex) return;
      const newIndex = index - 1;
      const [item] = list.splice(index, 1);
      list.splice(newIndex, 0, item);
    } else if (direction === "down") {
      if (index < firstMovableIndex) return;
      if (index >= list.length - 1) return;
      const newIndex = index + 1;
      const [item] = list.splice(index, 1);
      list.splice(newIndex, 0, item);
    } else {
      return;
    }

    await savePendingOrder(list);
  };

  // -----------------------------------
  // Partidos inteligentes / personalizados
  // -----------------------------------
  const getPlayerMatchCount = (playerId) => {
    let count = 0;
    matches.forEach((m) => {
      if (m.status !== "completed") return;
      const involved = [...(m.team1 || []), ...(m.team2 || [])];
      if (involved.includes(playerId)) {
        count++;
      }
    });
    return count;
  };

  const teamKey = (team) => [...team].sort().join("|");
  const matchupKey = (teamA, teamB) => {
    const ta = teamKey(teamA);
    const tb = teamKey(teamB);
    return ta < tb ? `${ta}::${tb}` : `${tb}::${ta}`;
  };

  const generateSmartMatch = async () => {
    if (!tournament) return;
    const allIds = [
      ...(Array.isArray(tournament.players) ? tournament.players : []),
      ...(Array.isArray(tournament.guestPlayers)
        ? tournament.guestPlayers.map((_, idx) => `guest-${idx}`)
        : []),
    ];
    if (allIds.length < 4) {
      alert("Se necesitan al menos 4 jugadores para crear un partido.");
      return;
    }

    const existingTeams = new Set();
    const existingMatchups = new Set();

    matches.forEach((m) => {
      const t1 = m.team1 || [];
      const t2 = m.team2 || [];
      if (t1.length === 2) existingTeams.add(teamKey(t1));
      if (t2.length === 2) existingTeams.add(teamKey(t2));
      if (t1.length === 2 && t2.length === 2) {
        existingMatchups.add(matchupKey(t1, t2));
      }
    });

    const sorted = [...allIds].sort((a, b) => {
      const ca = getPlayerMatchCount(a);
      const cb = getPlayerMatchCount(b);
      if (ca !== cb) return ca - cb;
      const ia = getDivisionIndex(playersMap[a]?.rank || "Bronce III");
      const ib = getDivisionIndex(playersMap[b]?.rank || "Bronce III");
      return ia - ib;
    });

    const [p1, p2, p3, p4] = sorted;

    const combos = [
      { team1: [p1, p2], team2: [p3, p4] },
      { team1: [p1, p3], team2: [p2, p4] },
      { team1: [p1, p4], team2: [p2, p3] },
    ];

    const avgIdx = (team) =>
      team.reduce(
        (sum, id) =>
          sum + getDivisionIndex(playersMap[id]?.rank || "Bronce III"),
        0
      ) / team.length;

    const comboCost = (c) => {
      const t1Idx = avgIdx(c.team1);
      const t2Idx = avgIdx(c.team2);
      const fairnessCost = Math.abs(t1Idx - t2Idx);

      const t1Key = teamKey(c.team1);
      const t2Key = teamKey(c.team2);
      const teamPenalty =
        (existingTeams.has(t1Key) ? 1 : 0) +
        (existingTeams.has(t2Key) ? 1 : 0);

      const muKey = matchupKey(c.team1, c.team2);
      const matchupPenalty = existingMatchups.has(muKey) ? 1 : 0;

      return fairnessCost + teamPenalty * 2 + matchupPenalty * 4;
    };

    let best = combos[0];
    let bestCost = comboCost(best);
    for (let i = 1; i < combos.length; i++) {
      const cost = comboCost(combos[i]);
      if (cost < bestCost) {
        best = combos[i];
        bestCost = cost;
      }
    }

    const newMatch = {
      id: `match-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
      team1: best.team1,
      team2: best.team2,
      scoreTeam1: null,
      scoreTeam2: null,
      status: "pending",
      createdAt: new Date().toISOString(),
      type: "smart",
    };

    const newMatches = [...matches, newMatch];

    setSavingNewMatch(true);
    try {
      await updateDoc(doc(db, "tournaments", tournamentId), {
        matches: newMatches,
      });
      setMatches(newMatches);
      alert("Partido inteligente creado.");
    } catch (err) {
      console.error("Error creando partido inteligente:", err);
      alert("No se pudo crear el partido.");
    } finally {
      setSavingNewMatch(false);
    }
  };

  const toggleCustomPlayer = (pid) => {
    setCustomBalanceLabel("");
    setCustomSelected((prev) => {
      if (prev.includes(pid)) {
        return prev.filter((id) => id !== pid);
      }
      if (prev.length >= 4) return prev;
      return [...prev, pid];
    });
  };

  const computeCustomBalance = () => {
    if (customSelected.length !== 4) {
      setCustomBalanceLabel(
        "Selecciona exactamente 4 jugadores para evaluar el equilibrio."
      );
      return;
    }

    const [a, b, c, d] = customSelected;
    const combos = [
      { team1: [a, b], team2: [c, d] },
      { team1: [a, c], team2: [b, d] },
      { team1: [a, d], team2: [b, c] },
    ];

    const avgIdx = (team) =>
      team.reduce(
        (sum, id) =>
          sum + getDivisionIndex(playersMap[id]?.rank || "Bronce III"),
        0
      ) / team.length;

    let best = combos[0];
    let bestDiff = Math.abs(avgIdx(best.team1) - avgIdx(best.team2));

    for (let i = 1; i < combos.length; i++) {
      const diff = Math.abs(
        avgIdx(combos[i].team1) - avgIdx(combos[i].team2)
      );
      if (diff < bestDiff) {
        best = combos[i];
        bestDiff = diff;
      }
    }

    let label = "";
    if (bestDiff < 0.3) label = "Matchup muy equilibrado ✅";
    else if (bestDiff < 0.8) label = "Matchup bastante equilibrado 👍";
    else if (bestDiff < 1.5) label = "Matchup algo desequilibrado ⚠️";
    else label = "Matchup muy desequilibrado ❗";

    setCustomBalanceLabel(label);
  };

  const createCustomMatch = async () => {
    if (customSelected.length !== 4) {
      alert("Selecciona exactamente 4 jugadores para crear un partido.");
      return;
    }
    const [a, b, c, d] = customSelected;

    const combos = [
      { team1: [a, b], team2: [c, d] },
      { team1: [a, c], team2: [b, d] },
      { team1: [a, d], team2: [b, c] },
    ];

    const avgIdx = (team) =>
      team.reduce(
        (sum, id) =>
          sum + getDivisionIndex(playersMap[id]?.rank || "Bronce III"),
        0
      ) / team.length;

    let best = combos[0];
    let bestDiff = Math.abs(avgIdx(best.team1) - avgIdx(best.team2));

    for (let i = 1; i < combos.length; i++) {
      const diff = Math.abs(
        avgIdx(combos[i].team1) - avgIdx(combos[i].team2)
      );
      if (diff < bestDiff) {
        best = combos[i];
        bestDiff = diff;
      }
    }

    const newMatch = {
      id: `match-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
      team1: best.team1,
      team2: best.team2,
      scoreTeam1: null,
      scoreTeam2: null,
      status: "pending",
      createdAt: new Date().toISOString(),
      type: "custom",
    };

    const newMatches = [...matches, newMatch];

    setSavingNewMatch(true);
    try {
      await updateDoc(doc(db, "tournaments", tournamentId), {
        matches: newMatches,
      });
      setMatches(newMatches);
      alert("Partido personalizado creado.");
      setCustomSelected([]);
      setCustomBalanceLabel("");
      setShowCustom(false);
    } catch (err) {
      console.error("Error creando partido personalizado:", err);
      alert("No se pudo crear el partido.");
    } finally {
      setSavingNewMatch(false);
    }
  };

  // -----------------------------------
  // Cálculo de costos
  // -----------------------------------
  const totalParticipants =
    (Array.isArray(tournament?.players)
      ? tournament.players.length
      : 0) +
    (Array.isArray(tournament?.guestPlayers)
      ? tournament.guestPlayers.length
      : 0);

  const openCostModal = () => {
    setCourtCostPerHour("");
    setHoursCourt1("");
    setHoursCourt2("");
    setCostResult(null);
    setShowCostModal(true);
  };

  const handleCalculateCosts = () => {
    const parseNumber = (val) => {
      if (val === "" || val == null) return 0;
      const n = parseFloat(
        String(val).replace(",", ".")
      );
      return Number.isNaN(n) ? 0 : n;
    };

    const costPerHour = parseNumber(courtCostPerHour);
    const h1 = parseNumber(hoursCourt1);
    const h2 = maxCourts >= 2 ? parseNumber(hoursCourt2) : 0;

    if (costPerHour <= 0) {
      alert("Ingresa un costo por hora válido (mayor a 0).");
      return;
    }
    if (h1 <= 0 && h2 <= 0) {
      alert(
        "Ingresa al menos algunas horas de renta en una de las canchas."
      );
      return;
    }
    if (!totalParticipants || totalParticipants <= 0) {
      alert(
        "No se encontraron participantes en el torneo para dividir el costo."
      );
      return;
    }

    const totalHours = h1 + h2;
    const totalCost = totalHours * costPerHour;
    const perPlayer = totalCost / totalParticipants;

    setCostResult({
      totalHours,
      totalCost,
      perPlayer,
      count: totalParticipants,
    });
  };

  // -----------------------------------
  // Render
  // -----------------------------------
  if (loading || !tournament) {
    return (
      <div
        style={{
          padding: "1rem",
          fontSize: "0.9rem",
          color: "var(--muted)",
        }}
      >
        {loading
          ? "Cargando información del torneo..."
          : "Torneo no encontrado."}
      </div>
    );
  }

  const completedCount = matches.filter((m) => m.status === "completed").length;
  const pendingCount = pendingMatches.length;
  const isTournamentCompleted = tournament.status === "completed";

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
          borderRadius: "1.1rem",
          padding: "0.9rem 1rem 0.6rem 1rem",
          border: "1px solid var(--border)",
          background: "var(--bg-elevated)",
        }}
      >
        <p
          style={{
            margin: 0,
            fontSize: "0.75rem",
            color: "var(--muted)",
          }}
        >
          {isTournamentCompleted ? "Torneo completado" : "Jugando torneo"}
        </p>
        <h1
          style={{
            margin: 0,
            marginTop: "0.15rem",
            fontSize: "1rem",
            fontWeight: 700,
          }}
        >
          {tournament.name}
        </h1>
        <p
          style={{
            margin: 0,
            marginTop: "0.3rem",
            fontSize: "0.78rem",
            color: "var(--muted)",
          }}
        >
          Partidos completados: <strong>{completedCount}</strong> • Pendientes:{" "}
          <strong>{pendingCount}</strong> •{" "}
          {maxCourts} {maxCourts === 1 ? "cancha" : "canchas"}
        </p>

        {/* Selector de cancha (solo si hay 2) */}
        {maxCourts > 1 && (
          <div
            style={{
              marginTop: "0.5rem",
              display: "flex",
              alignItems: "center",
              justifyContent: "space-between",
              gap: "0.5rem",
              fontSize: "0.78rem",
            }}
          >
            <div
              style={{
                display: "flex",
                alignItems: "center",
                gap: "0.35rem",
              }}
            >
              <Icon name="court" size={16} color="var(--muted)" />
              <span style={{ color: "var(--muted)" }}>Cancha actual:</span>
              <div
                style={{
                  display: "flex",
                  gap: "0.25rem",
                }}
              >
                {[1, 2].map((c) => {
                  const active = activeCourt === c;
                  return (
                    <button
                      key={c}
                      type="button"
                      onClick={() => setActiveCourt(c)}
                      style={{
                        borderRadius: "999px",
                        border: active
                          ? "1px solid var(--accent)"
                          : "1px solid var(--border)",
                        padding: "0.15rem 0.55rem",
                        background: active
                          ? "var(--accent-soft)"
                          : "transparent",
                        fontSize: "0.75rem",
                        cursor: "pointer",
                      }}
                    >
                      {c}
                    </button>
                  );
                })}
              </div>
            </div>

            <div
              style={{
                display: "flex",
                gap: "0.4rem",
                alignItems: "center",
                flexWrap: "wrap",
                justifyContent: "flex-end",
              }}
            >
              <button
                type="button"
                onClick={openCostModal}
                style={{
                  borderRadius: "999px",
                  border: "1px solid var(--border)",
                  padding: "0.25rem 0.6rem",
                  background: "transparent",
                  fontSize: "0.75rem",
                  cursor: "pointer",
                  color: "var(--fg)",
                  whiteSpace: "nowrap",
                }}
              >
                Calcular costos
              </button>
              <button
                type="button"
                onClick={handleCompleteTournament}
                disabled={completingTournament || isTournamentCompleted}
                style={{
                  borderRadius: "999px",
                  border: isTournamentCompleted
                    ? "1px solid var(--border)"
                    : "1px solid var(--accent)",
                  padding: "0.25rem 0.6rem",
                  background: isTournamentCompleted
                    ? "transparent"
                    : "var(--accent-soft)",
                  fontSize: "0.75rem",
                  cursor:
                    completingTournament || isTournamentCompleted
                      ? "default"
                      : "pointer",
                  color: isTournamentCompleted
                    ? "var(--muted)"
                    : "var(--fg)",
                  whiteSpace: "nowrap",
                }}
              >
                {isTournamentCompleted
                  ? "Torneo completado"
                  : completingTournament
                  ? "Completando..."
                  : "Completar torneo"}
              </button>
            </div>
          </div>
        )}

        {maxCourts === 1 && (
          <div
            style={{
              marginTop: "0.5rem",
              display: "flex",
              justifyContent: "flex-end",
              gap: "0.4rem",
              flexWrap: "wrap",
            }}
          >
            <button
              type="button"
              onClick={openCostModal}
              style={{
                borderRadius: "999px",
                border: "1px solid var(--border)",
                padding: "0.25rem 0.6rem",
                background: "transparent",
                fontSize: "0.75rem",
                cursor: "pointer",
                color: "var(--fg)",
                whiteSpace: "nowrap",
              }}
            >
              Calcular costos
            </button>
            <button
              type="button"
              onClick={handleCompleteTournament}
              disabled={completingTournament || isTournamentCompleted}
              style={{
                borderRadius: "999px",
                border: isTournamentCompleted
                  ? "1px solid var(--border)"
                  : "1px solid var(--accent)",
                padding: "0.25rem 0.6rem",
                background: isTournamentCompleted
                  ? "transparent"
                  : "var(--accent-soft)",
                fontSize: "0.75rem",
                cursor:
                  completingTournament || isTournamentCompleted
                    ? "default"
                    : "pointer",
                color: isTournamentCompleted
                  ? "var(--muted)"
                  : "var(--fg)",
              }}
            >
              {isTournamentCompleted
                ? "Torneo completado"
                : completingTournament
                ? "Completando..."
                : "Completar torneo"}
            </button>
          </div>
        )}

        <div
          style={{
            marginTop: "0.4rem",
            fontSize: "0.72rem",
            color: "var(--muted)",
            textAlign: "right",
          }}
        >
          El ranking del torneo no depende de tu división de PL, solo de tus
          resultados aquí.
        </div>

        {/* Tabs */}
        <div
          style={{
            marginTop: "0.65rem",
            display: "flex",
            gap: "0.35rem",
            borderRadius: "999px",
            padding: "0.1rem",
            backgroundColor: "var(--bg)",
          }}
        >
          {["partidos", "ranking", "historial"].map((tab) => {
            const label =
              tab === "partidos"
                ? "Partidos"
                : tab === "ranking"
                ? "Ranking"
                : "Historial";
            const active = activeTab === tab;
            return (
              <button
                key={tab}
                type="button"
                onClick={() => setActiveTab(tab)}
                style={{
                  flex: 1,
                  borderRadius: "999px",
                  border: "none",
                  padding: "0.35rem 0.2rem",
                  fontSize: "0.78rem",
                  cursor: "pointer",
                  background: active
                    ? "var(--accent-soft)"
                    : "transparent",
                  color: active ? "var(--fg)" : "var(--muted)",
                  fontWeight: active ? 600 : 400,
                }}
              >
                {label}
              </button>
            );
          })}
        </div>
      </section>

      {/* TAB: PARTIDOS */}
      {activeTab === "partidos" && (
        <>
          {/* Partido en cancha (según cancha activa) + jugadores en espera */}
          <section className="card">
            <h2
              style={{
                margin: 0,
                marginBottom: "0.5rem",
                fontSize: "0.95rem",
              }}
            >
              {maxCourts > 1
                ? `Partido en cancha ${activeCourt}`
                : "Partido en cancha"}
            </h2>

            {!currentMatch ? (
              <p
                style={{
                  margin: 0,
                  fontSize: "0.8rem",
                  color: "var(--muted)",
                }}
              >
                No hay partido asignado en esta cancha. Crea nuevos partidos
                inteligentes o personalizados abajo.
              </p>
            ) : (
              <>
                {/* Jugadores */}
                <div
                  style={{
                    display: "flex",
                    justifyContent: "space-between",
                    gap: "0.4rem",
                    alignItems: "flex-end",
                  }}
                >
                  <div
                    style={{
                      display: "flex",
                      flex: 1,
                      justifyContent: "flex-start",
                      gap: "0.4rem",
                    }}
                  >
                    {(currentMatch.team1 || []).map((pid) => {
                      const p = getPlayerDisplay(pid);
                      return (
                        <PlayerAvatar
                          key={pid}
                          name={p.name}
                          avatar={p.avatar}
                        />
                      );
                    })}
                  </div>

                  <div
                    style={{
                      width: 40,
                      textAlign: "center",
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "center",
                    }}
                  >
                    <span
                      style={{
                        fontSize: "0.8rem",
                        fontWeight: 700,
                        color: "var(--muted)",
                      }}
                    >
                      VS
                    </span>
                  </div>

                  <div
                    style={{
                      display: "flex",
                      flex: 1,
                      justifyContent: "flex-end",
                      gap: "0.4rem",
                    }}
                  >
                    {(currentMatch.team2 || []).map((pid) => {
                      const p = getPlayerDisplay(pid);
                      return (
                        <PlayerAvatar
                          key={pid}
                          name={p.name}
                          avatar={p.avatar}
                        />
                      );
                    })}
                  </div>
                </div>

                {/* Marcador central */}
                <div
                  style={{
                    marginTop: "0.9rem",
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                    gap: "0.6rem",
                  }}
                >
                  <ScoreNumberInput
                    label="Equipo 1"
                    value={scoreTeam1}
                    onChange={handleScoreTeam1Change}
                  />
                  <span
                    style={{
                      fontSize: "1.1rem",
                      fontWeight: 700,
                      color: "var(--muted)",
                    }}
                  >
                    -
                  </span>
                  <ScoreNumberInput
                    label="Equipo 2"
                    value={scoreTeam2}
                    onChange={handleScoreTeam2Change}
                  />
                </div>

                <div
                  style={{
                    marginTop: "0.65rem",
                    display: "flex",
                    gap: "0.5rem",
                  }}
                >
                  <button
                    type="button"
                    onClick={handleSaveResult}
                    disabled={savingResult}
                    style={{
                      flex: 1,
                      borderRadius: "0.9rem",
                      border: "none",
                      padding: "0.5rem 0.6rem",
                      background:
                        "linear-gradient(135deg, var(--accent), rgba(59,130,246,0.9))",
                      color: "#ffffff",
                      fontSize: "0.84rem",
                      fontWeight: 600,
                      cursor: savingResult ? "default" : "pointer",
                    }}
                  >
                    {savingResult ? "Guardando..." : "Guardar resultado"}
                  </button>
                  <button
                    type="button"
                    onClick={handleMarkDraw}
                    disabled={savingResult}
                    style={{
                      borderRadius: "0.9rem",
                      border: "1px solid var(--border)",
                      padding: "0.5rem 0.6rem",
                      background: "transparent",
                      fontSize: "0.8rem",
                      color: "var(--muted)",
                      cursor: savingResult ? "default" : "pointer",
                    }}
                  >
                    Marcar empate (2–2)
                  </button>
                </div>
              </>
            )}

            {/* Jugadores en espera */}
            <div
              style={{
                marginTop: "0.9rem",
                borderTop: "1px solid var(--border)",
                paddingTop: "0.55rem",
              }}
            >
              <h3
                style={{
                  margin: 0,
                  marginBottom: "0.4rem",
                  fontSize: "0.9rem",
                }}
              >
                Jugadores en espera
              </h3>
              {waitingPlayers.length === 0 ? (
                <p
                  style={{
                    margin: 0,
                    fontSize: "0.8rem",
                    color: "var(--muted)",
                  }}
                >
                  No hay jugadores en espera en este momento.
                </p>
              ) : (
                <div
                  style={{
                    display: "flex",
                    flexWrap: "wrap",
                    gap: "0.4rem",
                  }}
                >
                  {waitingPlayers.map((pid) => {
                    const p = getPlayerDisplay(pid);
                    return (
                      <div
                        key={pid}
                        style={{
                          display: "flex",
                          alignItems: "center",
                          gap: "0.25rem",
                          borderRadius: "999px",
                          padding: "0.25rem 0.45rem",
                          background: "var(--bg)",
                          border: "1px solid var(--border)",
                          fontSize: "0.78rem",
                        }}
                      >
                        <div
                          style={{
                            width: 22,
                            height: 22,
                            borderRadius: "999px",
                            overflow: "hidden",
                            backgroundColor: "var(--bg-elevated)",
                            display: "flex",
                            alignItems: "center",
                            justifyContent: "center",
                            fontSize: "0.75rem",
                            fontWeight: 600,
                          }}
                        >
                          {p.avatar ? (
                            <img
                              src={p.avatar}
                              alt={p.name}
                              style={{
                                width: "100%",
                                height: "100%",
                                objectFit: "cover",
                              }}
                            />
                          ) : (
                            (p.name || "J")[0].toUpperCase()
                          )}
                        </div>
                        <span
                          style={{
                            maxWidth: 120,
                            overflow: "hidden",
                            textOverflow: "ellipsis",
                            whiteSpace: "nowrap",
                            color: "var(--fg)",
                          }}
                        >
                          {p.name}
                        </span>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          </section>

          {/* TODOS los partidos pendientes */}
          <section className="card">
            <div
              style={{
                display: "flex",
                alignItems: "center",
                justifyContent: "space-between",
                gap: "0.4rem",
                marginBottom: "0.4rem",
              }}
            >
              <h2
                style={{
                  margin: 0,
                  fontSize: "0.95rem",
                }}
              >
                Partidos pendientes
              </h2>
              {pendingMatches.length > 0 && (
                <span
                  style={{
                    fontSize: "0.7rem",
                    color: "var(--muted)",
                    textAlign: "right",
                  }}
                >
                  Usa las flechas para reacomodar el orden.
                  {maxCourts >= 2 &&
                    " Los primeros 2 partidos son los que están en cancha."}
                </span>
              )}
            </div>

            {pendingMatches.length === 0 ? (
              <p
                style={{
                  margin: 0,
                  fontSize: "0.8rem",
                  color: "var(--muted)",
                }}
              >
                No hay partidos pendientes por jugar.
              </p>
            ) : (
              <div
                style={{
                  display: "flex",
                  flexDirection: "column",
                  gap: "0.35rem",
                  fontSize: "0.78rem",
                }}
              >
                {sortedPendingMatches.map((m, index) => {
                  const t1Names = (m.team1 || [])
                    .map((pid) => shortName(getPlayerDisplay(pid).name))
                    .join(" & ");
                  const t2Names = (m.team2 || [])
                    .map((pid) => shortName(getPlayerDisplay(pid).name))
                    .join(" & ");

                  const pinnedCount = maxCourts >= 2 ? maxCourts : 0;
                  const isPinned = maxCourts >= 2 && index < pinnedCount;

                  return (
                    <div
                      key={m.id}
                      style={{
                        borderRadius: "0.8rem",
                        border: "1px solid var(--border)",
                        padding: "0.4rem 0.45rem",
                        background: "var(--bg)",
                      }}
                    >
                      <div
                        style={{
                          display: "flex",
                          alignItems: "center",
                          justifyContent: "space-between",
                          gap: "0.25rem",
                        }}
                      >
                        <span
                          style={{
                            flex: 1,
                            overflow: "hidden",
                            textOverflow: "ellipsis",
                            whiteSpace: "nowrap",
                            color: "var(--fg)",
                          }}
                        >
                          {t1Names}
                        </span>

                        <div
                          style={{
                            width: 90,
                            display: "flex",
                            flexDirection: "column",
                            alignItems: "center",
                            justifyContent: "center",
                            gap: "0.15rem",
                          }}
                        >
                          <span
                            style={{
                              textAlign: "center",
                              fontWeight: 600,
                              color: "var(--muted)",
                              fontSize: "0.8rem",
                            }}
                          >
                            VS
                          </span>
                          <div
                            style={{
                              display: "flex",
                              alignItems: "center",
                              gap: "0.3rem",
                            }}
                          >
                            <button
                              type="button"
                              onClick={(e) =>
                                handleDeletePendingMatch(m.id, e)
                              }
                              style={{
                                border: "none",
                                background: "transparent",
                                color: "#ef4444",
                                fontSize: "0.7rem",
                                cursor: "pointer",
                                padding: 0,
                              }}
                            >
                              Eliminar
                            </button>
                            {!isPinned && (
                              <div
                                style={{
                                  display: "flex",
                                  flexDirection: "column",
                                  gap: "0.15rem",
                                }}
                              >
                                <button
                                  type="button"
                                  disabled={
                                    reorderingPending || index === 0
                                  }
                                  onClick={() =>
                                    handleMovePendingMatch(m.id, "up")
                                  }
                                  style={{
                                    border: "none",
                                    background: "transparent",
                                    fontSize: "0.7rem",
                                    cursor: reorderingPending
                                      ? "default"
                                      : "pointer",
                                    color: "var(--muted)",
                                    padding: 0,
                                    lineHeight: 1,
                                  }}
                                >
                                  ↑
                                </button>
                                <button
                                  type="button"
                                  disabled={
                                    reorderingPending ||
                                    index ===
                                      sortedPendingMatches.length - 1
                                  }
                                  onClick={() =>
                                    handleMovePendingMatch(m.id, "down")
                                  }
                                  style={{
                                    border: "none",
                                    background: "transparent",
                                    fontSize: "0.7rem",
                                    cursor: reorderingPending
                                      ? "default"
                                      : "pointer",
                                    color: "var(--muted)",
                                    padding: 0,
                                    lineHeight: 1,
                                  }}
                                >
                                  ↓
                                </button>
                              </div>
                            )}
                          </div>
                        </div>

                        <span
                          style={{
                            flex: 1,
                            overflow: "hidden",
                            textOverflow: "ellipsis",
                            whiteSpace: "nowrap",
                            textAlign: "right",
                            color: "var(--fg)",
                          }}
                        >
                          {t2Names}
                        </span>
                      </div>
                      <div
                        style={{
                          marginTop: "0.2rem",
                          fontSize: "0.7rem",
                          color: "var(--muted)",
                          display: "flex",
                          justifyContent: "space-between",
                        }}
                      >
                        <span>
                          {m.type === "smart"
                            ? "Inteligente"
                            : m.type === "custom"
                            ? "Personalizado"
                            : "Partido"}
                          {index === 0 && " • Cancha 1"}
                          {index === 1 && maxCourts >= 2 && " • Cancha 2"}
                        </span>
                        <span>
                          {m.createdAt
                            ? new Date(m.createdAt).toLocaleTimeString(
                                "es-MX",
                                { hour: "2-digit", minute: "2-digit" }
                              )
                            : ""}
                        </span>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </section>

          {/* CREAR PARTIDOS NUEVOS */}
          <section className="card">
            <h2
              style={{
                margin: 0,
                marginBottom: "0.4rem",
                fontSize: "0.95rem",
              }}
            >
              Nuevos partidos
            </h2>

            <div
              style={{
                display: "flex",
                gap: "0.5rem",
                marginBottom: "0.6rem",
              }}
            >
              <button
                type="button"
                onClick={generateSmartMatch}
                disabled={savingNewMatch}
                style={{
                  flex: 1,
                  borderRadius: "0.9rem",
                  border: "none",
                  padding: "0.45rem 0.6rem",
                  background:
                    "linear-gradient(135deg, var(--accent), rgba(59,130,246,0.9))",
                  color: "#ffffff",
                  fontSize: "0.8rem",
                  fontWeight: 600,
                  cursor: savingNewMatch ? "default" : "pointer",
                  display: "flex",
                  alignItems: "center",
                  gap: "0.3rem",
                  justifyContent: "center",
                }}
              >
                <Icon name="magic" size={14} color="#ffffff" />
                Inteligente
              </button>
              <button
                type="button"
                onClick={() => setShowCustom((v) => !v)}
                style={{
                  flex: 1,
                  borderRadius: "0.9rem",
                  border: "1px solid var(--border)",
                  padding: "0.45rem 0.6rem",
                  background: "transparent",
                  fontSize: "0.8rem",
                  color: "var(--fg)",
                  cursor: "pointer",
                  display: "flex",
                  alignItems: "center",
                  gap: "0.3rem",
                  justifyContent: "center",
                }}
              >
                <Icon name="custom" size={14} color="var(--muted)" />
                Personalizado
              </button>
            </div>

            {showCustom && (
              <div
                style={{
                  borderRadius: "0.9rem",
                  padding: "0.5rem 0.55rem",
                  background: "var(--bg)",
                }}
              >
                <p
                  style={{
                    margin: 0,
                    marginBottom: "0.35rem",
                    fontSize: "0.78rem",
                    color: "var(--muted)",
                  }}
                >
                  Selecciona <strong>4 jugadores</strong>. La app te sugerirá el
                  matchup más equilibrado según sus rangos.
                </p>

                <div
                  style={{
                    display: "flex",
                    flexWrap: "wrap",
                    gap: "0.3rem",
                  }}
                >
                  {[
                    ...(Array.isArray(tournament.players)
                      ? tournament.players
                      : []),
                    ...(Array.isArray(tournament.guestPlayers)
                      ? tournament.guestPlayers.map(
                          (_, idx) => `guest-${idx}`
                        )
                      : []),
                  ].map((pid) => {
                    const sel = customSelected.includes(pid);
                    const p = getPlayerDisplay(pid);
                    return (
                      <button
                        key={pid}
                        type="button"
                        onClick={() => toggleCustomPlayer(pid)}
                        style={{
                          borderRadius: "999px",
                          border: sel
                            ? "1px solid var(--accent)"
                            : "1px solid var(--border)",
                          padding: "0.25rem 0.5rem",
                          background: sel
                            ? "var(--accent-soft)"
                            : "transparent",
                          fontSize: "0.75rem",
                          display: "flex",
                          alignItems: "center",
                          gap: "0.25rem",
                          cursor: "pointer",
                        }}
                      >
                        <span>
                          {(p.name || "J")
                            .split(" ")
                            .map((x) => x[0])
                            .join("")
                            .slice(0, 2)
                            .toUpperCase()}
                        </span>
                        <span
                          style={{
                            maxWidth: 110,
                            overflow: "hidden",
                            textOverflow: "ellipsis",
                            whiteSpace: "nowrap",
                            color: "var(--fg)",
                          }}
                        >
                          {p.name}
                        </span>
                      </button>
                    );
                  })}
                </div>

                {/* Preview del matchup antes de crear */}
                {customSelected.length === 4 && (
                  <div
                    style={{
                      marginTop: "0.45rem",
                      padding: "0.45rem 0.5rem",
                      borderRadius: "0.7rem",
                      background: "var(--bg-elevated)",
                      fontSize: "0.78rem",
                    }}
                  >
                    <p
                      style={{
                        margin: 0,
                        marginBottom: "0.25rem",
                        fontWeight: 600,
                      }}
                    >
                      Posible enfrentamiento:
                    </p>
                    {(() => {
                      const [a, b, c, d] = customSelected;
                      const combos = [
                        { team1: [a, b], team2: [c, d] },
                        { team1: [a, c], team2: [b, d] },
                        { team1: [a, d], team2: [b, c] },
                      ];

                      const avgIdx = (team) =>
                        team.reduce(
                          (sum, id) =>
                            sum +
                            getDivisionIndex(
                              playersMap[id]?.rank || "Bronce III"
                            ),
                          0
                        ) / team.length;

                      let best = combos[0];
                      let bestDiff = Math.abs(
                        avgIdx(best.team1) - avgIdx(best.team2)
                      );

                      for (let i = 1; i < combos.length; i++) {
                        const diff = Math.abs(
                          avgIdx(combos[i].team1) -
                            avgIdx(combos[i].team2)
                        );
                        if (diff < bestDiff) {
                          best = combos[i];
                          bestDiff = diff;
                        }
                      }

                      const t1Names = best.team1
                        .map((id) => getPlayerDisplay(id).name)
                        .join(" & ");
                      const t2Names = best.team2
                        .map((id) => getPlayerDisplay(id).name)
                        .join(" & ");

                      return (
                        <>
                          <p
                            style={{
                              margin: 0,
                              marginBottom: "0.15rem",
                              color: "var(--fg)",
                            }}
                          >
                            {t1Names}
                          </p>
                          <p
                            style={{
                              margin: 0,
                              marginBottom: "0.15rem",
                              textAlign: "center",
                              fontSize: "0.8rem",
                              color: "var(--muted)",
                            }}
                          >
                            VS
                          </p>
                          <p
                            style={{
                              margin: 0,
                              marginBottom: "0.25rem",
                              color: "var(--fg)",
                            }}
                          >
                            {t2Names}
                          </p>
                        </>
                      );
                    })()}
                    {customBalanceLabel && (
                      <p
                        style={{
                          margin: 0,
                          marginTop: "0.2rem",
                          fontSize: "0.76rem",
                          color: "var(--muted)",
                        }}
                      >
                        {customBalanceLabel}
                      </p>
                    )}
                  </div>
                )}

                <div
                  style={{
                    marginTop: "0.45rem",
                    display: "flex",
                    gap: "0.4rem",
                  }}
                >
                  <button
                    type="button"
                    onClick={computeCustomBalance}
                    style={{
                      flex: 1,
                      borderRadius: "0.9rem",
                      border: "1px solid var(--border)",
                      padding: "0.4rem 0.5rem",
                      background: "transparent",
                      fontSize: "0.78rem",
                      color: "var(--fg)",
                      cursor: "pointer",
                    }}
                  >
                    Evaluar equilibrio
                  </button>
                  <button
                    type="button"
                    onClick={createCustomMatch}
                    disabled={savingNewMatch}
                    style={{
                      flex: 1,
                      borderRadius: "0.9rem",
                      border: "none",
                      padding: "0.4rem 0.5rem",
                      background:
                        "linear-gradient(135deg, var(--accent), rgba(59,130,246,0.9))",
                      color: "#ffffff",
                      fontSize: "0.78rem",
                      fontWeight: 600,
                      cursor: savingNewMatch ? "default" : "pointer",
                    }}
                  >
                    {savingNewMatch ? "Creando..." : "Crear partido"}
                  </button>
                </div>

                {customBalanceLabel && customSelected.length !== 4 && (
                  <p
                    style={{
                      margin: 0,
                      marginTop: "0.35rem",
                      fontSize: "0.76rem",
                      color: "var(--muted)",
                    }}
                  >
                    {customBalanceLabel}
                  </p>
                )}
              </div>
            )}
          </section>
        </>
      )}

      {/* TAB: RANKING */}
      {activeTab === "ranking" && (
        <section className="card">
          <h2
            style={{
              margin: 0,
              marginBottom: "0.4rem",
              fontSize: "0.95rem",
            }}
          >
            Ranking del torneo
          </h2>
          {tournamentRanking.length === 0 ? (
            <p
              style={{
                margin: 0,
                fontSize: "0.8rem",
                color: "var(--muted)",
              }}
            >
              El ranking se actualiza conforme se vayan completando partidos.
            </p>
          ) : (
            <div
              style={{
                display: "flex",
                flexDirection: "column",
                gap: "0.35rem",
                fontSize: "0.78rem",
              }}
            >
              {tournamentRanking.map((r, index) => {
                const info = playersMap[r.id];
                const isGuest = r.id.startsWith("guest-");
                const name = isGuest
                  ? guestMap[r.id] || "Invitado"
                  : info?.name ||
                    (info?.email ? info.email.split("@")[0] : "Jugador");

                const rankLabel = isGuest
                  ? "Unranked"
                  : info?.rank || "Bronce III";
                const plLabel = isGuest
                  ? "—"
                  : typeof info?.leaguePoints === "number"
                  ? `${info.leaguePoints} PL`
                  : "0 PL";

                return (
                  <div
                    key={r.id}
                    style={{
                      display: "flex",
                      alignItems: "center",
                      gap: "0.4rem",
                      borderRadius: "0.8rem",
                      padding: "0.35rem 0.4rem",
                      background: "var(--bg)",
                    }}
                  >
                    <div
                      style={{
                        width: 22,
                        textAlign: "center",
                        fontSize: "0.78rem",
                        fontWeight: 700,
                      }}
                    >
                      {index + 1}
                    </div>
                    <div
                      style={{
                        display: "flex",
                        flexDirection: "column",
                        flex: 1,
                        minWidth: 0,
                      }}
                    >
                      <span
                        style={{
                          overflow: "hidden",
                          textOverflow: "ellipsis",
                          whiteSpace: "nowrap",
                          color: "var(--fg)",
                        }}
                      >
                        {name}
                      </span>
                      <span
                        style={{
                          fontSize: "0.7rem",
                          color: "var(--muted)",
                        }}
                      >
                        {rankLabel} • {plLabel}
                      </span>
                    </div>
                    <div
                      style={{
                        textAlign: "right",
                        fontSize: "0.7rem",
                        color: "var(--muted)",
                      }}
                    >
                      <div>
                        {r.wins}W / {r.losses}L
                        {r.draws ? ` / ${r.draws}D` : ""}
                      </div>
                      <div>Partidos: {r.matches}</div>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </section>
      )}

      {/* TAB: HISTORIAL */}
      {activeTab === "historial" && (
        <section className="card">
          <h2
            style={{
              margin: 0,
              marginBottom: "0.4rem",
              fontSize: "0.95rem",
            }}
          >
            Historial de partidos
          </h2>
          {completedMatches.length === 0 ? (
            <p
              style={{
                margin: 0,
                fontSize: "0.8rem",
                color: "var(--muted)",
              }}
            >
              Aquí aparecerán los partidos jugados en este torneo.
            </p>
          ) : (
            <div
              style={{
                display: "flex",
                flexDirection: "column",
                gap: "0.4rem",
              }}
            >
              {completedMatches.map((m) => {
                const t1 = (m.team1 || []).map((pid) =>
                  getPlayerDisplay(pid)
                );
                const t2 = (m.team2 || []).map((pid) =>
                  getPlayerDisplay(pid)
                );
                const scoreLabel =
                  typeof m.scoreTeam1 === "number" &&
                  typeof m.scoreTeam2 === "number"
                    ? `${m.scoreTeam1} - ${m.scoreTeam2}`
                    : "sin marcador";

                const dateLabel = m.completedAt
                  ? new Date(m.completedAt).toLocaleTimeString("es-MX", {
                      hour: "2-digit",
                      minute: "2-digit",
                    })
                  : "";

                const t1Short = t1.map((p) => shortName(p.name)).join(" & ");
                const t2Short = t2.map((p) => shortName(p.name)).join(" & ");

                return (
                  <div
                    key={m.id}
                    style={{
                      borderRadius: "0.7rem",
                      padding: "0.45rem 0.5rem",
                      background: "var(--bg)",
                      display: "flex",
                      flexDirection: "column",
                      gap: "0.2rem",
                      fontSize: "0.78rem",
                    }}
                  >
                    <div
                      style={{
                        display: "flex",
                        alignItems: "center",
                        justifyContent: "space-between",
                        gap: "0.3rem",
                      }}
                    >
                      <span
                        style={{
                          flex: 1,
                          overflow: "hidden",
                          textOverflow: "ellipsis",
                          whiteSpace: "nowrap",
                          color: "var(--fg)",
                        }}
                      >
                        {t1Short}
                      </span>
                      <span
                        style={{
                          fontWeight: 600,
                          minWidth: 48,
                          textAlign: "center",
                          color: "var(--fg)",
                        }}
                      >
                        {scoreLabel}
                      </span>
                      <span
                        style={{
                          flex: 1,
                          overflow: "hidden",
                          textOverflow: "ellipsis",
                          whiteSpace: "nowrap",
                          textAlign: "right",
                          color: "var(--fg)",
                        }}
                      >
                        {t2Short}
                      </span>
                    </div>
                    <div
                      style={{
                        display: "flex",
                        justifyContent: "space-between",
                        fontSize: "0.7rem",
                        color: "var(--muted)",
                      }}
                    >
                      <span>
                        {m.type === "smart"
                          ? "Inteligente"
                          : m.type === "custom"
                          ? "Personalizado"
                          : "Partido"}
                      </span>
                      <span>{dateLabel}</span>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </section>
      )}

      {/* Modal de costos */}
      {showCostModal && (
        <div
          onClick={() => setShowCostModal(false)}
          style={{
            position: "fixed",
            inset: 0,
            backgroundColor: "rgba(15,23,42,0.7)",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            zIndex: 50,
            padding: "1rem",
          }}
        >
          <div
            onClick={(e) => e.stopPropagation()}
            style={{
              maxWidth: 420,
              width: "100%",
              borderRadius: "1rem",
              background: "var(--bg-elevated)",
              border: "1px solid var(--border)",
              padding: "0.9rem 1rem",
              fontSize: "0.82rem",
            }}
          >
            <h2
              style={{
                margin: 0,
                marginBottom: "0.5rem",
                fontSize: "0.95rem",
              }}
            >
              Calcular costos de renta
            </h2>

            <p
              style={{
                margin: 0,
                marginBottom: "0.4rem",
                fontSize: "0.78rem",
                color: "var(--muted)",
              }}
            >
              Participantes en el torneo:{" "}
              <strong>{totalParticipants}</strong>
            </p>

            <label
              style={{
                display: "block",
                fontSize: "0.78rem",
                marginBottom: "0.25rem",
              }}
            >
              Costo por hora de una cancha
            </label>
            <input
              type="number"
              min="0"
              step="0.01"
              value={courtCostPerHour}
              onChange={(e) => setCourtCostPerHour(e.target.value)}
              placeholder="Ej. 400"
              style={{
                width: "100%",
                borderRadius: "0.6rem",
                border: "1px solid var(--border)",
                padding: "0.35rem 0.45rem",
                marginBottom: "0.5rem",
                background: "var(--bg)",
                color: "var(--fg)",
                fontSize: "0.8rem",
              }}
            />

            <div
              style={{
                display: "flex",
                gap: "0.5rem",
                marginBottom: "0.4rem",
                flexWrap: "wrap",
              }}
            >
              <div style={{ flex: 1, minWidth: 120 }}>
                <label
                  style={{
                    display: "block",
                    fontSize: "0.78rem",
                    marginBottom: "0.25rem",
                  }}
                >
                  Horas cancha 1
                </label>
                <input
                  type="number"
                  min="0"
                  step="0.25"
                  value={hoursCourt1}
                  onChange={(e) => setHoursCourt1(e.target.value)}
                  placeholder="Ej. 3"
                  style={{
                    width: "100%",
                    borderRadius: "0.6rem",
                    border: "1px solid var(--border)",
                    padding: "0.35rem 0.45rem",
                    background: "var(--bg)",
                    color: "var(--fg)",
                    fontSize: "0.8rem",
                  }}
                />
              </div>

              {maxCourts >= 2 && (
                <div style={{ flex: 1, minWidth: 120 }}>
                  <label
                    style={{
                      display: "block",
                      fontSize: "0.78rem",
                      marginBottom: "0.25rem",
                    }}
                  >
                    Horas cancha 2
                  </label>
                  <input
                    type="number"
                    min="0"
                    step="0.25"
                    value={hoursCourt2}
                    onChange={(e) => setHoursCourt2(e.target.value)}
                    placeholder="Ej. 3"
                    style={{
                      width: "100%",
                      borderRadius: "0.6rem",
                      border: "1px solid var(--border)",
                      padding: "0.35rem 0.45rem",
                      background: "var(--bg)",
                      color: "var(--fg)",
                      fontSize: "0.8rem",
                    }}
                  />
                </div>
              )}
            </div>

            <div
              style={{
                display: "flex",
                gap: "0.5rem",
                marginTop: "0.35rem",
              }}
            >
              <button
                type="button"
                onClick={handleCalculateCosts}
                style={{
                  flex: 1,
                  borderRadius: "0.9rem",
                  border: "none",
                  padding: "0.45rem 0.6rem",
                  background:
                    "linear-gradient(135deg, var(--accent), rgba(59,130,246,0.9))",
                  color: "#ffffff",
                  fontSize: "0.8rem",
                  fontWeight: 600,
                  cursor: "pointer",
                }}
              >
                Calcular
              </button>
              <button
                type="button"
                onClick={() => setShowCostModal(false)}
                style={{
                  borderRadius: "0.9rem",
                  border: "1px solid var(--border)",
                  padding: "0.45rem 0.6rem",
                  background: "transparent",
                  fontSize: "0.8rem",
                  color: "var(--muted)",
                  cursor: "pointer",
                }}
              >
                Cerrar
              </button>
            </div>

            {costResult && (
              <div
                style={{
                  marginTop: "0.7rem",
                  padding: "0.55rem 0.6rem",
                  borderRadius: "0.75rem",
                  background: "var(--bg)",
                  fontSize: "0.8rem",
                }}
              >
                <p style={{ margin: 0, marginBottom: "0.25rem" }}>
                  Horas totales:{" "}
                  <strong>
                    {costResult.totalHours.toFixed(2)} h
                  </strong>
                </p>
                <p style={{ margin: 0, marginBottom: "0.25rem" }}>
                  Costo total de renta:{" "}
                  <strong>
                    ${costResult.totalCost.toFixed(2)}
                  </strong>
                </p>
                <p style={{ margin: 0 }}>
                  A cada jugador ({costResult.count}) le toca:{" "}
                  <strong>
                    ${costResult.perPlayer.toFixed(2)}
                  </strong>
                </p>
              </div>
            )}
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

// -----------------------------------
// Subcomponentes de UI
// -----------------------------------

function PlayerAvatar({ name, avatar }) {
  return (
    <div
      style={{
        width: 70,
        display: "flex",
        flexDirection: "column",
        alignItems: "center",
        gap: "0.25rem",
      }}
    >
      <div
        style={{
          width: 64,
          height: 64,
          borderRadius: "999px",
          overflow: "hidden",
          background:
            "radial-gradient(circle at 30% 20%, rgba(59,130,246,0.9), rgba(15,23,42,1))",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
        }}
      >
        {avatar ? (
          <img
            src={avatar}
            alt={name}
            style={{ width: "100%", height: "100%", objectFit: "cover" }}
          />
        ) : (
          <span
            style={{
              fontSize: "1.2rem",
              fontWeight: 700,
              color: "#ffffff",
            }}
          >
            {(name || "J")[0].toUpperCase()}
          </span>
        )}
      </div>
      <span
        style={{
          fontSize: "0.75rem",
          color: "var(--fg)",
          textAlign: "center",
          maxWidth: 70,
          overflow: "hidden",
          textOverflow: "ellipsis",
          whiteSpace: "nowrap",
        }}
      >
        {name}
      </span>
    </div>
  );
}

function ScoreNumberInput({ label, value, onChange }) {
  const inc = () => {
    if (value >= TOTAL_POINTS) return;
    onChange(value + 1);
  };

  const dec = () => {
    if (value <= 0) return;
    onChange(value - 1);
  };

  return (
    <div
      style={{
        minWidth: 80,
        textAlign: "center",
      }}
    >
      <div
        style={{
          fontSize: "0.7rem",
          color: "var(--muted)",
          marginBottom: "0.25rem",
        }}
      >
        {label}
      </div>
      <div
        style={{
          display: "flex",
          alignItems: "center",
          gap: "0.25rem",
          justifyContent: "center",
        }}
      >
        <button
          type="button"
          onClick={dec}
          style={{
            width: 26,
            height: 26,
            borderRadius: "999px",
            border: "1px solid var(--border)",
            background: "var(--bg)",
            fontSize: "0.9rem",
            cursor: "pointer",
          }}
        >
          –
        </button>
        <div
          style={{
            width: 40,
            textAlign: "center",
            fontSize: "1.1rem",
            fontWeight: 700,
          }}
        >
          {value}
        </div>
        <button
          type="button"
          onClick={inc}
          style={{
            width: 26,
            height: 26,
            borderRadius: "999px",
            border: "1px solid var(--border)",
            background: "var(--bg)",
            fontSize: "0.9rem",
            cursor: "pointer",
          }}
        >
          +
        </button>
      </div>
    </div>
  );
}
