import React, { useEffect, useMemo, useState } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { doc, getDoc, onSnapshot, updateDoc } from "firebase/firestore";
import { db } from "../firebase/firebase";
import { useAuth } from "../context/AuthContext";
import Icon from "../components/common/Icon";
import { useToast } from "../context/ToastContext";

export default function FinalJugar() {
  const { id } = useParams();
  const navigate = useNavigate();
  const { user } = useAuth(); // Por si luego queremos validar creador, etc.
  const { showToast } = useToast();

  const [tournament, setTournament] = useState(null);
  const [playersInfo, setPlayersInfo] = useState({});
  const [loading, setLoading] = useState(true);
  const [loadingPlayers, setLoadingPlayers] = useState(false);
  const [activeFinalKey, setActiveFinalKey] = useState("A"); // "A" | "B"
  const [scoreByFinal, setScoreByFinal] = useState({});
  const [savingFinalKey, setSavingFinalKey] = useState(null); // "A" | "B"
  const [errorMsg, setErrorMsg] = useState("");
  const [successMsg, setSuccessMsg] = useState("");
  const [finalPulse, setFinalPulse] = useState(null);

  const resetMessages = () => {
    setErrorMsg("");
    setSuccessMsg("");
  };

  // Escuchar torneo
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

  // Helpers nombres / fotos
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

  const shortName = (fullName) => {
    if (!fullName) return "Jugador";

    const trimmed = fullName.trim();
    if (!trimmed) return "Jugador";

    const parts = trimmed.split(/\s+/);

    if (parts.length > 1) {
      const first = parts[0];
      const second = parts[1] && parts[1].length <= 6 ? parts[1] : null;

      let result = second ? `${first} ${second}` : first;
      if (result.length > 16) {
        result = result.slice(0, 16) + "…";
      }
      return result;
    }

    return trimmed.length > 12 ? trimmed.slice(0, 12) + "…" : trimmed;
  };

  // Finales del torneo (type === "final" o stage === "round_robin_final")
  const finals = useMemo(() => {
    if (!tournament?.matches) return [];

    return (tournament.matches || [])
      .filter(
        (m) => m.type === "final" || m.stage === "round_robin_final"
      )
      .sort((a, b) => {
        const aDate = a.createdAt || a.id || "";
        const bDate = b.createdAt || b.id || "";
        return aDate > bDate ? 1 : -1;
      });
  }, [tournament]);

  // Identificar Final A y Final B por label (robusto aunque cambie el orden)
  const finalA = useMemo(() => {
    if (!finals.length) return null;
    const labeled = finals.find((m) => m.label?.includes("Final A"));
    return labeled || finals[0];
  }, [finals]);

  const finalB = useMemo(() => {
    if (!finals.length) return null;
    const labeled = finals.find((m) => m.label?.includes("Final B"));
    if (labeled) return labeled;
    if (finals.length > 1) return finals[1];
    return null;
  }, [finals]);

  const hasTabs = !!finalA && !!finalB;

  // Inicializar / sincronizar scores locales
  useEffect(() => {
    const next = {};
    if (finalA) {
      next.A = {
        team1:
          scoreByFinal.A?.team1 ??
          (typeof finalA.scoreTeam1 === "number" ? finalA.scoreTeam1 : 0),
        team2:
          scoreByFinal.A?.team2 ??
          (typeof finalA.scoreTeam2 === "number" ? finalA.scoreTeam2 : 0),
      };
    }
    if (finalB) {
      next.B = {
        team1:
          scoreByFinal.B?.team1 ??
          (typeof finalB.scoreTeam1 === "number" ? finalB.scoreTeam1 : 0),
        team2:
          scoreByFinal.B?.team2 ??
          (typeof finalB.scoreTeam2 === "number" ? finalB.scoreTeam2 : 0),
      };
    }
    if (Object.keys(next).length > 0) {
      setScoreByFinal(next);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [finalA?.id, finalB?.id]);

  const handleScoreChange = (key, team, value) => {
    setScoreByFinal((prev) => ({
      ...prev,
      [key]: {
        ...(prev[key] || { team1: 0, team2: 0 }),
        [team]: value,
      },
    }));
  };

  const handleSaveFinal = async (key) => {
    resetMessages();

    const match = key === "A" ? finalA : finalB;
    if (!match || !tournament) return;

    const scores = scoreByFinal[key] || { team1: 0, team2: 0 };
    const s1 = Number(scores.team1 || 0);
    const s2 = Number(scores.team2 || 0);

    if (s1 === s2) {
      setErrorMsg("En la final debe haber un ganador (no se permite empate).");
      showToast("En la final debe haber un ganador (no se permite empate).", "warning");
      return;
    }

    setSavingFinalKey(key);

    try {
      const newMatches = (tournament.matches || []).map((m) =>
        m.id === match.id
          ? {
              ...m,
              scoreTeam1: s1,
              scoreTeam2: s2,
              status: "completed",
              completedAt: new Date().toISOString(),
            }
          : m
      );

      const ref = doc(db, "tournaments", tournament.id);
      await updateDoc(ref, { matches: newMatches });

      setSuccessMsg(
        key === "A"
          ? "Resultado de la Final A guardado."
          : "Resultado de la Final B guardado."
      );
      showToast(
        key === "A"
          ? "Resultado de la Final A guardado."
          : "Resultado de la Final B guardado.",
        "success"
      );
      setFinalPulse(key);
      setTimeout(() => setFinalPulse(null), 900);
    } catch (err) {
      console.error("Error guardando resultado de final:", err);
      setErrorMsg("No se pudo guardar el resultado de la final.");
      showToast("No se pudo guardar el resultado de la final.", "error");
    } finally {
      setSavingFinalKey(null);
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
        Cargando final...
      </div>
    );
  }

  if (!tournament) {
    return (
      <div
        style={{
          padding: "1.5rem 1rem",
          textAlign: "center",
        }}
      >
        <Icon name="trophy" size={40} color="var(--muted)" />
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

  const visibleKey = hasTabs ? activeFinalKey : finalA ? "A" : "B";
  const visibleMatch =
    visibleKey === "A" ? finalA : finalB || finalA || null;
  const visibleScores = scoreByFinal[visibleKey] || { team1: 0, team2: 0 };

  const renderTeamRow = (teamArray) => {
    const arr = Array.isArray(teamArray) ? teamArray : [];
    return (
      <div
        style={{
          display: "flex",
          gap: "0.6rem",
        }}
      >
        {arr.map((pid) => {
          const name = getPlayerName(pid);
          const avatar = getPlayerPhoto(pid);
          const hasPhoto = !!avatar;
          return (
            <div
              key={pid}
              style={{
                display: "flex",
                flexDirection: "column",
                alignItems: "center",
                gap: "0.25rem",
                minWidth: 70,
              }}
            >
              <div
                style={{
                  width: 56,
                  height: 56,
                  borderRadius: "999px",
                  overflow: "hidden",
                  background: hasPhoto
                    ? "var(--bg-elevated)"
                    : "radial-gradient(circle at 30% 20%, #60a5fa, #2563eb)",
                  boxShadow: hasPhoto
                    ? "0 4px 12px rgba(15,23,42,0.45)"
                    : "0 8px 20px rgba(37,99,235,0.7)",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  fontSize: "1.45rem",
                  fontWeight: 600,
                  color: hasPhoto ? "inherit" : "#ffffff",
                  flexShrink: 0,
                }}
              >
                {hasPhoto ? (
                  <img
                    src={avatar}
                    alt={name}
                    style={{
                      width: "100%",
                      height: "100%",
                      objectFit: "cover",
                    }}
                  />
                ) : (
                  getPlayerInitial(pid)
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
                {shortName(name)}
              </span>
            </div>
          );
        })}
      </div>
    );
  };

  const statusLabel = (match) => {
    if (!match) return "";
    if (match.status === "completed") return "Completada";
    if (match.status === "pending") return "Pendiente";
    return match.status || "";
  };

  const statusColor = (match) => {
    if (!match) return "var(--muted)";
    if (match.status === "completed") return "#22c55e";
    if (match.status === "pending") return "var(--accent)";
    return "var(--muted)";
  };

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
          background:
            "linear-gradient(140deg, rgba(15,23,42,0.96), rgba(30,64,175,0.96))",
          color: "#e5e7eb",
        }}
      >
        <button
          type="button"
          onClick={() => navigate(`/torneos/${tournament.id}`)}
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
            color: "rgba(209,213,219,0.9)",
            cursor: "pointer",
          }}
        >
          <Icon name="chevron-left" size={14} color="rgba(209,213,219,0.9)" />
          Detalles del torneo
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
              width: 46,
              height: 46,
              borderRadius: "1.2rem",
              background:
                "radial-gradient(circle at 30% 20%, #facc15, #f97316)",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              flexShrink: 0,
              boxShadow: "0 18px 40px rgba(15,23,42,0.9)",
            }}
          >
            <Icon name="trophy" size={26} color="#0f172a" />
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
              Final del Round Robin
            </h1>
            <p
              style={{
                margin: 0,
                marginTop: "0.15rem",
                fontSize: "0.78rem",
                color: "rgba(209,213,219,0.9)",
              }}
            >
              {tournament.name} • Creado: {createdDate}
            </p>

            <p
              style={{
                margin: 0,
                marginTop: "0.45rem",
                fontSize: "0.75rem",
                color: "rgba(209,213,219,0.9)",
              }}
            >
              Los marcadores de la final usan puntos de <strong>0 a 6</strong>.{" "}
              No se permiten empates.
            </p>
          </div>
        </div>
      </section>

      {/* Si no hay finales configuradas */}
      {finals.length === 0 && (
        <section
          style={{
            borderRadius: "1rem",
            border: "1px solid var(--border)",
            padding: "0.8rem 0.8rem",
            background: "var(--bg-elevated)",
          }}
        >
          <div
            style={{
              display: "flex",
              gap: "0.7rem",
              alignItems: "flex-start",
            }}
          >
            <Icon name="info" size={18} color="var(--accent)" />
            <div>
              <p
                style={{
                  margin: 0,
                  marginBottom: "0.35rem",
                  fontSize: "0.86rem",
                  fontWeight: 600,
                }}
              >
                No hay finales configuradas aún
              </p>
              <p
                style={{
                  margin: 0,
                  fontSize: "0.78rem",
                  color: "var(--muted)",
                }}
              >
                Ve a los detalles del torneo y usa el botón{" "}
                <strong>“Crear Final Round Robin”</strong> en la pestaña de
                Ranking para generar los partidos de final.
              </p>

              <button
                type="button"
                onClick={() => navigate(`/torneos/${tournament.id}`)}
                style={{
                  marginTop: "0.7rem",
                  borderRadius: "999px",
                  border: "none",
                  padding: "0.4rem 0.8rem",
                  background:
                    "linear-gradient(135deg, var(--accent), rgba(59,130,246,0.9))",
                  color: "#ffffff",
                  fontSize: "0.8rem",
                  fontWeight: 600,
                  cursor: "pointer",
                  display: "inline-flex",
                  alignItems: "center",
                  gap: "0.3rem",
                }}
              >
                <Icon name="tournament" size={14} color="#ffffff" />
                Ir a detalles del torneo
              </button>
            </div>
          </div>
        </section>
      )}

      {/* Tabs Final A / Final B */}
      {finals.length > 0 && finalB && (
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
            { key: "A", label: "Final A (puestos 1–4)" },
            { key: "B", label: "Final B (puestos 5–8)" },
          ].map((tab) => {
            const active = activeFinalKey === tab.key;
            return (
              <button
                key={tab.key}
                type="button"
                onClick={() => setActiveFinalKey(tab.key)}
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
      )}

      {/* Contenido de la final visible (sin card extra) */}
      {finals.length > 0 && visibleMatch && (
        <section
          style={{
            display: "flex",
            flexDirection: "column",
            gap: "0.7rem",
          }}
        >
          {/* Header pequeño del partido */}
          <div
            style={{
              display: "flex",
              justifyContent: "space-between",
              alignItems: "center",
              gap: "0.6rem",
            }}
          >
            <div
              style={{
                display: "flex",
                gap: "0.4rem",
                alignItems: "center",
              }}
            >
              <span
                style={{
                  borderRadius: "999px",
                  padding: "0.15rem 0.5rem",
                  fontSize: "0.75rem",
                  background:
                    visibleKey === "A"
                      ? "rgba(234,179,8,0.08)"
                      : "rgba(52,211,153,0.08)",
                  color:
                    visibleKey === "A"
                      ? "rgba(202,138,4,0.95)"
                      : "rgba(5,150,105,0.95)",
                  border:
                    visibleKey === "A"
                      ? "1px solid rgba(202,138,4,0.35)"
                      : "1px solid rgba(16,185,129,0.35)",
                }}
              >
                {visibleMatch.label ||
                  (visibleKey === "A"
                    ? "Final A (puestos 1–4)"
                    : "Final B (puestos 5–8)")}
              </span>
            </div>

            <span
              style={{
                fontSize: "0.75rem",
                padding: "0.15rem 0.45rem",
                borderRadius: "999px",
                border: "1px solid var(--border)",
                color: statusColor(visibleMatch),
              }}
            >
              {statusLabel(visibleMatch)}
            </span>
          </div>

          {/* Zona de cancha final (campo grande) */}
          <div
            className={`final-card ${finalPulse === visibleKey ? "final-card--saved" : ""}`}
            style={{
              borderRadius: "0.9rem",
              padding: "0.7rem 0.6rem",
              background:
                "radial-gradient(circle at 0% 0%, rgba(59,130,246,0.16), transparent 55%), radial-gradient(circle at 100% 100%, rgba(147,51,234,0.16), transparent 60%), var(--bg)",
              border: "1px solid rgba(148,163,184,0.35)",
              display: "flex",
              flexDirection: "column",
              gap: "0.7rem",
            }}
          >
            {/* Equipos + VS */}
            <div
              style={{
                display: "flex",
                alignItems: "center",
                justifyContent: "space-between",
                gap: "0.5rem",
              }}
            >
              {/* Equipo 1 */}
              <div
                style={{
                  flex: 1,
                  display: "flex",
                  justifyContent: "flex-start",
                }}
              >
                {renderTeamRow(visibleMatch.team1)}
              </div>

              {/* VS */}
              <div
                style={{
                  minWidth: 44,
                  textAlign: "center",
                }}
              >
                <div
                  style={{
                    borderRadius: "999px",
                    width: 44,
                    height: 44,
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                    fontSize: "0.7rem",
                    textTransform: "uppercase",
                    letterSpacing: "0.08em",
                    background:
                      "linear-gradient(135deg, rgba(15,23,42,0.96), rgba(30,64,175,0.96))",
                    color: "#e5e7eb",
                    boxShadow: "0 15px 40px rgba(15,23,42,0.8)",
                  }}
                >
                  VS
                </div>
              </div>

              {/* Equipo 2 */}
              <div
                style={{
                  flex: 1,
                  display: "flex",
                  justifyContent: "flex-end",
                }}
              >
                {renderTeamRow(visibleMatch.team2)}
              </div>
            </div>

            {/* Marcador grande */}
            <div
              style={{
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                gap: "0.5rem",
                marginTop: "0.2rem",
              }}
            >
              <div
                style={{
                  borderRadius: "0.9rem",
                  padding: "0.5rem 0.6rem",
                  minWidth: 70,
                  textAlign: "center",
                  background:
                    "linear-gradient(135deg, rgba(15,23,42,0.96), rgba(30,64,175,0.96))",
                  color: "#e5e7eb",
                  boxShadow: "0 18px 45px rgba(15,23,42,0.9)",
                }}
              >
                <span
                  style={{
                    fontSize: "1.5rem",
                    fontWeight: 700,
                    lineHeight: 1,
                  }}
                >
                  {visibleScores.team1 ?? 0}
                </span>
              </div>
              <span
                style={{
                  fontSize: "1.2rem",
                  fontWeight: 600,
                  color: "var(--muted)",
                }}
              >
                –
              </span>
              <div
                style={{
                  borderRadius: "0.9rem",
                  padding: "0.5rem 0.6rem",
                  minWidth: 70,
                  textAlign: "center",
                  background:
                    "linear-gradient(135deg, rgba(15,23,42,0.96), rgba(30,64,175,0.96))",
                  color: "#e5e7eb",
                  boxShadow: "0 18px 45px rgba(15,23,42,0.9)",
                }}
              >
                <span
                  style={{
                    fontSize: "1.5rem",
                    fontWeight: 700,
                    lineHeight: 1,
                  }}
                >
                  {visibleScores.team2 ?? 0}
                </span>
              </div>
            </div>

            {/* Selectores de puntos 0–6 */}
            <div
              style={{
                display: "flex",
                flexDirection: "column",
                gap: "0.4rem",
                marginTop: "0.4rem",
              }}
            >
              <div
                style={{
                  display: "flex",
                  justifyContent: "space-between",
                  gap: "0.4rem",
                  alignItems: "center",
                }}
              >
                <span
                  style={{
                    fontSize: "0.75rem",
                    color: "var(--muted)",
                  }}
                >
                  Puntos equipo 1
                </span>
                <ScoreNumberInputFinal
                  value={visibleScores.team1 ?? 0}
                  onChange={(val) =>
                    handleScoreChange(visibleKey, "team1", val)
                  }
                />
              </div>

              <div
                style={{
                  display: "flex",
                  justifyContent: "space-between",
                  gap: "0.4rem",
                  alignItems: "center",
                }}
              >
                <span
                  style={{
                    fontSize: "0.75rem",
                    color: "var(--muted)",
                  }}
                >
                  Puntos equipo 2
                </span>
                <ScoreNumberInputFinal
                  value={visibleScores.team2 ?? 0}
                  onChange={(val) =>
                    handleScoreChange(visibleKey, "team2", val)
                  }
                />
              </div>
            </div>

            {/* Botón Guardar resultado */}
            <div
              style={{
                marginTop: "0.5rem",
                display: "flex",
                justifyContent: "flex-end",
              }}
            >
              <button
                type="button"
                onClick={() => handleSaveFinal(visibleKey)}
                disabled={savingFinalKey === visibleKey}
                className="btn btn-primary btn-glow pressable"
                style={{
                  borderRadius: "0.9rem",
                  border: "none",
                  padding: "0.5rem 0.9rem",
                  background:
                    "linear-gradient(135deg, var(--accent), rgba(59,130,246,0.9))",
                  fontSize: "0.8rem",
                  cursor:
                    savingFinalKey === visibleKey ? "default" : "pointer",
                  fontWeight: 600,
                  color: "#ffffff",
                  boxShadow: "0 0 0 1px rgba(15,23,42,0.25)",
                  opacity: savingFinalKey === visibleKey ? 0.85 : 1,
                  display: "inline-flex",
                  alignItems: "center",
                  gap: "0.3rem",
                }}
              >
                <Icon name="check" size={14} color="#ffffff" />
                {savingFinalKey === visibleKey
                  ? "Guardando..."
                  : "Guardar resultado"}
              </button>
            </div>
          </div>

          {errorMsg && (
            <p
              style={{
                margin: 0,
                marginTop: "0.35rem",
                fontSize: "0.75rem",
                color: "#f97373",
              }}
            >
              {errorMsg}
            </p>
          )}
          {successMsg && (
            <p
              style={{
                margin: 0,
                marginTop: "0.35rem",
                fontSize: "0.75rem",
                color: "#bbf7d0",
              }}
            >
              {successMsg}
            </p>
          )}

          {loadingPlayers && (
            <p
              style={{
                margin: 0,
                marginTop: "0.35rem",
                fontSize: "0.75rem",
                color: "var(--muted)",
              }}
            >
              Cargando jugadores...
            </p>
          )}
        </section>
      )}
    </div>
  );
}

// Selector de puntos 0–6 para la final
function ScoreNumberInputFinal({ value, onChange }) {
  const options = [0, 1, 2, 3, 4, 5, 6];

  return (
    <div
      style={{
        display: "flex",
        gap: "0.25rem",
        padding: "0.1rem",
        borderRadius: "999px",
        background: "var(--bg-elevated)",
        border: "1px solid var(--border)",
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
                : "1px solid transparent",
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
  );
}
