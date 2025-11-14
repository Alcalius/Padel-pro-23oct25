// src/pages/Profile.jsx
import React, { useEffect, useRef, useState } from "react";
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
import { useNavigate } from "react-router-dom";

// Imágenes de rangos (ajusta la ruta si tu carpeta se llama distinto)
import bronceImg from "../assets/rangos/bronce.png";
import plataImg from "../assets/rangos/plata.png";
import oroImg from "../assets/rangos/oro.png";
import platinoImg from "../assets/rangos/platino.png";
import leyendaImg from "../assets/rangos/leyenda.png";

// ----------------------------------
// Mapeo PL → rango / imagen (igual que en Home.jsx)
// ----------------------------------
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

export default function Profile() {
  const { user, logout } = useAuth();
  const navigate = useNavigate();

  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  const [profile, setProfile] = useState(null);
  const [stats, setStats] = useState({
    totalMatches: 0,
    wins: 0,
    losses: 0,
    tournamentsPlayed: 0,
    winRate: 0,
    recentMatches: [],
  });

  const [editMode, setEditMode] = useState(false);
  const [localEdit, setLocalEdit] = useState({
    name: "",
    email: "",
    handedness: "",
    style: "",
  });

  const [errorMsg, setErrorMsg] = useState("");
  const [successMsg, setSuccessMsg] = useState("");
  const fileInputRef = useRef(null);

  // ----------------------------------
  // Cargar datos del usuario
  // ----------------------------------
  useEffect(() => {
    const loadProfile = async () => {
      if (!user) {
        setLoading(false);
        return;
      }

      try {
        const userRef = doc(db, "users", user.uid);
        const snap = await getDoc(userRef);

        if (snap.exists()) {
          const data = snap.data();

          const profileData = {
            id: user.uid,
            name:
              data.name ||
              data.displayName ||
              user.displayName ||
              (data.email || user.email || "").split("@")[0],
            email: data.email || user.email || "",
            handedness: data.handedness || "",
            style: data.style || "",
            profilePicture: data.profilePicture || data.photoURL || user.photoURL || "",
            leaguePoints:
              typeof data.leaguePoints === "number" ? data.leaguePoints : 0,
            activeClubId: data.activeClubId || null,
          };

          // Stats + recentMatches
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

          const recentMatches = Array.isArray(s.recentMatches)
            ? s.recentMatches
            : Array.isArray(data.recentMatches)
            ? data.recentMatches
            : [];

          setProfile(profileData);
          setStats({
            totalMatches,
            wins,
            losses,
            tournamentsPlayed,
            winRate,
            recentMatches,
          });

          setLocalEdit({
            name: profileData.name,
            email: profileData.email,
            handedness: profileData.handedness,
            style: profileData.style,
          });
        } else {
          // Fallback si no hay documento en Firestore
          const fallback = {
            id: user.uid,
            name:
              user.displayName ||
              (user.email || "").split("@")[0] ||
              "Jugador",
            email: user.email || "",
            handedness: "",
            style: "",
            profilePicture: user.photoURL || "",
            leaguePoints: 0,
            activeClubId: null,
          };

          setProfile(fallback);
          setStats({
            totalMatches: 0,
            wins: 0,
            losses: 0,
            tournamentsPlayed: 0,
            winRate: 0,
            recentMatches: [],
          });

          setLocalEdit({
            name: fallback.name,
            email: fallback.email,
            handedness: "",
            style: "",
          });
        }
      } catch (err) {
        console.error("Error cargando perfil:", err);
        setErrorMsg("No se pudo cargar tu perfil.");
      } finally {
        setLoading(false);
      }
    };

    loadProfile();
  }, [user]);

  // ----------------------------------
  // Manejo de cambios de texto
  // ----------------------------------
  const handleChange = (field, value) => {
    setLocalEdit((prev) => ({ ...prev, [field]: value }));
  };

  // ----------------------------------
  // Guardar cambios de texto
  // ----------------------------------
  const handleSaveProfile = async () => {
    if (!user || !profile) return;

    setSaving(true);
    setErrorMsg("");
    setSuccessMsg("");

    try {
      const userRef = doc(db, "users", user.uid);
      await updateDoc(userRef, {
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

      setSuccessMsg("Perfil actualizado.");
      setEditMode(false);
    } catch (err) {
      console.error("Error actualizando perfil:", err);
      setErrorMsg("No se pudieron guardar los cambios.");
    } finally {
      setSaving(false);
    }
  };

  // ----------------------------------
  // Subir / cambiar foto de perfil
  // ----------------------------------
  const handlePhotoClick = () => {
    if (!editMode) return;
    if (fileInputRef.current) {
      fileInputRef.current.click();
    }
  };

  const handlePhotoChange = async (e) => {
    if (!user || !profile) return;
    const file = e.target.files?.[0];
    if (!file) return;

    setSaving(true);
    setErrorMsg("");
    setSuccessMsg("");

    try {
      const storage = getStorage(app);
      const ref = storageRef(storage, `profilePictures/${user.uid}`);
      await uploadBytes(ref, file);
      const url = await getDownloadURL(ref);

      const userRef = doc(db, "users", user.uid);
      await updateDoc(userRef, { profilePicture: url });

      setProfile((prev) => ({
        ...prev,
        profilePicture: url,
      }));
      setSuccessMsg("Foto de perfil actualizada.");
    } catch (err) {
      console.error("Error subiendo foto de perfil:", err);
      setErrorMsg("No se pudo actualizar la foto de perfil.");
    } finally {
      setSaving(false);
    }
  };

  // ----------------------------------
  // Cerrar sesión
  // ----------------------------------
  const handleLogout = async () => {
    try {
      await logout();
    } catch (err) {
      console.error("Error al cerrar sesión:", err);
    }
  };

  // ----------------------------------
  // Derivados
  // ----------------------------------
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
          Inicia sesión para ver tu perfil.
        </p>
      </div>
    );
  }

  if (loading || !profile) {
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
          Cargando tu perfil...
        </p>
      </div>
    );
  }

  const rankInfo = getRankForPL(profile.leaguePoints || 0);
  const recentMatches = stats.recentMatches || [];

  // ----------------------------------
  // Render
  // ----------------------------------
  return (
    <div
      style={{
        display: "flex",
        flexDirection: "column",
        gap: "1rem",
        paddingBottom: "0.75rem",
      }}
    >
      {/* INPUT HIDDEN PARA LA FOTO */}
      <input
        ref={fileInputRef}
        type="file"
        accept="image/*"
        style={{ display: "none" }}
        onChange={handlePhotoChange}
      />

      {/* MENSAJES */}
      {(errorMsg || successMsg) && (
        <div
          style={{
            borderRadius: "0.8rem",
            padding: "0.5rem 0.7rem",
            background: errorMsg
              ? "rgba(239,68,68,0.08)"
              : "rgba(34,197,94,0.08)",
            border: `1px solid ${
              errorMsg ? "rgba(239,68,68,0.5)" : "rgba(34,197,94,0.5)"
            }`,
            fontSize: "0.78rem",
            color: errorMsg ? "rgb(220,38,38)" : "rgb(22,163,74)",
          }}
        >
          {errorMsg || successMsg}
        </div>
      )}

      {/* CARD PRINCIPAL PERFIL */}
      <section
        style={{
          position: "relative",
          borderRadius: "1rem",
          padding: "1rem",
          border: "1px solid var(--border)",
          background: "var(--bg-elevated)",
          display: "flex",
          gap: "1rem",
        }}
      >
        {/* Botón engrane */}
        <button
          type="button"
          onClick={() => setEditMode((prev) => !prev)}
          style={{
            position: "absolute",
            top: 10,
            right: 10,
            border: "none",
            background: "transparent",
            cursor: "pointer",
            padding: 4,
          }}
        >
          <Icon
            name="settings"
            size={18}
            color={editMode ? "var(--accent)" : "var(--muted)"}
          />
        </button>

        {/* Avatar */}
        <button
          type="button"
          onClick={handlePhotoClick}
          style={{
            border: "none",
            background: "transparent",
            padding: 0,
            cursor: editMode ? "pointer" : "default",
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
                  color: "#E5E7EB",
                }}
              >
                {(profile.name || "J")[0].toUpperCase()}
              </span>
            )}
          </div>
          {editMode && (
            <p
              style={{
                marginTop: "0.25rem",
                fontSize: "0.75rem",
                color: "var(--muted)",
                textAlign: "center",
              }}
            >
              Toca para cambiar foto
            </p>
          )}
        </button>

        {/* Info perfil */}
        <div style={{ flex: 1, minWidth: 0 }}>
          {/* Nombre */}
          {!editMode ? (
            <>
              <h2
                style={{
                  margin: 0,
                  fontSize: "1.15rem",
                  fontWeight: 700,
                  overflow: "hidden",
                  textOverflow: "ellipsis",
                  whiteSpace: "nowrap",
                }}
              >
                {profile.name}
              </h2>
              <p
                style={{
                  margin: "0.1rem 0",
                  fontSize: "0.8rem",
                  color: "var(--muted)",
                }}
              >
                {profile.email}
              </p>
            </>
          ) : (
            <>
              <label
                style={{
                  display: "block",
                  marginBottom: "0.35rem",
                  fontSize: "0.75rem",
                  color: "var(--muted)",
                }}
              >
                Nombre
                <input
                  type="text"
                  value={localEdit.name}
                  onChange={(e) =>
                    handleChange("name", e.target.value)
                  }
                  style={{
                    marginTop: "0.15rem",
                    width: "100%",
                    padding: "0.35rem 0.45rem",
                    borderRadius: "0.5rem",
                    border: "1px solid var(--border)",
                    background: "var(--bg)",
                    color: "var(--fg)",
                    fontSize: "0.82rem",
                  }}
                />
              </label>

              <label
                style={{
                  display: "block",
                  marginBottom: "0.35rem",
                  fontSize: "0.75rem",
                  color: "var(--muted)",
                }}
              >
                Correo
                <input
                  type="email"
                  value={localEdit.email}
                  onChange={(e) =>
                    handleChange("email", e.target.value)
                  }
                  style={{
                    marginTop: "0.15rem",
                    width: "100%",
                    padding: "0.35rem 0.45rem",
                    borderRadius: "0.5rem",
                    border: "1px solid var(--border)",
                    background: "var(--bg)",
                    color: "var(--fg)",
                    fontSize: "0.82rem",
                  }}
                />
              </label>
            </>
          )}

          {/* Rango y PL */}
          <div
            style={{
              marginTop: "0.4rem",
              display: "flex",
              alignItems: "center",
              gap: "0.6rem",
            }}
          >
            {rankInfo.image && (
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
                    width: 72,
                    height: 72,
                    objectFit: "contain",
                    display: "block",
                  }}
                />
              </button>
            )}
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
                {rankInfo.label} • {profile.leaguePoints || 0} PL
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
                      Math.min(100, (profile.leaguePoints || 0) % 100)
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

          {/* Botones de guardar / cancelar / logout */}
          {editMode && (
            <div
              style={{
                marginTop: "0.8rem",
                display: "flex",
                flexWrap: "wrap",
                gap: "0.5rem",
              }}
            >
              <button
                type="button"
                onClick={handleSaveProfile}
                disabled={saving}
                style={{
                  flex: 1,
                  minWidth: "40%",
                  borderRadius: "999px",
                  border: "none",
                  padding: "0.45rem 0.8rem",
                  background:
                    "linear-gradient(90deg, rgba(59,130,246,1), rgba(56,189,248,1))",
                  color: "#fff",
                  fontSize: "0.85rem",
                  fontWeight: 600,
                  cursor: saving ? "default" : "pointer",
                  opacity: saving ? 0.7 : 1,
                }}
              >
                {saving ? "Guardando..." : "Guardar cambios"}
              </button>
              <button
                type="button"
                onClick={() => {
                  setEditMode(false);
                  setLocalEdit({
                    name: profile.name,
                    email: profile.email,
                    handedness: profile.handedness,
                    style: profile.style,
                  });
                  setErrorMsg("");
                  setSuccessMsg("");
                }}
                style={{
                  flex: 1,
                  minWidth: "30%",
                  borderRadius: "999px",
                  padding: "0.45rem 0.8rem",
                  border: "1px solid var(--border)",
                  background: "var(--bg)",
                  color: "var(--fg)",
                  fontSize: "0.85rem",
                  cursor: "pointer",
                }}
              >
                Cancelar
              </button>
              <button
                type="button"
                onClick={handleLogout}
                style={{
                  width: "100%",
                  borderRadius: "999px",
                  padding: "0.45rem 0.8rem",
                  border: "1px solid rgba(248,113,113,0.6)",
                  background: "rgba(127,29,29,0.05)",
                  color: "rgb(248,113,113)",
                  fontSize: "0.8rem",
                  cursor: "pointer",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  gap: "0.3rem",
                  marginTop: "0.2rem",
                }}
              >
                <Icon name="logout" size={14} color="rgb(248,113,113)" />
                Cerrar sesión
              </button>
            </div>
          )}
        </div>
      </section>

      {/* RESUMEN ESTADÍSTICAS */}
      <section>
        <h3
          style={{
            margin: "0 0 0.5rem",
            fontSize: "0.95rem",
          }}
        >
          Resumen
        </h3>
        <div
          style={{
            borderRadius: "1rem",
            border: "1px solid var(--border)",
            padding: "0.8rem 0.9rem",
            background: "var(--bg-elevated)",
            display: "grid",
            gridTemplateColumns: "repeat(2, minmax(0, 1fr))",
            gap: "0.6rem",
          }}
        >
          <MiniStatCard
            label="Partidos jugados"
            value={stats.totalMatches}
          />
          <MiniStatCard label="Victorias" value={stats.wins} />
          <MiniStatCard label="Derrotas" value={stats.losses} />
          <MiniStatCard
            label="Winrate"
            value={stats.winRate}
            suffix="%"
          />
          <MiniStatCard
            label="Torneos jugados"
            value={stats.tournamentsPlayed}
          />
          <MiniStatCard
            label="Puntos de liga"
            value={profile.leaguePoints || 0}
            suffix="PL"
          />
        </div>
      </section>

      {/* LOGROS */}
      <section>
        <h3
          style={{
            margin: "0 0 0.5rem",
            fontSize: "0.95rem",
          }}
        >
          Logros
        </h3>
        <div
          style={{
            borderRadius: "1rem",
            border: "1px solid var(--border)",
            padding: "0.7rem 0.8rem",
            background: "var(--bg-elevated)",
            display: "flex",
            flexDirection: "column",
            gap: "0.45rem",
          }}
        >
          {buildAchievements(stats).map((ach) => (
            <div
              key={ach.id}
              style={{
                display: "flex",
                alignItems: "center",
                gap: "0.5rem",
                opacity: ach.unlocked ? 1 : 0.45,
              }}
            >
              <div
                style={{
                  width: 28,
                  height: 28,
                  borderRadius: "999px",
                  border: "1px solid var(--border)",
                  background: "var(--bg)",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                }}
              >
                <Icon
                  name="star"
                  size={16}
                  color={
                    ach.unlocked ? "var(--accent)" : "var(--muted)"
                  }
                />
              </div>
              <div style={{ flex: 1, minWidth: 0 }}>
                <p
                  style={{
                    margin: 0,
                    fontSize: "0.82rem",
                    fontWeight: 600,
                    overflow: "hidden",
                    textOverflow: "ellipsis",
                    whiteSpace: "nowrap",
                  }}
                >
                  {ach.title}
                </p>
                <p
                  style={{
                    margin: 0,
                    fontSize: "0.75rem",
                    color: "var(--muted)",
                  }}
                >
                  {ach.description}
                </p>
              </div>
            </div>
          ))}
        </div>
      </section>

      {/* PARTIDOS RECIENTES */}
      <section style={{ marginBottom: "0.4rem" }}>
        <h3
          style={{
            margin: "0 0 0.4rem",
            fontSize: "0.95rem",
          }}
        >
          Partidos recientes
        </h3>

        {recentMatches && recentMatches.length > 0 ? (
          <div
            style={{
              display: "flex",
              flexDirection: "column",
              gap: "0.35rem",
            }}
          >
            {recentMatches.slice(0, 8).map((m, idx) => {
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
            Cuando juegues partidos con PL, verás aquí tu historial reciente.
          </p>
        )}
      </section>
    </div>
  );
}

// ----------------------------------
// Componentes auxiliares
// ----------------------------------

function ProfileTag({ icon, label, value }) {
  return (
    <div
      style={{
        minWidth: "40%",
        borderRadius: "999px",
        border: "1px solid var(--border)",
        padding: "0.35rem 0.6rem",
        display: "flex",
        alignItems: "center",
        gap: "0.35rem",
        background: "var(--bg)",
      }}
    >
      <Icon name={icon} size={14} color="var(--muted)" />
      <div style={{ minWidth: 0 }}>
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
            margin: 0,
            marginTop: "0.05rem",
            fontSize: "0.78rem",
            fontWeight: 500,
            overflow: "hidden",
            textOverflow: "ellipsis",
            whiteSpace: "nowrap",
          }}
        >
          {value}
        </p>
      </div>
    </div>
  );
}

