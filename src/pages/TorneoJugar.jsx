// src/pages/TorneoJugar.jsx
import React, { useEffect, useState } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { doc, getDoc, updateDoc, collection } from "firebase/firestore";
import { db } from "../firebase/firebase";
import Icon from "../components/common/Icon";
import { applyMatchPLChanges, getDivisionIndex } from "../utils/ranking";

const TOTAL_POINTS = 4;

// Helper para armar el mejor matchup con 4 jugadores
function buildBestTeams(players4, existingTeams, existingMatchups, playersMap) {
  if (!players4 || players4.length !== 4) {
    return { team1: [], team2: [], diff: 0 };
  }
  const [a, b, c, d] = players4;

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

  const teamKey = (team) => [...team].sort().join("|");
  const matchupKey = (teamA, teamB) => {
    const ta = teamKey(teamA);
    const tb = teamKey(teamB);
    return ta < tb ? `${ta}::${tb}` : `${tb}::${ta}`;
  };

  let best = combos[0];
  let bestCost = Infinity;
  let bestDiff = 0;

  for (let i = 0; i < combos.length; i++) {
    const c = combos[i];
    const t1Idx = avgIdx(c.team1);
    const t2Idx = avgIdx(c.team2);
    const fairnessDiff = Math.abs(t1Idx - t2Idx);

    const t1Key = teamKey(c.team1);
    const t2Key = teamKey(c.team2);
    const teamPenalty =
      (existingTeams.has(t1Key) ? 1 : 0) +
      (existingTeams.has(t2Key) ? 1 : 0);

    const muKey = matchupKey(c.team1, c.team2);
    const matchupPenalty = existingMatchups.has(muKey) ? 1 : 0;

    const cost = fairnessDiff + teamPenalty * 2 + matchupPenalty * 4;

    if (cost < bestCost) {
      best = c;
      bestCost = cost;
      bestDiff = fairnessDiff;
    }
  }

  return { team1: best.team1, team2: best.team2, diff: bestDiff };
}

export default function TorneoJugar() {
  const { id } = useParams();
  const navigate = useNavigate();
  const tournamentId = id;

  const [loading, setLoading] = useState(true);
  const [savingResult, setSavingResult] = useState(false);
  const [savingNewMatch, setSavingNewMatch] = useState(false);

  const [tournament, setTournament] = useState(null);
  const [matches, setMatches] = useState([]);
  const [playersMap, setPlayersMap] = useState({});
  const [guestMap, setGuestMap] = useState({});

  // Marcadores por cancha
  const [scores, setScores] = useState({
    1: { team1: 0, team2: 0 },
    2: { team1: 0, team2: 0 },
  });

  // Para forzar captura de ambos resultados antes de guardar (2 canchas)
  const [scoreTouched, setScoreTouched] = useState({
    1: false,
    2: false,
  });

  // Partido personalizado
  const [showCustom, setShowCustom] = useState(false);
  const [customSelected, setCustomSelected] = useState([]);

  // Reacomodar pendientes
  const [reorderingPending, setReorderingPending] = useState(false);

  // Modal conflicto jugadores en dos canchas
  const [conflictModal, setConflictModal] = useState(null);
  // conflictModal = { courtIndex, triedMatch, suggestedMatch, conflictPlayers }

  // -----------------------------------
  // Normalizar nombres largos
  // -----------------------------------
  const shortName = (fullName) => {
    if (!fullName) return "Jugador";

    const trimmed = fullName.trim();
    if (!trimmed) return "Jugador";

    const parts = trimmed.split(/\s+/);

    // Caso con varias palabras: "Rodrigo Ventura Pérez"
    if (parts.length > 1) {
      const first = parts[0];
      const second = parts[1] && parts[1].length <= 6 ? parts[1] : null;

      let result = second ? `${first} ${second}` : first;

      if (result.length > 16) {
        result = result.slice(0, 16) + "…";
      }
      return result;
    }

    // Caso de 1 sola palabra
    return trimmed.length > 12 ? trimmed.slice(0, 12) + "…" : trimmed;
  };

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
    if (!p) return { name: "Jugador", avatar: "", isGuest: false };

    return {
      name: p.name,
      avatar: p.profilePicture || "",
      isGuest: false,
    };
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

        // Invitados
        const gMap = {};
        if (Array.isArray(tData.guestPlayers)) {
          tData.guestPlayers.forEach((name, idx) => {
            gMap[`guest-${idx}`] = name || `Invitado ${idx + 1}`;
          });
        }
        setGuestMap(gMap);

        // Jugadores reales
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

// -----------------------------------
// Derivados (sin hooks)
// -----------------------------------
const maxCourts =
  tournament?.maxCourts ||
  tournament?.courts ||
  tournament?.activeCourts ||
  1;

// ----------------------------
// Helpers: evitar repetidos en 2 canchas
// ----------------------------
const getMatchPlayers = (match) => [
  ...((match && match.team1) || []),
  ...((match && match.team2) || []),
];

const matchesOverlap = (a, b) => {
  if (!a || !b) return false;
  const setA = new Set(getMatchPlayers(a));
  return getMatchPlayers(b).some((pid) => setA.has(pid));
};

// Si los 2 primeros partidos pendientes chocan en jugadores,
// sube (a índice 1) el primer partido más abajo que NO choque.
const normalizeTopTwoPending = (pendingList) => {
  if (!pendingList || pendingList.length < 2) return pendingList;

  const first = pendingList[0];
  const second = pendingList[1];

  if (!matchesOverlap(first, second)) return pendingList; // todo bien

  // buscar candidato desde índice 2
  const idx = pendingList.findIndex(
    (m, i) => i >= 2 && !matchesOverlap(first, m)
  );
  if (idx === -1) return pendingList; // no hay opción sin choque

  const copy = [...pendingList];
  const [candidate] = copy.splice(idx, 1);
  copy.splice(1, 0, candidate);
  return copy;
};

const pendingMatches = matches.filter((m) => m.status === "pending");

// 👉 Respetar el orden tal cual está guardado en el array
const sortedPendingMatches =
  maxCourts >= 2
    ? normalizeTopTwoPending([...pendingMatches])
    : [...pendingMatches];

const matchCourt1 = sortedPendingMatches[0] || null;
const matchCourt2 = maxCourts >= 2 ? sortedPendingMatches[1] || null : null;

// Partidos realmente "pendientes" (no en cancha 1/2)
const displayPendingMatches = sortedPendingMatches.filter(
  (m) =>
    m.id !== (matchCourt1 && matchCourt1.id) &&
    m.id !== (matchCourt2 && matchCourt2.id)
);

// Jugadores en espera (no en cancha 1 ni 2)
let waitingPlayers = [];
if (tournament) {
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

  waitingPlayers = allIds.filter((id) => !inCourts.has(id));
}

const allTournamentPlayers = tournament
  ? [
      ...(Array.isArray(tournament.players) ? tournament.players : []),
      ...(Array.isArray(tournament.guestPlayers)
        ? tournament.guestPlayers.map((_, idx) => `guest-${idx}`)
        : []),
    ]
  : [];


  // -----------------------------------
  // Sincronizar marcadores cuando cambian partidos en cancha
  // -----------------------------------
  useEffect(() => {
    const clamp = (v) => Math.max(0, Math.min(TOTAL_POINTS, v));

    const newScores = {
      1: { team1: 0, team2: 0 },
      2: { team1: 0, team2: 0 },
    };

    if (matchCourt1) {
      const s1 =
        typeof matchCourt1.scoreTeam1 === "number"
          ? matchCourt1.scoreTeam1
          : 0;
      const s2 =
        typeof matchCourt1.scoreTeam2 === "number"
          ? matchCourt1.scoreTeam2
          : 0;
      newScores[1] = { team1: clamp(s1), team2: clamp(s2) };
    }

    if (matchCourt2) {
      const s1 =
        typeof matchCourt2.scoreTeam1 === "number"
          ? matchCourt2.scoreTeam1
          : 0;
      const s2 =
        typeof matchCourt2.scoreTeam2 === "number"
          ? matchCourt2.scoreTeam2
          : 0;
      newScores[2] = { team1: clamp(s1), team2: clamp(s2) };
    }

    setScores(newScores);
    setScoreTouched({
      1: false,
      2: false,
    });

  }, [matchCourt1, matchCourt2]);

  // -----------------------------------
  // Marcador (auto llena el rival)
  // -----------------------------------
  const handleScoreChange = (courtIndex, team, value) => {
    const v = Math.max(0, Math.min(TOTAL_POINTS, value));
    setScoreTouched((prev) => ({ ...prev, [courtIndex]: true }));
    setScores((prev) => {
      if (team === 1) {
        return {
          ...prev,
          [courtIndex]: {
            team1: v,
            team2: TOTAL_POINTS - v,
          },
        };
      } else {
        return {
          ...prev,
          [courtIndex]: {
            team1: TOTAL_POINTS - v,
            team2: v,
          },
        };
      }
    });
  };

  const handleMarkDrawForCourt = (courtIndex) => {
    const half = TOTAL_POINTS / 2; // 2–2
    setScoreTouched((prev) => ({ ...prev, [courtIndex]: true }));
    setScores((prev) => ({
      ...prev,
      [courtIndex]: { team1: half, team2: half },
    }));
  };

  // -----------------------------------
  // Guardar resultado para una cancha
  // -----------------------------------
  const saveMatchResult = async (match, num1, num2) => {
    if (!match) return;

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
        m.id === match.id
          ? {
              ...m,
              scoreTeam1: num1,
              scoreTeam2: num2,
              status: "completed",
              completedAt: new Date().toISOString(),
            }
          : m
      );

      const team1 = match.team1 || [];
      const team2 = match.team2 || [];

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

      alert("Marcador guardado.");
    } catch (err) {
      console.error("Error guardando resultado:", err);
      alert("No se pudo guardar el resultado.");
    } finally {
      setSavingResult(false);
    }
  };

  const handleSaveResultForCourt = async (courtIndex) => {
    const match = courtIndex === 1 ? matchCourt1 : matchCourt2;
    if (!match) return;
    const courtScores = scores[courtIndex] || { team1: 0, team2: 0 };
    await saveMatchResult(match, courtScores.team1, courtScores.team2);
  };

