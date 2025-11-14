// src/pages/Profile.jsx
import React, { useEffect, useState, useRef } from "react";
import { useAuth } from "../context/AuthContext";
import app, { db } from "../firebase/firebase";
import { doc, getDoc, updateDoc } from "firebase/firestore";
import {
  getStorage,
  ref as storageRef,
  uploadBytes,
  getDownloadURL,
} from "firebase/storage";
import Icon from "../components/common/Icon";
import { getRankImage } from "../utils/ranking";
import { useNavigate } from "react-router-dom";

export default function Profile() {
  const { user, logout } = useAuth();
  const userId = user?.uid;
  const navigate = useNavigate();

  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [editing, setEditing] = useState(false);

  // input oculto para subir foto
  const fileInputRef = useRef(null);

  const [profile, setProfile] = useState({
    name: "",
    email: "",
    handedness: "",
    style: "",
    rank: "Bronce III",
    leaguePoints: 0,
    profilePicture: "",
  });

  const [stats, setStats] = useState({
    totalMatches: 0,
    wins: 0,
    losses: 0,
    tournamentsPlayed: 0,
    tournamentsWon: 0,
    streak: 0,
    recentMatches: [], // { opponentName, result, score, date, tournamentName, plDelta }
    achievements: [],
  });

  const [localEdit, setLocalEdit] = useState({
    name: "",
    email: "",
    handedness: "",
    style: "",
  });

  useEffect(() => {
    const load = async () => {
      if (!userId) {
        setLoading(false);
        return;
      }

      try {
        const refUser = doc(db, "users", userId);
        const snap = await getDoc(refUser);

        if (snap.exists()) {
          const data = snap.data();

          const mergedProfile = {
            name:
              data.name ||
              data.displayName ||
              (data.email ? data.email.split("@")[0] : "Jugador"),
            email: data.email || user.email || "",
            handedness: data.handedness || "",
            style: data.style || "",
            rank: data.rank || "Bronce III",
            leaguePoints:
              typeof data.leaguePoints === "number" ? data.leaguePoints : 0,
            profilePicture: data.profilePicture || data.photoURL || "",
          };

          const rawStats = data.stats || {};
          const mergedStats = {
            totalMatches:
              typeof rawStats.totalMatches === "number"
                ? rawStats.totalMatches
                : data.totalMatches || 0,
            wins:
              typeof rawStats.wins === "number"
                ? rawStats.wins
                : data.wins || 0,
            losses:
              typeof rawStats.losses === "number"
                ? rawStats.losses
                : data.losses || 0,
            tournamentsPlayed:
              typeof rawStats.tournamentsPlayed === "number"
                ? rawStats.tournamentsPlayed
                : data.tournamentsPlayed || 0,
            tournamentsWon:
              typeof rawStats.tournamentsWon === "number"
                ? rawStats.tournamentsWon
                : data.tournamentsWon || 0,
            streak:
              typeof rawStats.streak === "number"
                ? rawStats.streak
                : data.streak || 0,
            recentMatches: Array.isArray(rawStats.recentMatches)
              ? rawStats.recentMatches
              : [],
            achievements: Array.isArray(rawStats.achievements)
              ? rawStats.achievements
              : [],
          };

          setProfile(mergedProfile);
          setStats(mergedStats);
          setLocalEdit({
            name: mergedProfile.name,
            email: mergedProfile.email,
            handedness: mergedProfile.handedness,
            style: mergedProfile.style,
          });
        } else {
          const fallback = {
            name: user.displayName || (user.email || "").split("@")[0],
            email: user.email || "",
            handedness: "",
            style: "",
            rank: "Bronce III",
            leaguePoints: 0,
            profilePicture: user.photoURL || "",
          };
          setProfile(fallback);
          setLocalEdit({
            name: fallback.name,
            email: fallback.email,
            handedness: "",
            style: "",
          });
          setStats({
            totalMatches: 0,
            wins: 0,
            losses: 0,
            tournamentsPlayed: 0,
            tournamentsWon: 0,
            streak: 0,
            recentMatches: [],
            achievements: [],
          });
        }
      } catch (err) {
        console.error("Error cargando perfil:", err);
      } finally {
        setLoading(false);
      }
    };

    load();
  }, [userId, user]);

  const handleEditChange = (field, value) => {
    setLocalEdit((prev) => ({
      ...prev,
      [field]: value,
    }));
  };

  const handleSave = async () => {
    if (!userId) return;
    setSaving(true);
    try {
      const refUser = doc(db, "users", userId);
      await updateDoc(refUser, {
        name: localEdit.name,
        email: localEdit.email,
        handedness: localEdit.handedness,
        style: localEdit.style,
      });
      setProfile((prev) => ({
        ...prev,
        name: localEdit.name,
        email: localEdit.email,
        handedness: localEdit.handedness,
        style: localEdit.style,
      }));
      setEditing(false);
    } catch (err) {
      console.error("Error guardando perfil:", err);
      alert("No se pudo guardar el perfil.");
    } finally {
      setSaving(false);
    }
  };

  // 👉 abrir selector de archivo
  const handleChangePicture = () => {
    if (fileInputRef.current) {
      fileInputRef.current.click();
    }
  };

  // 👉 subir imagen a Firebase Storage y guardar URL en Firestore
  const handleFileChange = async (event) => {
    const file = event.target.files[0];
    if (!file || !userId) return;

    try {
      setSaving(true);

      const storage = getStorage(app);
      const avatarRef = storageRef(storage, `profilePictures/${userId}`);

      await uploadBytes(avatarRef, file);
      const downloadURL = await getDownloadURL(avatarRef);

      const refUser = doc(db, "users", userId);
      await updateDoc(refUser, { profilePicture: downloadURL });

      setProfile((prev) => ({
        ...prev,
        profilePicture: downloadURL,
      }));
    } catch (error) {
      console.error("Error subiendo foto de perfil:", error);
      alert("No se pudo actualizar la foto de perfil.");
    } finally {
      setSaving(false);
      // limpiar input para poder volver a subir la misma imagen si quiere
      event.target.value = "";
    }
  };

  const handleLogout = async () => {
    try {
      await logout();
    } catch (err) {
      console.error("Error al cerrar sesión:", err);
    }
  };

  if (loading) {
    return (
      <div
        style={{
          padding: "1rem",
          fontSize: "0.9rem",
          color: "var(--muted)",
        }}
      >
        Cargando perfil...
      </div>
    );
  }

  const rankImg = getRankImage(profile.rank);
  const lp = profile.leaguePoints || 0;
  const lpPercent = Math.max(0, Math.min(100, lp));

  const winRate =
    stats.totalMatches > 0
      ? Math.round((stats.wins / stats.totalMatches) * 100)
      : 0;

  return (
    <div
      style={{
        display: "flex",
        flexDirection: "column",
        gap: "1rem",
        paddingBottom: "0.75rem",
      }}
    >
      {/* HEADER PERFIL */}
      <section
        style={{
          borderRadius: "1.2rem",
          padding: "1rem 1.1rem",
          border: "1px solid var(--border)",
          background: "var(--bg-elevated)",
          position: "relative",
        }}
      >
        {/* Botón engrane */}
        <button
          type="button"
          onClick={() => setEditing((v) => !v)}
          style={{
            position: "absolute",
            top: 10,
            right: 10,
            border: "none",
            background: "transparent",
            cursor: "pointer",
          }}
        >
          <Icon name="settings" size={18} color="var(--muted)" />
        </button>

        {/* Input oculto para subir imagen */}
        <input
          type="file"
          accept="image/*"
          ref={fileInputRef}
          style={{ display: "none" }}
          onChange={handleFileChange}
        />

        <div
          style={{
            display: "flex",
            gap: "1.1rem",
            alignItems: "center",
          }}
        >
          {/* Avatar grande, clicable */}
          <button
            type="button"
            onClick={handleChangePicture}
            style={{
              border: "none",
              background: "transparent",
              padding: 0,
              cursor: "pointer",
            }}
          >
            <div
              style={{
                width: 110,
                height: 110,
                borderRadius: "999px",
                overflow: "hidden",
                background:
                  "radial-gradient(circle at 30% 20%, rgba(59,130,246,0.9), rgba(15,23,42,1))",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                flexShrink: 0,
              }}
            >
              {profile.profilePicture ? (
                <img
                  src={profile.profilePicture}
                  alt={profile.name}
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
                    color: "#ffffff",
                  }}
                >
                  {(profile.name || "J")[0].toUpperCase()}
                </span>
              )}
            </div>
          </button>

          {/* Info principal */}
          <div style={{ flex: 1, minWidth: 0 }}>
            <p
              style={{
                margin: 0,
                fontSize: "0.75rem",
                color: "var(--muted)",
              }}
            >
              Perfil
            </p>
            <h1
              style={{
                margin: 0,
                fontSize: "1.1rem",
                fontWeight: 700,
                overflow: "hidden",
                textOverflow: "ellipsis",
                whiteSpace: "nowrap",
              }}
            >
              {profile.name}
            </h1>
            <p
              style={{
                margin: 0,
                marginTop: "0.15rem",
                fontSize: "0.78rem",
                color: "var(--muted)",
              }}
            >
              {profile.email}
            </p>

            {/* Rango y PL */}
            <div
              style={{
                marginTop: "0.6rem",
                display: "flex",
                alignItems: "center",
                gap: "0.7rem",
              }}
            >
              {/* Imagen de rango -> navega a /ranking */}
              <button
                type="button"
                onClick={() => navigate("/ranking")}
                title="Ver sistema de ranking"
                style={{
                  border: "none",
                  background: "transparent",
                  padding: 0,
                  cursor: "pointer",
                }}
              >
                <div
                  style={{
                    width: 72,
                    height: 72,
                    borderRadius: "1.1rem",
                    overflow: "hidden",
                    backgroundColor: "transparent",
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                    boxShadow: "0 12px 20px rgba(15, 23, 42, 0.45)",
                  }}
                >
                  <img
                    src={rankImg}
                    alt={profile.rank}
                    style={{
                      width: "100%",
                      height: "100%",
                      objectFit: "cover",
                    }}
                  />
                </div>
              </button>

              <div style={{ flex: 1, minWidth: 0 }}>
                <p
                  style={{
                    margin: 0,
                    fontSize: "0.75rem",
                    color: "var(--muted)",
                  }}
                >
                  Rango actual
                </p>
                <p
                  style={{
                    margin: 0,
                    fontSize: "0.9rem",
                    fontWeight: 600,
                  }}
                >
                  {profile.rank} • {lp} PL
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
                      width: `${lpPercent}%`,
                      height: "100%",
                      background:
                        "linear-gradient(90deg, rgba(59,130,246,1), rgba(56,189,248,1))",
                    }}
                  />
                </div>
                <p
                  style={{
                    margin: 0,
                    marginTop: "0.2rem",
                    fontSize: "0.72rem",
                    color: "var(--muted)",
                  }}
                >
                  Toca el escudo para ver cómo funciona el sistema de ligas.
                </p>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* RESUMEN */}
      <section className="card">
        <h2
          style={{
            margin: 0,
            marginBottom: "0.5rem",
            fontSize: "0.95rem",
          }}
        >
          Resumen
        </h2>
        <div
          style={{
            display: "flex",
            gap: "0.7rem",
          }}
        >
          <div
            style={{
              flex: 1,
              borderRadius: "0.9rem",
              padding: "0.4rem 0.5rem",
              background: "var(--bg)",
            }}
          >
            <p
              style={{
                margin: 0,
                fontSize: "0.7rem",
                color: "var(--muted)",
              }}
            >
              Partidos
            </p>
            <p
              style={{
                margin: 0,
                marginTop: "0.15rem",
                fontSize: "0.95rem",
                fontWeight: 700,
              }}
            >
              {stats.totalMatches}
            </p>
          </div>
          <div
            style={{
              flex: 1,
              borderRadius: "0.9rem",
              padding: "0.4rem 0.5rem",
              background: "var(--bg)",
            }}
          >
            <p
              style={{
                margin: 0,
                fontSize: "0.7rem",
                color: "var(--muted)",
              }}
            >
              Victorias
            </p>
            <p
              style={{
                margin: 0,
                marginTop: "0.15rem",
                fontSize: "0.95rem",
                fontWeight: 700,
              }}
            >
              {stats.wins}
            </p>
          </div>
          <div
            style={{
              flex: 1,
              borderRadius: "0.9rem",
              padding: "0.4rem 0.5rem",
              background: "var(--bg)",
            }}
          >
            <p
              style={{
                margin: 0,
                fontSize: "0.7rem",
                color: "var(--muted)",
              }}
            >
              Winrate
            </p>
            <p
              style={{
                margin: 0,
                marginTop: "0.15rem",
                fontSize: "0.95rem",
                fontWeight: 700,
              }}
            >
              {winRate}%
            </p>
          </div>
        </div>
      </section>

      {/* ESTADÍSTICAS DETALLADAS */}
      <section className="card">
        <h2
          style={{
            margin: 0,
            marginBottom: "0.4rem",
            fontSize: "0.95rem",
          }}
        >
          Estadísticas
        </h2>
        <div
          style={{
            display: "grid",
            gridTemplateColumns: "1fr 1fr",
            gap: "0.5rem",
            fontSize: "0.8rem",
          }}
        >
          <StatItem label="Partidos jugados" value={stats.totalMatches} />
          <StatItem label="Derrotas" value={stats.losses} />
          <StatItem label="Torneos jugados" value={stats.tournamentsPlayed} />
          <StatItem label="Torneos ganados" value={stats.tournamentsWon} />
          <StatItem label="Racha actual" value={stats.streak} suffix="W" />
        </div>
      </section>

      {/* LOGROS */}
      <section className="card">
        <h2
          style={{
            margin: 0,
            marginBottom: "0.4rem",
            fontSize: "0.95rem",
          }}
        >
          Logros
        </h2>
        {stats.achievements && stats.achievements.length > 0 ? (
          <ul
            style={{
              margin: 0,
              paddingLeft: "1.1rem",
              fontSize: "0.8rem",
            }}
          >
            {stats.achievements.map((ach, idx) => (
              <li key={idx} style={{ marginBottom: "0.2rem" }}>
                {ach}
              </li>
            ))}
          </ul>
        ) : (
          <p
            style={{
              margin: 0,
              fontSize: "0.8rem",
              color: "var(--muted)",
            }}
          >
            Aún no tienes logros desbloqueados. ¡Juega torneos para conseguir
            algunos!
          </p>
        )}
      </section>

      {/* PARTIDOS RECIENTES */}
      <section className="card">
        <h2
          style={{
            margin: 0,
            marginBottom: "0.4rem",
            fontSize: "0.95rem",
          }}
        >
          Partidos recientes
        </h2>
        {stats.recentMatches && stats.recentMatches.length > 0 ? (
          <div
            style={{
              display: "flex",
              flexDirection: "column",
              gap: "0.45rem",
            }}
          >
            {stats.recentMatches.slice(0, 5).map((m, idx) => (
              <div
                key={idx}
                style={{
                  borderRadius: "0.7rem",
                  padding: "0.4rem 0.5rem",
                  background: "var(--bg)",
                  display: "flex",
                  justifyContent: "space-between",
                  alignItems: "center",
                  gap: "0.5rem",
                  fontSize: "0.78rem",
                }}
              >
                <div style={{ minWidth: 0 }}>
                  <p
                    style={{
                      margin: 0,
                      fontWeight: 600,
                      overflow: "hidden",
                      textOverflow: "ellipsis",
                      whiteSpace: "nowrap",
                    }}
                  >
                    {m.tournamentName || "Partido de torneo"}
                  </p>
                  <p
                    style={{
                      margin: 0,
                      marginTop: "0.1rem",
                      color: "var(--muted)",
                    }}
                  >
                    {m.result === "win"
                      ? "Victoria"
                      : m.result === "loss"
                      ? "Derrota"
                      : "Empate"}{" "}
                    {m.score ? `• ${m.score}` : ""}
                  </p>
                </div>
                <div
                  style={{
                    textAlign: "right",
                    fontSize: "0.7rem",
                    color: "var(--muted)",
                  }}
                >
                  {m.date && (
                    <div>
                      {new Date(m.date).toLocaleDateString("es-MX", {
                        day: "2-digit",
                        month: "short",
                      })}
                    </div>
                  )}
                  {m.plDelta != null && (
                    <div
                      style={{
                        marginTop: "0.1rem",
                        fontWeight: 600,
                        color: m.plDelta > 0 ? "#4ade80" : "#fca5a5",
                      }}
                    >
                      {m.plDelta > 0 ? "+" : ""}
                      {m.plDelta} PL
                    </div>
                  )}
                </div>
              </div>
            ))}
          </div>
        ) : (
          <p
            style={{
              margin: 0,
              fontSize: "0.8rem",
              color: "var(--muted)",
            }}
          >
            Aquí aparecerán tus últimos partidos cuando empieces a jugar torneos
            rankeados.
          </p>
        )}
      </section>

      {/* CONFIGURACIÓN / CUENTA (ENGRANE) */}
      {editing && (
        <section className="card">
          <h2
            style={{
              margin: 0,
              marginBottom: "0.5rem",
              fontSize: "0.95rem",
            }}
          >
            Configuración de la cuenta
          </h2>

          <div
            style={{
              display: "flex",
              flexDirection: "column",
              gap: "0.5rem",
            }}
          >
            <div>
              <label
                style={{
                  fontSize: "0.75rem",
                  fontWeight: 600,
                  display: "block",
                  marginBottom: "0.2rem",
                }}
              >
                Nombre
              </label>
              <input
                type="text"
                value={localEdit.name}
                onChange={(e) => handleEditChange("name", e.target.value)}
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
            </div>

            <div>
              <label
                style={{
                  fontSize: "0.75rem",
                  fontWeight: 600,
                  display: "block",
                  marginBottom: "0.2rem",
                }}
              >
                Correo
              </label>
              <input
                type="email"
                value={localEdit.email}
                onChange={(e) => handleEditChange("email", e.target.value)}
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
            </div>

            <div>
              <label
                style={{
                  fontSize: "0.75rem",
                  fontWeight: 600,
                  display: "block",
                  marginBottom: "0.2rem",
                }}
              >
                Mano hábil
              </label>
              <select
                value={localEdit.handedness}
                onChange={(e) =>
                  handleEditChange("handedness", e.target.value)
                }
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
              >
                <option value="">No especificado</option>
                <option value="diestro">Diestro</option>
                <option value="zurdo">Zurdo</option>
              </select>
            </div>

            <div>
              <label
                style={{
                  fontSize: "0.75rem",
                  fontWeight: 600,
                  display: "block",
                  marginBottom: "0.2rem",
                }}
              >
                Estilo de juego
              </label>
              <input
                type="text"
                value={localEdit.style}
                onChange={(e) => handleEditChange("style", e.target.value)}
                placeholder="Ej. ofensivo en la red"
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
            </div>

            {/* Botones de guardar / cancelar */}
            <div
              style={{
                display: "flex",
                gap: "0.5rem",
                marginTop: "0.4rem",
              }}
            >
              <button
                type="button"
                onClick={handleSave}
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
                {saving ? "Guardando..." : "Guardar cambios"}
              </button>
              <button
                type="button"
                onClick={() => setEditing(false)}
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
                Cerrar
              </button>
            </div>

            {/* Botón cerrar sesión aquí adentro */}
            <button
              type="button"
              onClick={handleLogout}
              style={{
                marginTop: "0.7rem",
                borderRadius: "0.9rem",
                border: "1px solid var(--border)",
                padding: "0.45rem 0.6rem",
                background: "transparent",
                fontSize: "0.8rem",
                color: "var(--muted)",
                display: "flex",
                alignItems: "center",
                gap: "0.35rem",
                cursor: "pointer",
              }}
            >
              <Icon name="logout" size={14} color="var(--muted)" />
              Cerrar sesión
            </button>
          </div>
        </section>
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

function StatItem({ label, value, suffix }) {
  return (
    <div>
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
          margin: 0,
          marginTop: "0.1rem",
          fontSize: "0.86rem",
          fontWeight: 600,
        }}
      >
        {value}
        {suffix ? ` ${suffix}` : ""}
      </p>
    </div>
  );
}