function MiniStatCard({ label, value, suffix }) {
  return (
    <div
      style={{
        borderRadius: "0.8rem",
        border: "1px solid var(--border)",
        padding: "0.5rem 0.6rem",
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

function buildAchievements(stats) {
  const { totalMatches, wins, tournamentsPlayed, winRate } = stats;

  return [
    {
      id: "first_match",
      title: "Primer partido",
      description: "Juega tu primer partido rankeado.",
      unlocked: totalMatches >= 1,
    },
    {
      id: "ten_matches",
      title: "Calentando",
      description: "Juega 10 partidos rankeados.",
      unlocked: totalMatches >= 10,
    },
    {
      id: "first_win",
      title: "Sabor a victoria",
      description: "Gana tu primer partido.",
      unlocked: wins >= 1,
    },
    {
      id: "ten_wins",
      title: "En racha",
      description: "Acumula 10 victorias.",
      unlocked: wins >= 10,
    },
    {
      id: "tournaments",
      title: "Jugador de torneo",
      description: "Participa en 3 torneos o más.",
      unlocked: tournamentsPlayed >= 3,
    },
    {
      id: "winrate_60",
      title: "Letal",
      description: "Mantén un winrate de 60% o más.",
      unlocked: winRate >= 60,
    },
  ];
}
