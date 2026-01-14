import React, { useEffect, useRef, useState } from "react";
import { useAuth } from "../context/AuthContext";
import { db } from "../firebase/firebase";
import { doc, getDoc, updateDoc } from "firebase/firestore";
import Icon from "../components/common/Icon";
import { useNavigate } from "react-router-dom";
import { getAuth, updatePassword } from "firebase/auth";

// Imágenes de rangos
import bronceImg from "../assets/rangos/bronce.png";
import plataImg from "../assets/rangos/plata.png";
import oroImg from "../assets/rangos/oro.png";
import platinoImg from "../assets/rangos/platino.png";
import diamanteImg from "../assets/rangos/diamante.png";
import leyendaImg from "../assets/rangos/leyenda.png";

// ---------------- RANGOS POR PL (fallback) ----------------
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

  { min: 1200, max: 1299, label: "Diamante III", short: "D3", image: diamanteImg },
  { min: 1300, max: 1399, label: "Diamante II", short: "D2", image: diamanteImg },
  { min: 1400, max: 1499, label: "Diamante I", short: "D1", image: diamanteImg },
];

function getRankForPL(plValue) {
  const pl = typeof plValue === "number" ? plValue : 0;
  const tier = RANK_TIERS.find((t) => pl >= t.min && pl <= t.max);
  if (tier) return tier;

  if (pl >= 1500) {
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

// ---------------- RANGOS POR NOMBRE (rango real) ----------------
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

  "Diamante III": { short: "D3", image: diamanteImg },
  "Diamante II": { short: "D2", image: diamanteImg },
  "Diamante I": { short: "D1", image: diamanteImg },

  Leyenda: { short: "LEG", image: leyendaImg },
  "Sin rango": { short: "UNR", image: bronceImg },
};

// Progresión de rangos en orden (cada uno son 100 PL)
const RANK_PROGRESSION = [
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
  "Diamante III",
  "Diamante II",
  "Diamante I",
  "Leyenda",
];

// PL acumulados suponiendo que has pasado por todos los rangos anteriores
function computeAccumulatedPL(rankName, plValue) {
  const pl = typeof plValue === "number" ? plValue : 0;
  const idx = RANK_PROGRESSION.indexOf(rankName);
  const steps = idx >= 0 ? idx : 0; // cada rango completo aporta 100 PL
  return steps * 100 + pl;
}


// Usa primero el rank guardado en Firestore, y si no existe, cae al cálculo por PL
function getRankInfoFromData(rankName, leaguePoints) {
  const pl = typeof leaguePoints === "number" ? leaguePoints : 0;

  if (typeof rankName === "string" && RANK_META_BY_NAME[rankName]) {
    const meta = RANK_META_BY_NAME[rankName];
    return {
      label: rankName,
      short: meta.short,
      image: meta.image,
    };
  }

  const tier = getRankForPL(pl);
  return {
    label: tier.label,
    short: tier.short,
    image: tier.image,
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
    totalLeaguePointsEarned: 0,
  });

  const [editMode, setEditMode] = useState(false);
  const [localEdit, setLocalEdit] = useState({
    name: "",
    email: "",
    handedness: "",
    style: "",
  });

  const [passwordForm, setPasswordForm] = useState({
    newPassword: "",
    confirmNewPassword: "",
  });
  const [passwordSaving, setPasswordSaving] = useState(false);

  const [errorMsg, setErrorMsg] = useState("");
  const [successMsg, setSuccessMsg] = useState("");

  const [showAllMatches, setShowAllMatches] = useState(false);

  const [animatedProgress, setAnimatedProgress] = useState(0);

  const fileInputRef = useRef(null);

  // -------- CARGAR PERFIL --------
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
            profilePicture:
              data.profilePicture || data.photoURL || user.photoURL || "",
            leaguePoints:
              typeof data.leaguePoints === "number" ? data.leaguePoints : 0,
            // rango real guardado en Firestore
            rank: data.rank || "Bronce III",
          };

          const s = data.stats || {};

          const recentMatches = Array.isArray(s.recentMatches)
            ? s.recentMatches
            : Array.isArray(data.recentMatches)
            ? data.recentMatches
            : [];

          const totalMatches =
            typeof s.totalMatches === "number"
              ? s.totalMatches
              : typeof data.totalMatches === "number"
              ? data.totalMatches
              : recentMatches.length;

          const wins =
            typeof s.wins === "number"
              ? s.wins
              : typeof data.wins === "number"
              ? data.wins
              : 0;

          const losses =
            typeof s.losses === "number"
              ? s.losses
              : typeof data.losses === "number"
              ? data.losses
              : 0;

          let tournamentsPlayed =
            typeof s.tournamentsPlayed === "number"
              ? s.tournamentsPlayed
              : typeof data.tournamentsPlayed === "number"
              ? data.tournamentsPlayed
              : 0;

          // Si no viene guardado, contamos torneos distintos a partir de los partidos recientes
          if (
            (!tournamentsPlayed || tournamentsPlayed === 0) &&
            Array.isArray(recentMatches) &&
            recentMatches.length > 0
          ) {
            const distinct = new Set(
              recentMatches
                .map(
                  (m) =>
                    m.tournamentId ||
                    m.torneoId ||
                    m.tournamentName ||
                    m.tournament
                )
                .filter(Boolean)
            );
            tournamentsPlayed = distinct.size;
          }

          const winRate =
            totalMatches > 0 ? Math.round((wins / totalMatches) * 100) : 0;

          // PL acumulados (total histórico)
          let totalLeaguePointsEarned =
            typeof s.totalLeaguePoints === "number"
              ? s.totalLeaguePoints
              : typeof s.totalPL === "number"
              ? s.totalPL
              : typeof data.totalLeaguePoints === "number"
              ? data.totalLeaguePoints
              : typeof data.totalPL === "number"
              ? data.totalPL
              : 0;

          // Si no hay nada, sumamos los PL ganados de los partidos recientes
          if (
            (!totalLeaguePointsEarned || totalLeaguePointsEarned === 0) &&
            Array.isArray(recentMatches) &&
            recentMatches.length > 0
          ) {
            totalLeaguePointsEarned = recentMatches.reduce((acc, m) => {
              if (typeof m.plDelta === "number" && m.plDelta > 0) {
                return acc + m.plDelta;
              }
              return acc;
            }, 0);
          }

          setProfile(profileData);
          setStats({
            totalMatches,
            wins,
            losses,
            tournamentsPlayed,
            winRate,
            recentMatches,
            totalLeaguePointsEarned,
          });

          setLocalEdit({
            name: profileData.name,
            email: profileData.email,
            handedness: profileData.handedness,
            style: profileData.style,
          });
        } else {
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
            rank: "Bronce III",
          };

          setProfile(fallback);
          setStats({
            totalMatches: 0,
            wins: 0,
            losses: 0,
            tournamentsPlayed: 0,
            winRate: 0,
            recentMatches: [],
            totalLeaguePointsEarned: 0,
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

  // -------- ANIMACIÓN DE BARRA DE RANGO --------
  useEffect(() => {
    if (!profile) return;
    const pl = profile.leaguePoints || 0;
    const baseProgress = Math.max(0, Math.min(100, pl % 100));
    const timeout = setTimeout(() => {
      setAnimatedProgress(baseProgress);
    }, 150);

    return () => clearTimeout(timeout);
  }, [profile]);

  // -------- MANEJO DE CAMPOS DE TEXTO --------
  const handleChange = (field, value) => {
    setLocalEdit((prev) => ({ ...prev, [field]: value }));
  };

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

  // -------- CAMBIO DE CONTRASEÑA --------
  const handlePasswordFieldChange = (field, value) => {
    setPasswordForm((prev) => ({ ...prev, [field]: value }));
  };

  const handleUpdatePassword = async () => {
    if (!user) return;
    setErrorMsg("");
    setSuccessMsg("");

    if (!passwordForm.newPassword || passwordForm.newPassword.length < 6) {
      setErrorMsg("La nueva contraseña debe tener al menos 6 caracteres.");
      return;
    }

    if (passwordForm.newPassword !== passwordForm.confirmNewPassword) {
      setErrorMsg("Las contraseñas no coinciden.");
      return;
    }

    try {
      setPasswordSaving(true);
      const auth = getAuth();
      if (!auth.currentUser) {
        throw new Error("No hay usuario autenticado.");
      }

      await updatePassword(auth.currentUser, passwordForm.newPassword);
      setSuccessMsg("Contraseña actualizada correctamente.");
      setPasswordForm({
        newPassword: "",
        confirmNewPassword: "",
      });
    } catch (err) {
      console.error("Error cambiando contraseña:", err);
      let msg = "No se pudo actualizar la contraseña.";
      if (err.code === "auth/requires-recent-login") {
        msg += " Por seguridad, vuelve a iniciar sesión y prueba de nuevo.";
      }
      setErrorMsg(msg);
    } finally {
      setPasswordSaving(false);
    }
  };

  // -------- FOTO DE PERFIL (con compresión) --------
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

    if (!file.type.startsWith("image/")) {
      alert("Selecciona una imagen válida.");
      e.target.value = "";
      return;
    }

    if (file.size > 15 * 1024 * 1024) {
      alert("La imagen es demasiado grande (más de 15MB). Elige otra por favor.");
      e.target.value = "";
      return;
    }

    const reader = new FileReader();

    reader.onloadend = () => {
      const baseDataUrl = reader.result;
      const img = new Image();

      img.onload = async () => {
        try {
          const maxSize = 900;
          let { width, height } = img;

          if (width > maxSize || height > maxSize) {
            const scale = Math.min(maxSize / width, maxSize / height);
            width = Math.round(width * scale);
            height = Math.round(height * scale);
          }

          const canvas = document.createElement("canvas");
          canvas.width = width;
          canvas.height = height;
          const ctx = canvas.getContext("2d");

          if (!ctx) {
            throw new Error("No se pudo obtener el contexto del canvas.");
          }

          ctx.drawImage(img, 0, 0, width, height);

          const compressedDataUrl = canvas.toDataURL("image/jpeg", 0.8);

          setSaving(true);
          setErrorMsg("");
          setSuccessMsg("");

          const userRef = doc(db, "users", user.uid);
          await updateDoc(userRef, { profilePicture: compressedDataUrl });

          setProfile((prev) => ({
            ...prev,
            profilePicture: compressedDataUrl,
          }));

          setSuccessMsg("Foto de perfil actualizada.");
        } catch (err) {
          console.error("Error subiendo foto de perfil:", err);
          setErrorMsg("No se pudo actualizar la foto de perfil.");
        } finally {
          setSaving(false);
          e.target.value = "";
        }
      };

      img.onerror = () => {
        console.error("No se pudo cargar la imagen para comprimir.");
        setErrorMsg("No se pudo procesar la imagen seleccionada.");
        e.target.value = "";
      };

      img.src = baseDataUrl;
    };

    reader.readAsDataURL(file);
  };

  // -------- LOGOUT --------
  const handleLogout = async () => {
    try {
      await logout();
       localStorage.removeItem("padel-remembered-credentials");
    } catch (err) {
      console.error("Error al cerrar sesión:", err);
    }
  };

  // -------- RENDER --------
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
          maxWidth: 480,
          margin: "0 auto",
          display: "flex",
          flexDirection: "column",
          gap: "1rem",
          paddingBottom: "0.75rem",
        }}
      >
        {/* CARD PERFIL SKELETON */}
        <section
          style={{
            position: "relative",
            borderRadius: "1rem",
            padding: "1rem",
            border: "1px solid var(--border)",
            background: "var(--bg-elevated)",
            display: "flex",
            flexDirection: "column",
            gap: "0.9rem",
          }}
        >
          {/* engrane */}
          <div
            className="skeleton"
            style={{
              position: "absolute",
              top: 10,
              right: 10,
              width: 22,
              height: 22,
              borderRadius: "999px",
            }}
          />

          <div
            style={{
              display: "flex",
              gap: "1rem",
              alignItems: "center",
            }}
          >
            {/* avatar */}
            <div
              className="skeleton"
              style={{
                width: 110,
                height: 110,
                borderRadius: "999px",
              }}
            />

            {/* texto + rango */}
            <div style={{ flex: 1, minWidth: 0 }}>
              {/* nombre */}
              <div
                className="skeleton"
                style={{
                  height: 16,
                  width: "60%",
                  borderRadius: 999,
                  marginBottom: 8,
                }}
              />
              {/* correo */}
              <div
                className="skeleton"
                style={{
                  height: 12,
                  width: "80%",
                  borderRadius: 999,
                  marginBottom: 6,
                }}
              />
              {/* diestro / estilo */}
              <div
                className="skeleton"
                style={{
                  height: 10,
                  width: "50%",
                  borderRadius: 999,
                  marginBottom: 16,
                }}
              />

              {/* rango + barra */}
              <div
                style={{
                  display: "flex",
                  alignItems: "center",
                  gap: "0.6rem",
                }}
              >
                <div
                  className="skeleton"
                  style={{
                    width: 86,
                    height: 86,
                    borderRadius: "1.2rem",
                  }}
                />
                <div style={{ flex: 1 }}>
                  <div
                    className="skeleton"
                    style={{
                      height: 12,
                      width: "50%",
                      borderRadius: 999,
                      marginBottom: 8,
                    }}
                  />
                  <div
                    className="skeleton"
                    style={{
                      height: 9,
                      width: "100%",
                      borderRadius: 999,
                      marginBottom: 6,
                    }}
                  />
                  <div
                    className="skeleton"
                    style={{
                      height: 8,
                      width: "70%",
                      borderRadius: 999,
                    }}
                  />
                </div>
              </div>
            </div>
          </div>
        </section>

        {/* RESUMEN SKELETON */}
        <section>
          <div
            className="skeleton"
            style={{
              height: 14,
              width: 85,
              borderRadius: 999,
              marginBottom: "0.5rem",
            }}
          />
          <div
            style={{
              display: "grid",
              gridTemplateColumns: "repeat(3, minmax(0, 1fr))",
              gap: "0.7rem",
            }}
          >
            {[1, 2, 3, 4, 5, 6].map((i) => (
              <div
                key={i}
                className="skeleton"
                style={{
                  borderRadius: "1rem",
                  height: 66,
                }}
              />
            ))}
          </div>
        </section>

        {/* ACTIVIDAD EN TORNEOS SKELETON */}
        <section>
          <div
            style={{
              display: "flex",
              justifyContent: "space-between",
              alignItems: "center",
              marginBottom: "0.4rem",
            }}
          >
            <div
              className="skeleton"
              style={{
                height: 14,
                width: 130,
                borderRadius: 999,
              }}
            />
            <div
              className="skeleton"
              style={{
                height: 10,
                width: 90,
                borderRadius: 999,
              }}
            />
          </div>
          <div
            className="skeleton"
            style={{
              borderRadius: "1rem",
              height: 90,
            }}
          />
          <div
            className="skeleton"
            style={{
              marginTop: "0.4rem",
              height: 10,
              width: "70%",
              borderRadius: 999,
            }}
          />
        </section>

        {/* PARTIDOS RECIENTES SKELETON */}
        <section>
          <div
            className="skeleton"
            style={{
              height: 14,
              width: 120,
              borderRadius: 999,
              marginBottom: "0.4rem",
            }}
          />
          <div
            style={{
              display: "flex",
              flexDirection: "column",
              gap: "0.35rem",
            }}
          >
            {[1, 2, 3].map((i) => (
              <article
                key={i}
                style={{
                  borderRadius: "0.7rem",
                  border: "1px solid var(--border)",
                  padding: "0.5rem 0.55rem",
                  background: "var(--bg-elevated)",
                  display: "flex",
                  alignItems: "center",
                  gap: "0.5rem",
                }}
              >
                <div
                  className="skeleton"
                  style={{
                    width: 6,
                    alignSelf: "stretch",
                    borderRadius: 999,
                  }}
                />
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div
                    className="skeleton"
                    style={{
                      height: 12,
                      width: "75%",
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
                <div
                  className="skeleton"
                  style={{
                    width: 50,
                    height: 16,
                    borderRadius: 999,
                  }}
                />
              </article>
            ))}
          </div>
        </section>

        {/* Estilos del skeleton (igual idea que en Torneos) */}
        <style>{`
          .skeleton {
            position: relative;
            overflow: hidden;
            background: linear-gradient(
              90deg,
              rgba(148,163,184,0.22),
              rgba(148,163,184,0.35),
              rgba(148,163,184,0.22)
            );
            background-size: 200% 100%;
            animation: shimmer-profile 1.3s infinite;
          }

          @keyframes shimmer-profile {
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

  const pl = profile.leaguePoints || 0;
  const rankInfo = getRankInfoFromData(profile.rank, pl);
  const accumulatedPL = computeAccumulatedPL(rankInfo.label, pl);

  const recentMatches = stats.recentMatches || [];
  const limitedMatches = recentMatches.slice(0, 5);
  const hasMoreMatches = recentMatches.length > 5;

  const monthlyActivity = buildMonthlyActivity(recentMatches);
  const maxActivity =
    monthlyActivity.length > 0
      ? Math.max(...monthlyActivity.map((m) => m.value))
      : 0;

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
        {/* INPUT HIDDEN PARA FOTO */}
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
            background:
              "radial-gradient(circle at 0% 0%, rgba(255, 255, 255, 0.07), transparent 55%), var(--bg-elevated)",
            display: "flex",
            flexDirection: "column",
            gap: "0.9rem",
          }}
        >
          {/* Engrane */}
          <button
            type="button"
            onClick={() => {
              setEditMode((prev) => !prev);
              setErrorMsg("");
              setSuccessMsg("");
              setLocalEdit({
                name: profile.name,
                email: profile.email,
                handedness: profile.handedness,
                style: profile.style,
              });
            }}
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

          {/* Fila principal: avatar + datos + rango */}
          <div
            style={{
              display: "flex",
              gap: "1rem",
              alignItems: "center",
            }}
          >
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
                  boxShadow: "0 18px 45px rgba(15,23,42,0.65)",
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
                    margin: "0.25rem 0 0",
                    fontSize: "0.72rem",
                    color: "var(--muted)",
                    textAlign: "center",
                  }}
                >
                  Toca para cambiar foto
                </p>
              )}
            </button>

            {/* Info y rango */}
            <div style={{ flex: 1, minWidth: 0 }}>
              {!editMode ? (
                <>
                  <h2
                    style={{
                      margin: 0,
                      fontSize: "1.05rem",
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
                  {(profile.handedness || profile.style) && (
                    <p
                      style={{
                        margin: "0.15rem 0 0",
                        fontSize: "0.76rem",
                        color: "var(--muted)",
                      }}
                    >
                      {profile.handedness && `${profile.handedness} · `}
                      {profile.style}
                    </p>
                  )}
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
                      onChange={(e) => handleChange("name", e.target.value)}
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
                      onChange={(e) => handleChange("email", e.target.value)}
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

                  <div
                    style={{
                      display: "flex",
                      gap: "0.45rem",
                      flexWrap: "wrap",
                    }}
                  >

                  </div>
                </>
              )}

              {/* Rango, PL y barra de progreso */}
              <div
                style={{
                  marginTop: "0.55rem",
                  display: "flex",
                  alignItems: "center",
                  gap: "0.6rem",
                }}
              >
                {/* Imagen de rango */}
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
                      width: 86,
                      height: 86,
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
                      height: 9,
                      borderRadius: 999,
                      backgroundColor: "rgba(15,23,42,0.08)",
                      overflow: "hidden",
                      boxShadow: "inset 0 0 0 1px rgba(148,163,184,0.25)",
                    }}
                  >
                    <div
                      style={{
                        width: `${animatedProgress}%`,
                        height: "100%",
                        background:
                          "linear-gradient(90deg, rgba(59,130,246,1), rgba(56,189,248,1))",
                        boxShadow:
                          "0 0 12px rgba(56,189,248,0.7), 0 0 22px rgba(56,189,248,0.45)",
                        transition: "width 0.7s ease-out",
                      }}
                    />
                  </div>
                  <p
                    style={{
                      margin: "0.2rem 0 0",
                      fontSize: "0.7rem",
                      color: "var(--muted)",
                    }}
                  >
                    Toca el escudo para ver el sistema de ligas y rangos.
                  </p>
                </div>
              </div>
            </div>
          </div>

          {/* BOTONES GUARDAR / CANCELAR / LOGOUT + CONTRASEÑA */}
          {editMode && (
            <div
              style={{
                marginTop: "0.8rem",
                display: "flex",
                flexDirection: "column",
                gap: "0.7rem",
              }}
            >
              <div
                style={{
                  display: "flex",
                  gap: "0.5rem",
                  flexWrap: "wrap",
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
                    setPasswordForm({
                      newPassword: "",
                      confirmNewPassword: "",
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
              </div>

              {/* Cambio de contraseña */}
              <div
                style={{
                  borderRadius: "0.9rem",
                  padding: "0.7rem 0.75rem",
                  background:
                    "linear-gradient(135deg, rgba(148,163,184,0.16), transparent), var(--bg-elevated)",
                  border: "1px solid var(--border)",
                  display: "flex",
                  flexDirection: "column",
                  gap: "0.4rem",
                }}
              >
                <div
                  style={{
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "space-between",
                    gap: "0.4rem",
                  }}
                >
                  <div>
                    <p
                      style={{
                        margin: 0,
                        fontSize: "0.8rem",
                        fontWeight: 600,
                      }}
                    >
                      Cambiar contraseña
                    </p>
                    <p
                      style={{
                        margin: 0,
                        marginTop: "0.1rem",
                        fontSize: "0.72rem",
                        color: "var(--muted)",
                      }}
                    >
                      Refuerza la seguridad de tu cuenta.
                    </p>
                  </div>
                  <div
                    style={{
                      width: 26,
                      height: 26,
                      borderRadius: "999px",
                      border: "1px solid var(--border)",
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "center",
                      background: "var(--bg)",
                    }}
                  >
                    <Icon name="lock" size={16} color="var(--fg)" />
                  </div>
                </div>

                <label
                  style={{
                    display: "block",
                    fontSize: "0.74rem",
                    color: "var(--muted)",
                    marginTop: "0.25rem",
                  }}
                >
                  Nueva contraseña
                  <input
                    type="password"
                    value={passwordForm.newPassword}
                    onChange={(e) =>
                      handlePasswordFieldChange("newPassword", e.target.value)
                    }
                    style={{
                      marginTop: "0.15rem",
                      width: "100%",
                      padding: "0.35rem 0.45rem",
                      borderRadius: "0.55rem",
                      border: "1px solid rgba(148,163,184,0.7)",
                      background: "var(--bg)",
                      color: "var(--fg)",
                      fontSize: "0.8rem",
                    }}
                  />
                </label>

                <label
                  style={{
                    display: "block",
                    fontSize: "0.74rem",
                    color: "var(--muted)",
                  }}
                >
                  Confirmar contraseña
                  <input
                    type="password"
                    value={passwordForm.confirmNewPassword}
                    onChange={(e) =>
                      handlePasswordFieldChange(
                        "confirmNewPassword",
                        e.target.value
                      )
                    }
                    style={{
                      marginTop: "0.15rem",
                      width: "100%",
                      padding: "0.35rem 0.45rem",
                      borderRadius: "0.55rem",
                      border: "1px solid rgba(148,163,184,0.7)",
                      background: "var(--bg)",
                      color: "var(--fg)",
                      fontSize: "0.8rem",
                    }}
                  />
                </label>

                <button
                  type="button"
                  onClick={handleUpdatePassword}
                  disabled={passwordSaving}
                  style={{
                    marginTop: "0.3rem",
                    width: "100%",
                    borderRadius: "999px",
                    padding: "0.45rem 0.8rem",
                    border: "none",
                    background:
                      "linear-gradient(90deg, rgba(16,185,129,1), rgba(45,212,191,1))",
                    color: "#fff",
                    fontSize: "0.8rem",
                    fontWeight: 600,
                    cursor: passwordSaving ? "default" : "pointer",
                    opacity: passwordSaving ? 0.7 : 1,
                  }}
                >
                  {passwordSaving ? "Actualizando..." : "Actualizar contraseña"}
                </button>
              </div>

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
                  marginTop: "0.1rem",
                }}
              >
                <Icon name="logout" size={14} color="rgb(248,113,113)" />
                Cerrar sesión
              </button>
            </div>
          )}
        </section>

    {/* RESUMEN ESTADÍSTICAS (cards sueltas y más grandes) */}
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
          display: "grid",
          gridTemplateColumns: "repeat(3, minmax(0, 1fr))",
          gap: "0.7rem",
        }}
      >
        <MiniStatCard label="Partidos" value={stats.totalMatches} />
        <MiniStatCard label="Victorias" value={stats.wins} />
        <MiniStatCard label="Derrotas" value={stats.losses} />
        <MiniStatCard label="Winrate" value={stats.winRate} suffix="%" />
        <MiniStatCard
          label="Torneos"
          value={stats.tournamentsPlayed}
        />
        <MiniStatCard
          label="PL Acumulados"
          value={accumulatedPL}
          suffix="PL"
        />
      </div>
    </section>

        {/* GRÁFICA DE ACTIVIDAD EN TORNEOS (card separada) */}
        <section>
          <div
            style={{
              borderRadius: "1rem",
              border: "1px solid var(--border)",
              padding: "0.8rem 0.9rem 0.9rem",
              background:
                "linear-gradient(135deg, rgba(59,130,246,0.14), rgba(56,189,248,0.08)), var(--bg-elevated)",
              display: "flex",
              flexDirection: "column",
              gap: "0.6rem",
            }}
          >
            <div
              style={{
                display: "flex",
                justifyContent: "space-between",
                alignItems: "center",
              }}
            >
              <h3
                style={{
                  margin: 0,
                  fontSize: "0.9rem",
                }}
              >
                Actividad en Torneos
              </h3>
              <span
                style={{
                  fontSize: "0.72rem",
                  color: "var(--muted)",
                }}
              >
                Últimos 6 meses
              </span>
            </div>

            {monthlyActivity.length === 0 || maxActivity === 0 ? (
              <p
                style={{
                  margin: 0,
                  fontSize: "0.78rem",
                  color: "var(--muted)",
                }}
              >
                Cuando empieces a jugar torneos, verás aquí tu historial de
                actividad.
              </p>
            ) : (
            <div
              style={{
                display: "flex",
                alignItems: "flex-end",
                gap: "0.6rem",
                height: 90, // puedes dejarlo así, no crecerá más
              }}
            >
              {monthlyActivity.map((m) => {
                if (!maxActivity) return null;

                const relative = m.value / maxActivity;
                // Más diferencia entre valores pequeños y grandes
                const heightPct =
                  m.value === 0 ? 8 : 35 + Math.pow(relative, 0.8) * 65; // 35%–100%

                return (
                  <div
                    key={`${m.label}-${m.year}`}
                    style={{
                      flex: 1,
                      display: "flex",
                      flexDirection: "column",
                      alignItems: "center",
                      gap: "0.18rem",
                      fontSize: "0.72rem",
                    }}
                  >
                    {/* número de partidos */}
                    <span
                      style={{
                        color: "var(--muted)",
                        minHeight: "1rem",
                      }}
                    >
                      {m.value > 0 ? `${m.value}` : "·"}
                    </span>

                    {/* CONTENEDOR DE ALTURA FIJA PARA LA BARRA */}
                    <div
                      style={{
                        width: "100%",
                        height: 40, // aquí decides qué tan alta puede ser la barra
                        display: "flex",
                        alignItems: "flex-end",
                      }}
                    >
                      <div
                        style={{
                          width: "100%",
                          borderRadius: "8px",
                          background:
                            "linear-gradient(180deg, rgba(56, 191, 248, 1), rgba(59, 131, 246, 0.29))",
                          height: `${heightPct}%`, // ahora sí porcentaje de esos 40px
                          minHeight: m.value > 0 ? 6 : 3,
                          boxShadow:
                            "0 0 14px rgba(56, 191, 248, 0.04), 0 8px 14px rgba(0, 0, 0, 0.1)",
                          transition: "height 0.7s ease-out",
                        }}
                      />
                    </div>

                    {/* etiqueta del mes */}
                    <span
                      style={{
                        color: "var(--muted)",
                        textTransform: "uppercase",
                        marginTop: "0.1rem",
                      }}
                    >
                      {m.label}
                    </span>
                  </div>
                );
              })}
            </div>
            )}
          </div>
            <p
            style={{
              margin: "0.4rem 0 0",
              fontSize: "0.72rem",
              color: "var(--muted)",
            }}
          >
            Cada barra representa la cantidad de partidos jugados en ese mes.
          </p>
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
            <>
              <div
                style={{
                  display: "flex",
                  flexDirection: "column",
                  gap: "0.35rem",
                }}
              >
                {limitedMatches.map((m, idx) => {
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
                    <RecentMatchCard
                      key={m.id || idx}
                      title={title}
                      score={score}
                      dateStr={dateStr}
                      plDelta={plDelta}
                      plText={plText}
                    />
                  );
                })}
              </div>

              {hasMoreMatches && (
                <button
                  type="button"
                  onClick={() => setShowAllMatches(true)}
                  style={{
                    marginTop: "0.55rem",
                    alignSelf: "flex-start",
                    borderRadius: "999px",
                    padding: "0.35rem 0.8rem",
                    border: "1px solid var(--border)",
                    background: "var(--bg-elevated)",
                    color: "var(--fg)",
                    fontSize: "0.78rem",
                    display: "flex",
                    alignItems: "center",
                    gap: "0.3rem",
                    cursor: "pointer",
                  }}
                >
                  <Icon name="history" size={14} color="var(--muted)" />
                  Ver todos los partidos
                </button>
              )}
            </>
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

      {/* MODAL PARTIDOS RECIENTES COMPLETO */}
      {showAllMatches && (
        <div
          style={{
            position: "fixed",
            inset: 0,
            background: "rgba(15,23,42,0.65)",
            display: "flex",
            justifyContent: "center",
            alignItems: "flex-end",
            zIndex: 50,
          }}
        >
          <div
            style={{
              width: "100%",
              maxWidth: 480,
              maxHeight: "80vh",
              background: "var(--bg-elevated)",
              borderTopLeftRadius: "1.2rem",
              borderTopRightRadius: "1.2rem",
              padding: "0.9rem 0.9rem 1rem",
              boxShadow: "0 -20px 45px rgba(15,23,42,0.85)",
            }}
          >
            <div
              style={{
                display: "flex",
                alignItems: "center",
                justifyContent: "space-between",
                marginBottom: "0.5rem",
              }}
            >
              <h3
                style={{
                  margin: 0,
                  fontSize: "0.95rem",
                }}
              >
                Todos tus partidos
              </h3>
              <button
                type="button"
                onClick={() => setShowAllMatches(false)}
                style={{
                  border: "none",
                  background: "transparent",
                  padding: 0,
                  cursor: "pointer",
                }}
              >
                <div
                  style={{
                    width: 28,
                    height: 28,
                    borderRadius: "999px",
                    border: "1px solid var(--border)",
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                    background: "var(--bg)",
                  }}
                >
                  <Icon name="x" size={16} color="var(--fg)" />
                </div>
              </button>
            </div>

            <div
              style={{
                fontSize: "0.75rem",
                color: "var(--muted)",
                marginBottom: "0.35rem",
              }}
            >
              Revisa todo tu historial reciente sin saturar la pantalla
              principal del perfil.
            </div>

            <div
              style={{
                marginTop: "0.35rem",
                display: "flex",
                flexDirection: "column",
                gap: "0.35rem",
                overflowY: "auto",
                maxHeight: "60vh",
                paddingRight: "0.1rem",
              }}
            >
              {recentMatches.map((m, idx) => {
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
                  <RecentMatchCard
                    key={m.id || `modal-${idx}`}
                    title={title}
                    score={score}
                    dateStr={dateStr}
                    plDelta={plDelta}
                    plText={plText}
                  />
                );
              })}
            </div>
          </div>
        </div>
      )}
    </>
  );
}

// ------- COMPONENTES AUXILIARES -------

function MiniStatCard({ label, value, suffix }) {
  return (
    <div
      style={{
        borderRadius: "1rem",
        border: "1px solid var(--border)",
        padding: "0.75rem 0.85rem",
        background: "var(--bg-elevated)",
      }}
    >
      <p
        style={{
          margin: 0,
          fontSize: "0.8rem",
          color: "var(--muted)",
        }}
      >
        {label}
      </p>
      <p
        style={{
          margin: 0,
          marginTop: "0.2rem",
          fontSize: "1rem",
          fontWeight: 600,
        }}
      >
        {value}
        {suffix ? ` ${suffix}` : ""}
      </p>
    </div>
  );
}

function RecentMatchCard({ title, score, dateStr, plDelta, plText }) {
  return (
    <div
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
}

// ------- GRÁFICA: ACTIVIDAD POR MES -------

function buildMonthlyActivity(recentMatches) {
  if (!Array.isArray(recentMatches) || recentMatches.length === 0) return [];

  const now = new Date();
  const monthNames = [
    "ENE",
    "FEB",
    "MAR",
    "ABR",
    "MAY",
    "JUN",
    "JUL",
    "AGO",
    "SEP",
    "OCT",
    "NOV",
    "DIC",
  ];

  const buckets = [];

  // últimos 6 meses (incluyendo el actual)
  for (let i = 5; i >= 0; i--) {
    const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
    const key = `${d.getFullYear()}-${d.getMonth()}`;
    buckets.push({
      key,
      label: monthNames[d.getMonth()],
      year: d.getFullYear(),
      value: 0,
    });
  }

  recentMatches.forEach((m) => {
    if (!m.date) return;
    const dt = new Date(m.date);
    if (Number.isNaN(dt.getTime())) return;
    const key = `${dt.getFullYear()}-${dt.getMonth()}`;
    const bucket = buckets.find((b) => b.key === key);
    if (bucket) {
      bucket.value += 1;
    }
  });

  return buckets;
}