const handleSaveBothCourtsResults = async () => {
  if (maxCourts < 2 || !matchCourt1 || !matchCourt2) return;

  if (!scoreTouched[1] || !scoreTouched[2]) {
    alert("Primero captura el marcador de ambas canchas.");
    return;
  }

  const s1 = scores[1] || { team1: 0, team2: 0 };
  const s2 = scores[2] || { team1: 0, team2: 0 };

  // Validaciones rápidas (mismas reglas que usas en saveMatchResult)
  const isValidScore = (a, b) => {
    if (a == null || b == null) return false;
    if (Number.isNaN(a) || Number.isNaN(b)) return false;
    if (a < 0 || b < 0 || a > 4 || b > 4) return false;
    if (a + b !== TOTAL_POINTS) return false;
    return true;
  };

  if (!isValidScore(s1.team1, s1.team2) || !isValidScore(s2.team1, s2.team2)) {
    alert("Revisa los marcadores. Deben sumar 4 y estar entre 0 y 4.");
    return;
  }

  setSavingResult(true);
  try {
    const nowIso = new Date().toISOString();

    // ✅ Actualizamos LOS DOS partidos en un solo updateMatches (evita pisarse)
    const updatedMatches = matches.map((m) => {
      if (m.id === matchCourt1.id) {
        return {
          ...m,
          scoreTeam1: s1.team1,
          scoreTeam2: s1.team2,
          status: "completed",
          completedAt: nowIso,
        };
      }
      if (m.id === matchCourt2.id) {
        return {
          ...m,
          scoreTeam1: s2.team1,
          scoreTeam2: s2.team2,
          status: "completed",
          completedAt: nowIso,
        };
      }
      return m;
    });

    // Guardar en torneo (una sola escritura)
    await updateDoc(doc(db, "tournaments", tournamentId), {
      matches: updatedMatches,
    });

    setMatches(updatedMatches);

    // (Opcional) Luego ya normalizamos la siguiente tanda con el estado actualizado
    try {
      const pendingAfter = updatedMatches.filter((m) => m.status === "pending");
      const normalized = maxCourts >= 2 ? normalizeTopTwoPending(pendingAfter) : pendingAfter;

      const changed =
        normalized.length === pendingAfter.length &&
        normalized.some((m, i) => m.id !== pendingAfter[i]?.id);

      if (changed) {
        // IMPORTANTE: savePendingOrder usa "matches" por dentro,
        // así que hay que pasarle primero el estado correcto:
        // aquí usamos directamente updatedMatches como base
        const nonPending = updatedMatches.filter((m) => m.status !== "pending");
        const reorderedAll = [...nonPending, ...normalized];

        await updateDoc(doc(db, "tournaments", tournamentId), {
          matches: reorderedAll,
        });
        setMatches(reorderedAll);
      }
    } catch (e) {
      console.warn("No se pudo normalizar la siguiente tanda:", e);
    }

    alert("Marcadores guardados (ambas canchas).");

    setScoreTouched({ 1: false, 2: false });
  } catch (err) {
    console.error("Error guardando ambos resultados:", err);
    alert("No se pudieron guardar ambos resultados.");
  } finally {
    setSavingResult(false);
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
// Reacomodar partidos pendientes (cola)
// -----------------------------------
    const savePendingOrder = async (orderedPendingMatches) => {
      setReorderingPending(true);
      try {
        // Mantén en su orden todos los NO pendientes
        const nonPending = matches.filter((m) => m.status !== "pending");

        // Reemplaza TODOS los pendientes por el nuevo orden
        const updatedMatches = [...nonPending, ...orderedPendingMatches];

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
    const indexInSorted = list.findIndex((m) => m.id === matchId);
    if (indexInSorted === -1) return;

    const pinnedCount = maxCourts >= 1 ? maxCourts : 0; // índices 0..pinnedCount-1 son las canchas
    const isLast = indexInSorted >= list.length - 1;

    if (direction === "up") {
      if (indexInSorted <= pinnedCount) return; // no cruzar las canchas
      const newIndex = indexInSorted - 1;
      const [item] = list.splice(indexInSorted, 1);
      list.splice(newIndex, 0, item);
    } else if (direction === "down") {
      if (isLast) return;
      const newIndex = indexInSorted + 1;
      const [item] = list.splice(indexInSorted, 1);
      list.splice(newIndex, 0, item);
    } else {
      return;
    }

    await savePendingOrder(list);
  };

  // -----------------------------------
  // Generar partido inteligente (global)
  // -----------------------------------
  const getPlayerMatchCount = (playerId) => {
    let count = 0;
    matches.forEach((m) => {
      if (m.status !== "completed" && m.status !== "pending") return;
      const involved = [...(m.team1 || []), ...(m.team2 || [])];
      if (involved.includes(playerId)) count++;
    });
    return count;
  };

  const generateSmartMatchInternal = async () => {
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

    const teamKeyLocal = (team) => [...team].sort().join("|");
    const matchupKeyLocal = (teamA, teamB) => {
      const ta = teamKeyLocal(teamA);
      const tb = teamKeyLocal(teamB);
      return ta < tb ? `${ta}::${tb}` : `${tb}::${ta}`;
    };

    matches.forEach((m) => {
      const t1 = m.team1 || [];
      const t2 = m.team2 || [];
      if (t1.length === 2) existingTeams.add(teamKeyLocal(t1));
      if (t2.length === 2) existingTeams.add(teamKeyLocal(t2));
      if (t1.length === 2 && t2.length === 2) {
        existingMatchups.add(matchupKeyLocal(t1, t2));
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

      const now = Date.now();
      let newMatches = [...matches];

      if (maxCourts >= 2 && sorted.length >= 8) {
        // 👉 2 canchas: tomamos a los 8 que menos han jugado
        const base8 = sorted.slice(0, 8);

        // Mezclamos un poco esos 8 para evitar bloques fijos
        const shuffled8 = [...base8].sort(() => Math.random() - 0.5);

        const group1 = shuffled8.slice(0, 4);
        const group2 = shuffled8.slice(4, 8);

        const best1 = buildBestTeams(
          group1,
          existingTeams,
          existingMatchups,
          playersMap
        );
        const best2 = buildBestTeams(
          group2,
          existingTeams,
          existingMatchups,
          playersMap
        );

        const newMatch1 = {
          id: `match-${now}-${Math.random().toString(36).slice(2, 6)}`,
          team1: best1.team1,
          team2: best1.team2,
          scoreTeam1: null,
          scoreTeam2: null,
          status: "pending",
          createdAt: new Date(now).toISOString(),
          type: "smart",
        };

        const newMatch2 = {
          id: `match-${now + 1}-${Math.random().toString(36).slice(2, 6)}`,
          team1: best2.team1,
          team2: best2.team2,
          scoreTeam1: null,
          scoreTeam2: null,
          status: "pending",
          createdAt: new Date(now + 1).toISOString(),
          type: "smart",
        };

        newMatches = [...matches, newMatch1, newMatch2];
      } else {
        // 👉 1 cancha: tomamos un pool de hasta 6 y mezclamos
        const candidateCount = Math.min(sorted.length, 6);
        const pool = sorted.slice(0, candidateCount);
        const shuffled = [...pool].sort(() => Math.random() - 0.5);
        const base4 = shuffled.slice(0, 4);

        const best = buildBestTeams(
          base4,
          existingTeams,
          existingMatchups,
          playersMap
        );

        const newMatch = {
          id: `match-${now}-${Math.random().toString(36).slice(2, 8)}`,
          team1: best.team1,
          team2: best.team2,
          scoreTeam1: null,
          scoreTeam2: null,
          status: "pending",
          createdAt: new Date(now).toISOString(),
          type: "smart",
        };

        newMatches = [...matches, newMatch];
      }

    setSavingNewMatch(true);
    try {
      await updateDoc(doc(db, "tournaments", tournamentId), {
        matches: newMatches,
      });
      setMatches(newMatches);
      if (maxCourts >= 2 && sorted.length >= 8) {
        alert("Se crearon 2 partidos inteligentes.");
      } else {
        alert("Partido inteligente creado.");
      }
    } catch (err) {
      console.error("Error creando partido inteligente:", err);
      alert("No se pudo crear el partido.");
    } finally {
      setSavingNewMatch(false);
    }
  };

  const generateSmartMatch = () => {
    generateSmartMatchInternal();
  };

  // -----------------------------------
  // Mover partido pendiente directamente a cancha
  // (si hay conflicto de jugadores en otra cancha -> modal)
  // -----------------------------------
  const handleSendPendingToCourt = async (matchId, courtIndex) => {
    const target = sortedPendingMatches.find((m) => m.id === matchId);
    if (!target) return;

    if (maxCourts >= 2) {
      const otherMatch = courtIndex === 1 ? matchCourt2 : matchCourt1;
      if (otherMatch) {
        const targetPlayers = new Set([
          ...(target.team1 || []),
          ...(target.team2 || []),
        ]);
        const otherPlayers = new Set([
          ...(otherMatch.team1 || []),
          ...(otherMatch.team2 || []),
        ]);

        const conflicts = [...targetPlayers].filter((p) =>
          otherPlayers.has(p)
        );

        if (conflicts.length > 0) {
          // Buscar sugerencia sin conflicto
          let suggestedMatch = null;
          for (const cand of sortedPendingMatches) {
            if (cand.id === target.id) continue;
            if (otherMatch && cand.id === otherMatch.id) continue;

            const candPlayers = [
              ...(cand.team1 || []),
              ...(cand.team2 || []),
            ];
            const candConflicts = candPlayers.some((pid) =>
              otherPlayers.has(pid)
            );
            if (!candConflicts) {
              suggestedMatch = cand;
              break;
            }
          }

          setConflictModal({
            courtIndex,
            triedMatch: target,
            suggestedMatch,
            conflictPlayers: conflicts,
          });
          return;
        }
      }
    }

    const current1 = matchCourt1;
    const current2 = matchCourt2;

    let others = sortedPendingMatches.filter(
      (m) =>
        m.id !== matchId &&
        m.id !== (current1 && current1.id) &&
        m.id !== (current2 && current2.id)
    );

    let newOrder = [];

    if (courtIndex === 1) {
      newOrder.push(target);
      if (maxCourts >= 2 && current2 && current2.id !== matchId) {
        newOrder.push(current2);
      }
      newOrder = newOrder.concat(others);
      if (current1 && current1.id !== matchId) {
        newOrder.push(current1); // se baja a la cola
      }
    } else {
      if (current1) {
        newOrder.push(current1);
      } else {
        newOrder.push(target);
      }
      if (!current1) {
        others = others.filter((m) => m.id !== target.id);
      }

      newOrder.push(target); // cancha 2
      newOrder = newOrder.concat(others);
      if (current2 && current2.id !== matchId) {
        newOrder.push(current2); // baja a cola
      }
    }

    await savePendingOrder(newOrder);
  };

  // -----------------------------------
  // Partidos personalizados
  // -----------------------------------
  const toggleCustomPlayer = (pid) => {
    setCustomSelected((prev) => {
      if (prev.includes(pid)) {
        return prev.filter((id) => id !== pid);
      }
      if (prev.length >= 4) return prev;
      return [...prev, pid];
    });
  };

  const createCustomMatch = async () => {
    if (customSelected.length !== 4) {
      alert("Selecciona exactamente 4 jugadores para crear un partido.");
      return;
    }

    const existingTeams = new Set();
    const existingMatchups = new Set();

    const teamKeyLocal = (team) => [...team].sort().join("|");
    const matchupKeyLocal = (teamA, teamB) => {
      const ta = teamKeyLocal(teamA);
      const tb = teamKeyLocal(teamB);
      return ta < tb ? `${ta}::${tb}` : `${tb}::${ta}`;
    };

    matches.forEach((m) => {
      const t1 = m.team1 || [];
      const t2 = m.team2 || [];
      if (t1.length === 2) existingTeams.add(teamKeyLocal(t1));
      if (t2.length === 2) existingTeams.add(teamKeyLocal(t2));
      if (t1.length === 2 && t2.length === 2) {
        existingMatchups.add(matchupKeyLocal(t1, t2));
      }
    });

    const best = buildBestTeams(
      customSelected,
      existingTeams,
      existingMatchups,
      playersMap
    );

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
      setShowCustom(false);
    } catch (err) {
      console.error("Error creando partido personalizado:", err);
      alert("No se pudo crear el partido.");
    } finally {
      setSavingNewMatch(false);
    }
  };

  // -----------------------------------
  // Render
  // -----------------------------------
  if (loading && !tournament) {
    return (
      <div
        style={{
          padding: "1rem",
          fontSize: "0.9rem",
          color: "var(--muted)",
        }}
      >
        Cargando información del torneo...
      </div>
    );
  }

  if (!loading && !tournament) {
    return (
      <div
        style={{
          padding: "1rem",
          fontSize: "0.9rem",
          color: "var(--muted)",
        }}
      >
        Torneo no encontrado.
      </div>
    );
  }

  const completedCount = matches.filter(
    (m) => m.status === "completed"
  ).length;
  const pendingCount = pendingMatches.length;
  const isTournamentCompleted = tournament.status === "completed";

  // Preview partido personalizado (4 seleccionados)
  let customPreviewTeam1 = [];
  let customPreviewTeam2 = [];
  let customPreviewLabel = "";

  if (customSelected.length === 4) {
    const existingTeams = new Set();
    const existingMatchups = new Set();

    const teamKeyLocal = (team) => [...team].sort().join("|");
    const matchupKeyLocal = (teamA, teamB) => {
      const ta = teamKeyLocal(teamA);
      const tb = teamKeyLocal(teamB);
      return ta < tb ? `${ta}::${tb}` : `${tb}::${ta}`;
    };

    matches.forEach((m) => {
      const t1 = m.team1 || [];
      const t2 = m.team2 || [];
      if (t1.length === 2) existingTeams.add(teamKeyLocal(t1));
      if (t2.length === 2) existingTeams.add(teamKeyLocal(t2));
      if (t1.length === 2 && t2.length === 2) {
        existingMatchups.add(matchupKeyLocal(t1, t2));
      }
    });

    const best = buildBestTeams(
      customSelected,
      existingTeams,
      existingMatchups,
      playersMap
    );
    customPreviewTeam1 = best.team1;
    customPreviewTeam2 = best.team2;

    if (best.diff < 0.3) customPreviewLabel = "Matchup muy equilibrado ✅";
    else if (best.diff < 0.8)
      customPreviewLabel = "Matchup bastante equilibrado 👍";
    else if (best.diff < 1.5)
      customPreviewLabel = "Matchup algo desequilibrado ⚠️";
    else customPreviewLabel = "Matchup muy desequilibrado ❗";
  }

  // Helper: jugadores en horizontal con avatar grande
  const renderTeamPlayersRow = (playerIds) => (
    <div
      style={{
        display: "flex",
        flexWrap: "nowrap",          
        justifyContent: "center",
        gap: "0.6rem",
        maxWidth: "100%",
        overflow: "hidden",
      }}
    >
      {playerIds.map((pid) => {
        const p = getPlayerDisplay(pid);
        return (
          <div
            key={pid}
            style={{
              display: "flex",
              flexDirection: "column",
              alignItems: "center",
              gap: "0.15rem",
              minWidth: 64,          
            }}
          >
            <div
              style={{
                width: 70,
                height: 70,
                borderRadius: "999px",
                overflow: "hidden",
                background: p.avatar
                  ? "var(--bg-elevated)"
                  : "radial-gradient(circle at 30% 20%, #4084d6ff, #174ab8ff)",
                boxShadow: p.avatar
                  ? "0 0 0 1px rgba(15, 23, 42, 0.29)"
                  : "0 0 0 1px rgba(37, 100, 235, 0.42)",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                fontSize: "1.5rem",
                fontWeight: 600,
                color: p.avatar ? "inherit" : "#ffffff",
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
                fontSize: "0.78rem",
                maxWidth: 100,
                overflow: "hidden",
                textOverflow: "ellipsis",
                whiteSpace: "nowrap",
                textAlign: "center",
                fontWeight: 600,
                color: "var(--fg)",
              }}
            >
              {shortName(p.name)}
            </span>
          </div>
        );
      })}
    </div>
  );

  // Helper: render cancha
  const renderCourt = (courtIndex, match) => {
    const courtScores = scores[courtIndex] || { team1: 0, team2: 0 };

    return (
      <div
        style={{
          paddingTop: courtIndex === 1 ? "0.5rem" : "0.75rem",
          marginTop: courtIndex === 1 ? 0 : "0.75rem",
          borderTop: courtIndex === 1 ? "none" : "1px solid var(--border)",
        }}
      >
        <p
          style={{
            margin: 0,
            fontSize: "0.8rem",
            color: "var(--muted)",
            display: "flex",
            alignItems: "center",
            gap: "0.25rem",
          }}
        >
          <Icon name="court" size={14} color="var(--muted)" />
          <span>Partido en cancha {courtIndex}</span>
        </p>

        {!match ? (
          <p
            style={{
              margin: "0.3rem 0 0",
              fontSize: "0.8rem",
              color: "var(--muted)",
            }}
          >
            No hay partido asignado a esta cancha.
          </p>
        ) : (
          <>
            {/* Jugadores en horizontal */}
            <div
              style={{
                marginTop: "0.6rem",
              }}
            >
              <div
                style={{
                  display: "flex",
                  alignItems: "flex-start",
                  justifyContent: "space-between",
                  gap: "1rem",
                }}
              >
                <div
                  style={{
                    flex: 1,
                    minWidth: 0,
                  }}
                >
                  {renderTeamPlayersRow(match.team1 || [])}
                </div>

                <div
                  style={{
                    minWidth: 30,
                    textAlign: "center",
                    fontSize: "0.85rem",
                    fontWeight: 700,
                    color: "var(--muted)",
                    marginTop: "1.2rem",
                  }}
                >
                  VS
                </div>

                <div
                  style={{
                    flex: 1,
                    minWidth: 0,
                  }}
                >
                  {renderTeamPlayersRow(match.team2 || [])}
                </div>
              </div>
            </div>

            {/* Marcador grande */}
            <div
              style={{
                marginTop: "0.6rem",
                textAlign: "center",
              }}
            >
              <div
                style={{
                  fontSize: "2rem",
                  fontWeight: 800,
                }}
              >
                {courtScores.team1} - {courtScores.team2}
              </div>
            </div>

            {/* Inputs marcador */}
            <div
              style={{
                marginTop: "0.5rem",
                display: "flex",
                flexDirection: "column",
                gap: "0.4rem",
              }}
            >
              <div
                style={{
                  display: "flex",
                  flexWrap: "wrap",
                  gap: "0.6rem",
                  justifyContent: "center",
                }}
              >
                <ScoreNumberInput
                  label="Equipo 1"
                  value={courtScores.team1}
                  onChange={(val) => handleScoreChange(courtIndex, 1, val)}
                />
                <ScoreNumberInput
                  label="Equipo 2"
                  value={courtScores.team2}
                  onChange={(val) => handleScoreChange(courtIndex, 2, val)}
                />
              </div>

              <div
                style={{
                  display: "flex",
                  flexWrap: "wrap",
                  gap: "0.5rem",
                  justifyContent: "center",
                  marginTop: "0.1rem",
                }}
              >
                {(() => {
                  const otherCourt = courtIndex === 1 ? 2 : 1;
                  const twoCourtsActive = maxCourts >= 2 && matchCourt1 && matchCourt2;
                  const bothReady = scoreTouched[1] && scoreTouched[2];

                  return (
                    <button
                      type="button"
                      onClick={() => {
                        if (twoCourtsActive) {
                          handleSaveBothCourtsResults();
                        } else {
                          handleSaveResultForCourt(courtIndex);
                        }
                      }}
                      disabled={savingResult || (twoCourtsActive && !bothReady)}
                      style={{
                        borderRadius: "0.9rem",
                        border: "none",
                        padding: "0.5rem 0.9rem",
                        background:
                          twoCourtsActive && scoreTouched[courtIndex] && !bothReady
                            ? "#16a34a"
                            : "var(--accent)",
                        fontSize: "0.8rem",
                        cursor: savingResult ? "default" : "pointer",
                        fontWeight: 600,
                        color: "#ffffff",
                        boxShadow: "0 0 0 1px rgba(15,23,42,0.2)",
                        opacity: savingResult ? 0.8 : 1,
                      }}
                    >
                    {savingResult
                      ? "Guardando..."
                      : twoCourtsActive
                        ? bothReady
                          ? "Guardar resultado"
                          : scoreTouched[courtIndex]
                            ? "Listo"
                            : "Ingresa resultado"
                        : "Guardar resultado"}
                    </button>
                  );
                })()}

                <button
                  type="button"
                  onClick={() => handleMarkDrawForCourt(courtIndex)}
                  disabled={savingResult}
                  style={{
                    borderRadius: "0.9rem",
                    border: "1px solid var(--border)",
                    padding: "0.5rem 0.8rem",
                    background: "transparent",
                    fontSize: "0.8rem",
                    color: "var(--muted)",
                    cursor: savingResult ? "default" : "pointer",
                  }}
                >
                  Marcar empate (2–2)
                </button>
              </div>
            </div>
          </>
        )}
      </div>
    );
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
        {/* HEADER */}
        <section
          style={{
            borderRadius: "1.1rem",
            padding: "0.9rem 1rem 0.75rem 1rem",
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

          <div
            style={{
              marginTop: "0.6rem",
              display: "flex",
              flexWrap: "wrap",
              alignItems: "center",
              justifyContent: "space-between",
              gap: "0.6rem",
              fontSize: "0.78rem",
            }}
          >

            <button
              type="button"
              onClick={() => navigate(`/torneos/${tournament.id}`)}
              style={{
                borderRadius: "999px",
                border: "1px solid var(--border)",
                padding: "0.35rem 0.8rem",
                background: "var(--bg-elevated)",
                fontSize: "0.78rem",
                cursor: "pointer",
                display: "flex",
                alignItems: "center",
                gap: "0.35rem",
                whiteSpace: "nowrap",
                color: "var(--fg)",
              }}
            >
              <Icon name="arrow-left" size={14} />
              <span>Ver detalles del torneo</span>
            </button>
          </div>
        </section>

        {/* PARTIDOS EN CANCHA */}
        <section className="card">
          <h2
            style={{
              margin: 0,
              fontSize: "0.95rem",
            }}
          >
            Partidos en cancha
          </h2>

          {maxCourts >= 1 && renderCourt(1, matchCourt1)}
          {maxCourts >= 2 && renderCourt(2, matchCourt2)}

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
                          background: p.avatar
                            ? "var(--bg-elevated)"
                            : "radial-gradient(circle at 30% 20%, #4084d6ff, #174ab8ff)",
                          boxShadow: p.avatar
                            ? "0 0 0 1px rgba(15,23,42,0.5)"
                            : "0 0 0 1px rgba(20, 65, 160, 0.7)",
                          display: "flex",
                          alignItems: "center",
                          justifyContent: "center",
                          fontSize: "0.75rem",
                          fontWeight: 600,
                          color: p.avatar ? "inherit" : "#ffffff",
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
                        {shortName(p.name)}
                      </span>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        </section>

        {/* NUEVOS PARTIDOS */}
        <section>
          <h2
            style={{
              margin: 0,
              marginBottom: "0.45rem",
              fontSize: "0.95rem",
            }}
          >
            Nuevos partidos
          </h2>
          <div
            style={{
              display: "flex",
              flexWrap: "wrap",
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
            <section
              className="card"
              style={{
                marginTop: "0.1rem",
              }}
            >
              <h3
                style={{
                  margin: 0,
                  marginBottom: "0.4rem",
                  fontSize: "0.9rem",
                }}
              >
                Selecciona 4 jugadores
              </h3>
              <p
                style={{
                  margin: 0,
                  marginBottom: "0.5rem",
                  fontSize: "0.78rem",
                  color: "var(--muted)",
                }}
              >
                Toca para seleccionar hasta 4 jugadores. Cuando tengas 4, verás
                cómo quedaría el partido.
              </p>

              <div
                style={{
                  display: "flex",
                  flexWrap: "wrap",
                  gap: "0.4rem",
                }}
              >
                {allTournamentPlayers.map((pid) => {
                  const p = getPlayerDisplay(pid);
                  const selected = customSelected.includes(pid);
                  return (
                    <button
                      key={pid}
                      type="button"
                      onClick={() => toggleCustomPlayer(pid)}
                      style={{
                        display: "flex",
                        alignItems: "center",
                        gap: "0.3rem",
                        borderRadius: "999px",
                        padding: "0.25rem 0.55rem",
                        border: selected
                          ? "1px solid var(--accent)"
                          : "1px solid var(--border)",
                        background: selected
                          ? "var(--accent-soft)"
                          : "var(--bg)",
                        fontSize: "0.78rem",
                        cursor: "pointer",
                      }}
                    >
                      <div
                        style={{
                          width: 22,
                          height: 22,
                          borderRadius: "999px",
                          overflow: "hidden",
                          background: p.avatar
                            ? "var(--bg-elevated)"
                            : "radial-gradient(circle at 30% 20%, #4084d6ff, #174ab8ff)",
                          boxShadow: p.avatar
                            ? "0 0 0 1px rgba(15,23,42,0.5)"
                            : "0 0 0 1px rgba(20, 65, 160, 0.7)",
                          display: "flex",
                          alignItems: "center",
                          justifyContent: "center",
                          fontSize: "0.75rem",
                          fontWeight: 600,
                          color: p.avatar ? "inherit" : "#ffffff",
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
                            fontWeight: 500,
                          }}
                        >
                          {shortName(p.name)}
                        </span>
                    </button>
                  );
                })}
              </div>

              {customSelected.length === 4 && (
                <div
                  style={{
                    marginTop: "0.8rem",
                    borderTop: "1px solid var(--border)",
                    paddingTop: "0.55rem",
                  }}
                >
                  <p
                    style={{
                      margin: 0,
                      marginBottom: "0.45rem",
                      fontSize: "0.8rem",
                      color: "var(--muted)",
                    }}
                  >
                    Vista previa del partido:
                  </p>
                  <div
                    style={{
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "space-between",
                      gap: "0.8rem",
                    }}
                  >
                    {/* Equipo 1 */}
                    <div
                      style={{
                        flex: 1,
                        minWidth: 0,
                      }}
                    >
                      {renderTeamPlayersRow(customPreviewTeam1)}
                    </div>

                    {/* VS */}
                    <div
                      style={{
                        minWidth: 30,
                        textAlign: "center",
                        fontSize: "0.9rem",
                        fontWeight: 700,
                        color: "var(--muted)",
                      }}
                    >
                      VS
                    </div>

                    {/* Equipo 2 */}
                    <div
                      style={{
                        flex: 1,
                        minWidth: 0,
                      }}
                    >
                      {renderTeamPlayersRow(customPreviewTeam2)}
                    </div>
                  </div>

                  {customPreviewLabel && (
                    <p
                      style={{
                        margin: 0,
                        marginTop: "0.4rem",
                        fontSize: "0.78rem",
                        color: "var(--muted)",
                      }}
                    >
                      {customPreviewLabel}
                    </p>
                  )}
                </div>
              )}

              <div
                style={{
                  marginTop: "0.6rem",
                  display: "flex",
                  flexWrap: "wrap",
                  gap: "0.5rem",
                }}
              >
                <button
                  type="button"
                  onClick={createCustomMatch}
                  disabled={savingNewMatch}
                  style={{
                    borderRadius: "0.8rem",
                    border: "none",
                    padding: "0.35rem 0.75rem",
                    background:
                      "linear-gradient(135deg, var(--accent), rgba(59,130,246,0.9))",
                    fontSize: "0.8rem",
                    cursor: savingNewMatch ? "default" : "pointer",
                    fontWeight: 600,
                    color: "#ffffff",
                    boxShadow: "0 0 0 1px rgba(15,23,42,0.2)",
                  }}                >
                  {savingNewMatch ? "Creando..." : "Crear partido"}
                </button>
              </div>
            </section>
          )}
        </section>

        {/* PARTIDOS PENDIENTES */}
        <section>
          <div
            style={{
              display: "flex",
              alignItems: "flex-end",
              justifyContent: "space-between",
              gap: "0.5rem",
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

            {displayPendingMatches.length > 0 && (
              <span
                style={{
                  fontSize: "0.7rem",
                  color: "var(--muted)",
                  textAlign: "right",
                }}
              >
                Ajusta la cola aquí. 
              </span>
            )}
          </div>

          {displayPendingMatches.length === 0 ? (
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
              {displayPendingMatches.map((m) => {
                const indexInSorted = sortedPendingMatches.findIndex(
                  (x) => x.id === m.id
                );
                const pinnedCount = maxCourts >= 1 ? maxCourts : 0;
                const canMoveUp = indexInSorted > pinnedCount;
                const canMoveDown =
                  indexInSorted >= 0 &&
                  indexInSorted < sortedPendingMatches.length - 1;
                const queuePosition =
                  indexInSorted >= pinnedCount
                    ? indexInSorted - pinnedCount + 1
                    : 1;

                return (
                  <div
                    key={m.id}
                    className="card"
                    style={{
                      padding: "0.55rem 0.7rem",
                    }}
                  >
                    <div
                      style={{
                        display: "flex",
                        alignItems: "center",
                        gap: "0.5rem",
                      }}
                    >
                      {/* Equipo 1: pegado a la izquierda */}
                      <div
                        style={{
                          flex: 1,
                          minWidth: 0,
                          textAlign: "left",
                          paddingRight: "0.1rem",
                        }}
                      >
                        {(m.team1 || []).map((pid) => {
                          const p = getPlayerDisplay(pid);
                          return (
                            <p
                              key={pid}
                              style={{
                                margin: 0,
                                fontSize: "0.82rem",
                                fontWeight: 600,
                                overflow: "hidden",
                                textOverflow: "ellipsis",
                                whiteSpace: "nowrap",
                              }}
                            >
                              {shortName(p.name)}
                            </p>
                          );
                        })}
                      </div>

                      {/* Controles al centro (misma altura que nombres) */}
                      <div
                        style={{
                          display: "flex",
                          flexDirection: "column",
                          alignItems: "center",
                          gap: "0.25rem",
                          minWidth: 150,
                          flexShrink: 0,
                        }}
                      >
                        {/* Botones ↑ 🗑 ↓ */}
                        <div
                          style={{
                            display: "flex",
                            gap: "0.3rem",
                            justifyContent: "center",
                          }}
                        >
                          <button
                            type="button"
                            onClick={(e) => {
                              e.stopPropagation();
                              handleMovePendingMatch(m.id, "up");
                            }}
                            disabled={reorderingPending || !canMoveUp}
                            style={{
                              minWidth: 36,
                              height: 36,
                              borderRadius: "999px",
                              border: "1px solid rgba(34,197,94,0.7)",
                              background: "rgba(22,163,74,0.12)",
                              fontSize: "0.9rem",
                              cursor:
                                reorderingPending || !canMoveUp
                                  ? "default"
                                  : "pointer",
                              color: "#16a34a",
                            }}
                          >
                            ↑
                          </button>
                          <button
                            type="button"
                            onClick={(e) =>
                              handleDeletePendingMatch(m.id, e)
                            }
                            style={{
                              minWidth: 36,
                              height: 36,
                              borderRadius: "999px",
                              border: "1px solid rgba(248,113,113,0.8)",
                              background: "rgba(248,113,113,0.15)",
                              fontSize: "0.9rem",
                              cursor: "pointer",
                              color: "#ef4444",
                            }}
                          >
                            🗑
                          </button>
                          <button
                            type="button"
                            onClick={(e) => {
                              e.stopPropagation();
                              handleMovePendingMatch(m.id, "down");
                            }}
                            disabled={reorderingPending || !canMoveDown}
                            style={{
                              minWidth: 36,
                              height: 36,
                              borderRadius: "999px",
                              border: "1px solid rgba(249,115,22,0.8)",
                              background: "rgba(249,115,22,0.15)",
                              fontSize: "0.9rem",
                              cursor:
                                reorderingPending || !canMoveDown
                                  ? "default"
                                  : "pointer",
                              color: "#ea580c",
                            }}
                          >
                            ↓
                          </button>
                        </div>
                      </div>

                      {/* Equipo 2: pegado a la derecha */}
                      <div
                        style={{
                          flex: 1,
                          minWidth: 0,
                          textAlign: "right",
                          paddingLeft: "0.1rem",
                        }}
                      >
                        {(m.team2 || []).map((pid) => {
                          const p = getPlayerDisplay(pid);
                          return (
                            <p
                              key={pid}
                              style={{
                                margin: 0,
                                fontSize: "0.82rem",
                                fontWeight: 600,
                                overflow: "hidden",
                                textOverflow: "ellipsis",
                                whiteSpace: "nowrap",
                              }}
                            >
                              {shortName(p.name)}
                            </p>
                          );
                        })}
                      </div>
                    </div>

                    {/* Fila inferior: tipo de partido, botones de cancha y posición en cola */}
                    <div
                      style={{
                        marginTop: "0.25rem",
                        display: "flex",
                        alignItems: "center",
                        fontSize: "0.7rem",
                        color: "var(--muted)",
                        gap: "0.4rem",
                      }}
                    >
                      {/* Izquierda: tipo (texto corto para ahorrar espacio) */}
                      <span
                        style={{
                          flex: 1,
                          textAlign: "left",
                        }}
                      >
                        {m.type === "smart"
                          ? "Inteligente"
                          : m.type === "custom"
                          ? "Personalizado"
                          : "Partido"}
                      </span>

                      {/* Centro: botones de cancha, realmente centrados */}
                      <div
                        style={{
                          display: "flex",
                          alignItems: "center",
                          justifyContent: "center",
                          gap: "0.3rem",
                          flexShrink: 0,
                        }}
                      >
                        <button
                          type="button"
                          onClick={() => handleSendPendingToCourt(m.id, 1)}
                          style={{
                            borderRadius: "999px",
                            border: "none",
                            padding: "0.2rem 0.8rem",
                            background: "var(--accent)",
                            color: "#ffffff",
                            fontSize: "0.75rem",
                            fontWeight: 600,
                            cursor: "pointer",
                          }}
                        >
                          Cancha 1
                        </button>
                        {maxCourts >= 2 && (
                          <button
                            type="button"
                            onClick={() =>
                              handleSendPendingToCourt(m.id, 2)
                            }
                            style={{
                              borderRadius: "999px",
                              border: "none",
                              padding: "0.2rem 0.8rem",
                              background: "var(--accent)",
                              color: "#ffffff",
                              fontSize: "0.75rem",
                              fontWeight: 600,
                              cursor: "pointer",
                            }}
                          >
                            Cancha 2
                          </button>
                        )}
                      </div>

                      {/* Derecha: # en la cola */}
                      <span
                        style={{
                          flex: 1,
                          textAlign: "right",
                          whiteSpace: "nowrap",
                        }}
                      >
                        #{queuePosition} en la cola
                      </span>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </section>
      </div>

      {/* MODAL CONFLICTO JUGADORES EN DOS CANCHAS */}
      {conflictModal && (
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
          onClick={() => setConflictModal(null)}
        >
          <div
            className="card"
            style={{
              maxWidth: 360,
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
              Jugadores en dos canchas
            </h3>
            <p
              style={{
                margin: 0,
                marginBottom: "0.45rem",
                fontSize: "0.8rem",
                color: "var(--muted)",
              }}
            >
              El partido que intentas poner en la cancha{" "}
              <strong>{conflictModal.courtIndex}</strong> tiene jugadores que
              ya están jugando en la otra cancha:
            </p>

            <ul
              style={{
                margin: "0 0 0.5rem 0",
                paddingLeft: "1.1rem",
                fontSize: "0.8rem",
              }}
            >
              {conflictModal.conflictPlayers.map((pid) => {
                const p = getPlayerDisplay(pid);
                return <li key={pid}>{p.name}</li>;
              })}
            </ul>

            {conflictModal.suggestedMatch ? (
              <div
                style={{
                  marginBottom: "0.5rem",
                  fontSize: "0.8rem",
                }}
              >
                <p
                  style={{
                    margin: 0,
                    marginBottom: "0.25rem",
                    color: "var(--muted)",
                  }}
                >
                  Te sugerimos este partido para esa cancha:
                </p>
                <p
                  style={{
                    margin: 0,
                    fontWeight: 600,
                  }}
                >
                  {(conflictModal.suggestedMatch.team1 || [])
                    .map((pid) => getPlayerDisplay(pid).name)
                    .join(" & ")}{" "}
                  vs{" "}
                  {(conflictModal.suggestedMatch.team2 || [])
                    .map((pid) => getPlayerDisplay(pid).name)
                    .join(" & ")}
                </p>
              </div>
            ) : (
              <p
                style={{
                  margin: 0,
                  marginBottom: "0.5rem",
                  fontSize: "0.8rem",
                  color: "var(--muted)",
                }}
              >
                No encontramos otro partido pendiente sin jugadores repetidos en
                la otra cancha.
              </p>
            )}

            <div
              style={{
                display: "flex",
                flexWrap: "wrap",
                gap: "0.4rem",
                justifyContent: "flex-end",
                marginTop: "0.3rem",
              }}
            >
              <button
                type="button"
                onClick={() => setConflictModal(null)}
                style={{
                  borderRadius: "999px",
                  border: "1px solid var(--border)",
                  padding: "0.3rem 0.7rem",
                  background: "var(--bg)",
                  fontSize: "0.78rem",
                  cursor: "pointer",
                }}
              >
                Cancelar
              </button>

              {conflictModal.suggestedMatch && (
                <button
                  type="button"
                  onClick={() => {
                    const { courtIndex, suggestedMatch } = conflictModal;
                    setConflictModal(null);
                    handleSendPendingToCourt(suggestedMatch.id, courtIndex);
                  }}
                  style={{
                    borderRadius: "999px",
                    border: "1px solid var(--accent)",
                    padding: "0.3rem 0.7rem",
                    background: "var(--accent-soft)",
                    fontSize: "0.78rem",
                    cursor: "pointer",
                    fontWeight: 600,
                  }}
                >
                  Usar partido sugerido
                </button>
              )}

              <button
                type="button"
                onClick={() => {
                  setConflictModal(null);
                  generateSmartMatch();
                }}
                style={{
                  borderRadius: "999px",
                  border: "1px solid var(--accent)",
                  padding: "0.3rem 0.7rem",
                  background: "var(--accent-soft)",
                  fontSize: "0.78rem",
                  cursor: "pointer",
                  fontWeight: 600,
                }}
              >
                Crear partido inteligente
              </button>
            </div>

            <div
              style={{
                marginTop: "0.5rem",
                borderTop: "1px solid var(--border)",
                paddingTop: "0.4rem",
                fontSize: "0.75rem",
                color: "var(--muted)",
              }}
            >
              <p
                style={{
                  margin: 0,
                }}
              >
                El partido inteligente aparecerá en la lista de pendientes; luego
                puedes mandarlo a esta cancha cuando no tenga jugadores
                repetidos.
              </p>
            </div>
          </div>
        </div>
      )}
    </>
  );
}

// -----------------------------------
// Componente auxiliar: selector 0–4
// -----------------------------------
function ScoreNumberInput({ label, value, onChange }) {
  const options = Array.from({ length: TOTAL_POINTS + 1 }, (_, i) => i);

  return (
    <div
      style={{
        minWidth: 120,
      }}
    >
      <div
        style={{
          fontSize: "0.7rem",
          color: "var(--muted)",
          marginBottom: "0.2rem",
          textAlign: "center",
        }}
      >
        {label}
      </div>
      <div
        style={{
          borderRadius: "1rem",
          padding: "0.3rem 0.4rem",
          border: "1px solid var(--border)",
          background: "var(--bg-elevated)",
          display: "flex",
          flexWrap: "wrap",
          justifyContent: "center",
          gap: "0.25rem",
        }}
      >
        {options.map((opt) => {
          const active = value === opt;
          return (
          <button
            key={opt}
            type="button"
            onClick={() => onChange(opt)}
            style={{
              minWidth: 26,
              height: 26,
              borderRadius: "999px",
              border: active
                ? "1px solid var(--accent)"
                : "1px solid var(--border)",
              background: active ? "var(--accent)" : "transparent",
              fontSize: "0.8rem",
              fontWeight: 600,
              cursor: "pointer",
              color: active ? "#ffffff" : "var(--fg)",
            }}
          >
            {opt}
          </button>
          );
        })}
      </div>
    </div>
  );
}
