// src/utils/ranking.js
import BronceImg from "../assets/rangos/bronce.png";
import PlataImg from "../assets/rangos/plata.png";
import OroImg from "../assets/rangos/oro.png";
import PlatinoImg from "../assets/rangos/platino.png";
import DiamanteImg from "../assets/rangos/diamante.png";
import LeyendaImg from "../assets/rangos/leyenda.png";

// De peor a mejor
export const DIVISIONS = [
  "Bronce III",
  "Bronce II",
  "Bronce I",
  "Plata III",
  "Plata II",
  "Plata I",
  "Oro III",
  "Oro II",
  "Oro I",
  "Platino III",
  "Platino II",
  "Platino I",
  "Diamante",
  "Leyenda",
];

export function getDivisionIndex(rank) {
  const idx = DIVISIONS.indexOf(rank);
  return idx === -1 ? 0 : idx;
}

export function getNextDivision(rank) {
  const idx = getDivisionIndex(rank);
  if (idx >= DIVISIONS.length - 1) return DIVISIONS[DIVISIONS.length - 1];
  return DIVISIONS[idx + 1];
}

export function getPrevDivision(rank) {
  const idx = getDivisionIndex(rank);
  if (idx <= 0) return DIVISIONS[0];
  return DIVISIONS[idx - 1];
}

// Imagen para cada rango
export function getRankImage(rank) {
  if (!rank) return BronceImg;
  if (rank.startsWith("Bronce")) return BronceImg;
  if (rank.startsWith("Plata")) return PlataImg;
  if (rank.startsWith("Oro")) return OroImg;
  if (rank.startsWith("Platino")) return PlatinoImg;
  if (rank === "Diamante") return DiamanteImg;
  if (rank === "Leyenda") return LeyendaImg;
  return BronceImg;
}

// Familia del rango (para PL)
function getRankFamily(rank) {
  if (!rank) return "Bronce";
  if (rank.startsWith("Bronce")) return "Bronce";
  if (rank.startsWith("Plata")) return "Plata";
  if (rank.startsWith("Oro")) return "Oro";
  if (rank.startsWith("Platino")) return "Platino";
  if (rank === "Diamante") return "Diamante";
  if (rank === "Leyenda") return "Leyenda";
  return "Bronce";
}

// Config PL base por familia
const FAMILY_PL_CONFIG = {
  Bronce: { win: 24, loss: -10, drawLower: +10, drawHigher: -6, drawEven: +4 },
  Plata: { win: 20, loss: -12, drawLower: +8, drawHigher: -6, drawEven: +3 },
  Oro: { win: 16, loss: -14, drawLower: +7, drawHigher: -7, drawEven: +2 },
  Platino: { win: 12, loss: -16, drawLower: +6, drawHigher: -8, drawEven: +2 },
  Diamante: { win: 8, loss: -18, drawLower: +5, drawHigher: -9, drawEven: +1 },
  Leyenda: { win: 6, loss: -20, drawLower: +4, drawHigher: -10, drawEven: +1 },
};

/**
 * Calcula los PL que gana/pierde un jugador dado su rango y el contexto del partido.
 *
 * @param {Object} opts
 *  - rank: string (ej. "Oro II")
 *  - result: "win" | "loss" | "draw"
 *  - teamAvgIndex: promedio del índice de división de su equipo
 *  - oppAvgIndex: promedio del índice de división del otro equipo
 */
export function getPLDeltaForPlayer(opts) {
  const { rank, result, teamAvgIndex, oppAvgIndex } = opts;
  const family = getRankFamily(rank);
  const cfg = FAMILY_PL_CONFIG[family] || FAMILY_PL_CONFIG["Bronce"];

  if (result === "win") return cfg.win;
  if (result === "loss") return cfg.loss;

  // Empate: si tu equipo era de menor rango (peor posición en la lista),
  // ganas un poco; si era mayor rango, pierdes un poco; si eran parecidos, pequeño bonus.
  const diff = teamAvgIndex - oppAvgIndex; // negativo = éramos peor rango
  if (diff > 0.5) {
    // nosotros éramos de mejor rango
    return cfg.drawHigher;
  } else if (diff < -0.5) {
    // éramos de peor rango
    return cfg.drawLower;
  } else {
    return cfg.drawEven;
  }
}

/**
 * Aplica el resultado de un partido a los jugadores.
 *
 * @param {Object} opts
 *  - team1: array de userId
 *  - team2: array de userId
 *  - winner: 1 | 2 | 0 (0 = empate)
 *  - getUserRank: (userId) => { rank, leaguePoints }
 *  - onUpdate: (userId, newRank, newPL, deltaPL) => void
 */
export function applyMatchPLChanges(opts) {
  const { team1, team2, winner, getUserRank, onUpdate } = opts;

  const allPlayers = [...team1, ...team2];

  const getIdx = (userId) => {
    const info = getUserRank(userId);
    return getDivisionIndex(info?.rank || "Bronce III");
  };

  const team1Avg =
    team1.reduce((sum, id) => sum + getIdx(id), 0) / (team1.length || 1);
  const team2Avg =
    team2.reduce((sum, id) => sum + getIdx(id), 0) / (team2.length || 1);

  const isDraw = winner === 0;

  const getResultForPlayer = (userId) => {
    if (isDraw) return "draw";
    const inTeam1 = team1.includes(userId);
    const winningTeam = winner === 1 ? team1 : team2;
    const isWinner = winningTeam.includes(userId);
    return isWinner ? "win" : "loss";
  };

  for (const userId of allPlayers) {
    const current = getUserRank(userId) || {
      rank: "Bronce III",
      leaguePoints: 0,
    };
    const inTeam1 = team1.includes(userId);
    const teamAvg = inTeam1 ? team1Avg : team2Avg;
    const oppAvg = inTeam1 ? team2Avg : team1Avg;
    const result = getResultForPlayer(userId);

    const delta = getPLDeltaForPlayer({
      rank: current.rank,
      result,
      teamAvgIndex: teamAvg,
      oppAvgIndex: oppAvg,
    });

    let newPL = (current.leaguePoints || 0) + delta;
    let newRank = current.rank;

    // Ascensos / descensos
    while (newPL >= 100 && newRank !== "Leyenda") {
      newPL -= 100;
      newRank = getNextDivision(newRank);
    }
    while (newPL < 0 && newRank !== "Bronce III") {
      newRank = getPrevDivision(newRank);
      newPL = 80; // colchón al bajar
    }

    // Clamp PL
    if (newPL < 0) newPL = 0;
    if (newPL > 100) newPL = 100;

    onUpdate(userId, newRank, newPL, delta);
  }
}
