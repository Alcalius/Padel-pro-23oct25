import { useEffect, useState, useMemo } from "react";
import {
  collection,
  addDoc,
  onSnapshot,
  doc,
  updateDoc,
  getDoc,
} from "firebase/firestore";
import { db } from "../firebase/firebase";
import { useAuth } from "../context/AuthContext";
import Icon from "../components/common/Icon";

export default function Clubes() {
  const { user } = useAuth();
  const [clubs, setClubs] = useState([]);
  const [loading, setLoading] = useState(true);

  const [showCreate, setShowCreate] = useState(false);
  const [showJoin, setShowJoin] = useState(false);

  const [createForm, setCreateForm] = useState({
    name: "",
    description: "",
    password: "",
  });

  const [joinClubId, setJoinClubId] = useState("");
  const [joinPassword, setJoinPassword] = useState("");

  const [saving, setSaving] = useState(false);
  const [errorMsg, setErrorMsg] = useState("");
  const [successMsg, setSuccessMsg] = useState("");

  // Club activo del usuario (solo 1) y club seleccionado para gestionar
  const [activeClubId, setActiveClubId] = useState(null);
  const [selectedClubId, setSelectedClubId] = useState(null);

  // Gestión de club seleccionado
  const [editClubForm, setEditClubForm] = useState({
    name: "",
    description: "",
    password: "",
  });
  const [membersInfo, setMembersInfo] = useState({}); // uid -> {name, email, photoURL}
  const [loadingMembers, setLoadingMembers] = useState(false);

  const userId = user?.uid || null;

  // Escuchar la colección de clubes en tiempo real
  useEffect(() => {
    const unsub = onSnapshot(
      collection(db, "clubs"),
      (snapshot) => {
        const data = snapshot.docs.map((d) => ({ id: d.id, ...d.data() }));
        setClubs(data);
        setLoading(false);
      },
      (err) => {
        console.error("Error escuchando clubs:", err);
        setLoading(false);
      }
    );

    return () => unsub();
  }, []);

  // Cargar club activo del usuario desde Firestore
  useEffect(() => {
    const fetchUserActiveClub = async () => {
      if (!userId) return;
      try {
        const refUser = doc(db, "users", userId);
        const snap = await getDoc(refUser);
        if (snap.exists()) {
          const data = snap.data();
          if (data.activeClubId) {
            setActiveClubId(data.activeClubId);
          }
        }
      } catch (err) {
        console.error("Error cargando club activo del usuario:", err);
      }
    };

    fetchUserActiveClub();
  }, [userId]);

  // Clubs donde soy miembro
  const myClubs = useMemo(() => {
    if (!userId) return [];
    return clubs.filter(
      (c) => Array.isArray(c.members) && c.members.includes(userId)
    );
  }, [clubs, userId]);

  // Clubs donde NO soy miembro
  const otherClubs = useMemo(() => {
    if (!userId) return [];
    return clubs.filter(
      (c) => !Array.isArray(c.members) || !c.members.includes(userId)
    );
  }, [clubs, userId]);

  // Club actualmente seleccionado para gestionar
  const selectedClub = useMemo(
    () => myClubs.find((c) => c.id === selectedClubId) || null,
    [myClubs, selectedClubId]
  );

  const isAdmin = useMemo(
    () => !!(selectedClub && userId && selectedClub.createdBy === userId),
    [selectedClub, userId]
  );

  const handleCreateChange = (field, value) => {
    setCreateForm((prev) => ({ ...prev, [field]: value }));
  };

  const resetMessages = () => {
    setErrorMsg("");
    setSuccessMsg("");
  };

  // Crear club
  const handleCreateClub = async (e) => {
    e.preventDefault();
    if (!userId) return;

    resetMessages();
    setSaving(true);

    try {
      if (!createForm.name.trim()) {
        setErrorMsg("El nombre del club es obligatorio.");
        return;
      }

      const payload = {
        name: createForm.name.trim(),
        description: createForm.description.trim(),
        password: createForm.password.trim() || "",
        createdBy: userId,
        members: [userId],
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      };

      const docRef = await addDoc(collection(db, "clubs"), payload);

      setCreateForm({ name: "", description: "", password: "" });
      setShowCreate(false);
      setSuccessMsg(`¡Club "${payload.name}" creado correctamente!`);

      // Opcional: si no hay club activo aún, podríamos dejar que usuario lo marque manualmente.
      // Si quisieras activarlo automáticamente, aquí podrías llamar a handleSetActiveClub(docRef.id)
      // pero por ahora lo dejamos manual para que el usuario lo decida.
    } catch (err) {
      console.error("Error al crear club:", err);
      setErrorMsg("No se pudo crear el club.");
    } finally {
      setSaving(false);
    }
  };

  // Unirse a club
  const handleJoinClub = async (e) => {
    e.preventDefault();
    if (!userId) return;

    resetMessages();
    setSaving(true);

    try {
      const club = clubs.find((c) => c.id === joinClubId);
      if (!club) {
        setErrorMsg("Club no encontrado.");
        return;
      }

      if (Array.isArray(club.members) && club.members.includes(userId)) {
        setErrorMsg("Ya eres miembro de este club.");
        return;
      }

      if (
        club.password &&
        club.password.trim() !== "" &&
        club.password !== joinPassword
      ) {
        setErrorMsg("Contraseña incorrecta.");
        return;
      }

      const ref = doc(db, "clubs", club.id);
      await updateDoc(ref, {
        members: Array.isArray(club.members)
          ? [...club.members, userId]
          : [userId],
        updatedAt: new Date().toISOString(),
      });

      setJoinClubId("");
      setJoinPassword("");
      setShowJoin(false);
      setSuccessMsg(`Te has unido a "${club.name}".`);
    } catch (err) {
      console.error("Error al unirse al club:", err);
      setErrorMsg("No se pudo unir al club.");
    } finally {
      setSaving(false);
    }
  };

  // Seleccionar un club de "Mis clubes" para gestionarlo
  const handleSelectClub = (club) => {
    if (!club) {
      setSelectedClubId(null);
      setMembersInfo({});
      return;
    }

    setSelectedClubId(club.id);
    setEditClubForm({
      name: club.name || "",
      description: club.description || "",
      password: club.password || "",
    });
  };

  // Cargar info básica de miembros (nombre, email, foto) cuando cambia selectedClub
  useEffect(() => {
    const loadMembers = async () => {
      if (!selectedClub || !Array.isArray(selectedClub.members)) {
        setMembersInfo({});
        return;
      }

      setLoadingMembers(true);
      const result = {};

      try {
        await Promise.all(
          selectedClub.members.map(async (uid) => {
            try {
              const refUser = doc(db, "users", uid);
              const snap = await getDoc(refUser);
              if (snap.exists()) {
                const data = snap.data();
                const name =
                  data.name ||
                  data.displayName ||
                  (data.email ? data.email.split("@")[0] : "Jugador");
                const photo =
                  data.profilePicture || data.photoURL || "";
                result[uid] = {
                  name,
                  email: data.email || "",
                  photoURL: photo,
                };
              } else {
                result[uid] = {
                  name: "Jugador",
                  email: "",
                  photoURL: "",
                };
              }
            } catch (err) {
              console.error("Error cargando usuario:", err);
              result[uid] = {
                name: "Jugador",
                email: "",
                photoURL: "",
              };
            }
          })
        );
        setMembersInfo(result);
      } catch (err) {
        console.error("Error cargando miembros:", err);
      } finally {
        setLoadingMembers(false);
      }
    };

    loadMembers();
  }, [selectedClub]);

  // Actualizar campos de edición de club (admin)
  const handleEditClubFieldChange = (field, value) => {
    setEditClubForm((prev) => ({
      ...prev,
      [field]: value,
    }));
  };

  // Guardar cambios del club (admin)
  const handleSaveClubChanges = async () => {
    if (!selectedClub || !isAdmin) return;

    resetMessages();
    setSaving(true);

    try {
      const updates = {};
      if (
        editClubForm.name &&
        editClubForm.name.trim() !== selectedClub.name
      ) {
        updates.name = editClubForm.name.trim();
      }
      if (
        editClubForm.description !== undefined &&
        editClubForm.description !== selectedClub.description
      ) {
        updates.description = editClubForm.description.trim();
      }
      if (editClubForm.password !== selectedClub.password) {
        updates.password = (editClubForm.password || "").trim();
      }

      if (Object.keys(updates).length === 0) {
        setSuccessMsg("No hay cambios que guardar.");
        return;
      }

      const ref = doc(db, "clubs", selectedClub.id);
      await updateDoc(ref, {
        ...updates,
        updatedAt: new Date().toISOString(),
      });

      setSuccessMsg("Cambios del club guardados.");
    } catch (err) {
      console.error("Error actualizando club:", err);
      setErrorMsg("No se pudieron guardar los cambios del club.");
    } finally {
      setSaving(false);
    }
  };

  // Establecer club activo en el usuario
  const handleSetActiveClub = async (clubId) => {
    if (!userId) return;

    resetMessages();
    setSaving(true);

    try {
      const refUser = doc(db, "users", userId);
      await updateDoc(refUser, {
        activeClubId: clubId || null,
        updatedAt: new Date().toISOString(),
      });

      setActiveClubId(clubId || null);

      const club = clubs.find((c) => c.id === clubId);
      if (club) {
        setSuccessMsg(`"${club.name}" es ahora tu club activo.`);
      } else {
        setSuccessMsg("Club activo actualizado.");
      }
    } catch (err) {
      console.error("Error al establecer club activo:", err);
      setErrorMsg("No se pudo establecer el club activo.");
    } finally {
      setSaving(false);
    }
  };

  // Salir del club
  const handleLeaveClub = async (club) => {
    if (!club || !userId) return;

    resetMessages();
    setSaving(true);

    try {
      if (!Array.isArray(club.members) || !club.members.includes(userId)) {
        setErrorMsg("No perteneces a este club.");
        return;
      }

      const newMembers = club.members.filter((id) => id !== userId);
      const ref = doc(db, "clubs", club.id);
      await updateDoc(ref, {
        members: newMembers,
        updatedAt: new Date().toISOString(),
      });

      // Si este club era el activo, lo limpiamos del usuario
      if (activeClubId === club.id) {
        try {
          const refUser = doc(db, "users", userId);
          await updateDoc(refUser, {
            activeClubId: null,
            updatedAt: new Date().toISOString(),
          });
          setActiveClubId(null);
        } catch (err2) {
          console.error("Error limpiando club activo:", err2);
        }
      }

      // Si es el club que estamos gestionando, cerramos panel
      if (selectedClubId === club.id) {
        setSelectedClubId(null);
        setMembersInfo({});
      }

      setSuccessMsg(`Has salido de "${club.name}".`);
    } catch (err) {
      console.error("Error al salir del club:", err);
      setErrorMsg("No se pudo salir del club.");
    } finally {
      setSaving(false);
    }
  };

  // Eliminar miembro (admin)
  const handleRemoveMember = async (memberId) => {
    if (!selectedClub || !isAdmin || !memberId) return;
    if (!Array.isArray(selectedClub.members)) return;

    // No nos eliminamos a nosotros mismos con esta acción
    if (memberId === userId) return;

    resetMessages();
    setSaving(true);

    try {
      const newMembers = selectedClub.members.filter((id) => id !== memberId);
      const ref = doc(db, "clubs", selectedClub.id);
      await updateDoc(ref, {
        members: newMembers,
        updatedAt: new Date().toISOString(),
      });

      setSuccessMsg("Miembro eliminado del club.");
    } catch (err) {
      console.error("Error eliminando miembro:", err);
      setErrorMsg("No se pudo eliminar al miembro.");
    } finally {
      setSaving(false);
    }
  };

  const activeClubInfo = useMemo(
    () =>
      activeClubId
        ? myClubs.find((c) => c.id === activeClubId) || null
        : null,
    [myClubs, activeClubId]
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
      {/* HEADER / INTRO + botones principales */}
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
                "linear-gradient(135deg, rgba(59,130,246,0.9), rgba(56,189,248,0.9))",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
            }}
          >
            <Icon name="club" size={20} color="#ffffff" />
          </div>
          <div style={{ minWidth: 0 }}>
            <h1
              style={{
                margin: 0,
                fontSize: "1.05rem",
                fontWeight: 700,
              }}
            >
              Clubes
            </h1>
            <p
              style={{
                margin: 0,
                marginTop: "0.15rem",
                fontSize: "0.78rem",
                color: "var(--muted)",
              }}
            >
              Define tu club activo para rankings, torneos y estadísticas.
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
                  color: activeClubInfo ? "var(--fg)" : "var(--muted)",
                }}
              >
                {activeClubInfo ? activeClubInfo.name : "ninguno"}
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
              setShowCreate(true);
              setShowJoin(false);
            }}
            style={{
              flex: 1,
              borderRadius: "999px",
              border: "none",
              padding: "0.55rem 0.7rem",
              background:
                "linear-gradient(135deg, var(--accent), rgba(59,130,246,0.9))",
              color: "#ffffff",
              fontSize: "0.85rem",
              fontWeight: 600,
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              gap: "0.35rem",
              cursor: "pointer",
            }}
          >
            <Icon name="add" size={16} color="#ffffff" />
            Crear club
          </button>
          <button
            type="button"
            onClick={() => {
              resetMessages();
              setShowJoin(true);
              setShowCreate(false);
            }}
            style={{
              flex: 1,
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
            <Icon name="users" size={16} color="var(--muted)" />
            Unirse
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

      {/* FORMULARIO CREAR CLUB */}
      {showCreate && (
        <section className="card">
          <h2
            style={{
              margin: 0,
              marginBottom: "0.6rem",
              fontSize: "0.95rem",
            }}
          >
            Crear nuevo club
          </h2>

          <form
            onSubmit={handleCreateClub}
            style={{
              display: "flex",
              flexDirection: "column",
              gap: "0.6rem",
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
                Nombre del club*
              </label>
              <input
                type="text"
                value={createForm.name}
                onChange={(e) => handleCreateChange("name", e.target.value)}
                placeholder="Ej. Padel Club Norte"
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
                Descripción
              </label>
              <textarea
                value={createForm.description}
                onChange={(e) =>
                  handleCreateChange("description", e.target.value)
                }
                placeholder="Describe tu club (opcional)"
                rows={3}
                style={{
                  width: "100%",
                  borderRadius: "0.8rem",
                  border: "1px solid var(--border)",
                  padding: "0.45rem 0.55rem",
                  backgroundColor: "var(--bg)",
                  color: "var(--fg)",
                  fontSize: "0.85rem",
                  resize: "vertical",
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
                Contraseña del club
              </label>
              <input
                type="password"
                value={createForm.password}
                onChange={(e) =>
                  handleCreateChange("password", e.target.value)
                }
                placeholder="Dejar vacío si quieres acceso libre"
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
                Si agregas una contraseña, los jugadores deberán ingresarla para
                unirse.
              </p>
            </div>

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
                {saving ? "Guardando..." : "Crear club"}
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

      {/* FORMULARIO UNIRSE A CLUB */}
      {showJoin && (
        <section className="card">
          <h2
            style={{
              margin: 0,
              marginBottom: "0.6rem",
              fontSize: "0.95rem",
            }}
          >
            Unirse a un club
          </h2>

          {otherClubs.length === 0 ? (
            <p
              style={{
                margin: 0,
                fontSize: "0.8rem",
                color: "var(--muted)",
              }}
            >
              Por ahora no hay otros clubes disponibles. Puedes crear uno nuevo.
            </p>
          ) : (
            <form
              onSubmit={handleJoinClub}
              style={{
                display: "flex",
                flexDirection: "column",
                gap: "0.6rem",
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
                  Selecciona un club
                </label>
                <select
                  value={joinClubId}
                  onChange={(e) => setJoinClubId(e.target.value)}
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
                  <option value="">Elige un club</option>
                  {otherClubs.map((club) => (
                    <option key={club.id} value={club.id}>
                      {club.name}
                      {club.members?.length
                        ? ` (${club.members.length} miembros)`
                        : ""}
                    </option>
                  ))}
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
                  Contraseña (si aplica)
                </label>
                <input
                  type="password"
                  value={joinPassword}
                  onChange={(e) => setJoinPassword(e.target.value)}
                  placeholder="Solo si el club la requiere"
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

              <div
                style={{
                  display: "flex",
                  gap: "0.5rem",
                  marginTop: "0.3rem",
                }}
              >
                <button
                  type="submit"
                  disabled={saving || !joinClubId}
                  style={{
                    flex: 1,
                    borderRadius: "0.9rem",
                    border: "none",
                    padding: "0.55rem 0.7rem",
                    background:
                      "linear-gradient(135deg, var(--accent), rgba(56,189,248,0.9))",
                    color: "#ffffff",
                    fontSize: "0.85rem",
                    fontWeight: 600,
                    cursor: saving || !joinClubId ? "default" : "pointer",
                  }}
                >
                  {saving ? "Uniendo..." : "Unirse"}
                </button>
                <button
                  type="button"
                  onClick={() => setShowJoin(false)}
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
          )}
        </section>
      )}

      {/* MIS CLUBES (título fuera, cards sueltas) */}
      <section>
        <h2
          style={{
            margin: 0,
            marginBottom: "0.4rem",
            fontSize: "0.95rem",
          }}
        >
          Mis clubes {loading ? "" : `(${myClubs.length})`}
        </h2>

        {loading ? (
          <p
            style={{
              margin: 0,
              fontSize: "0.8rem",
              color: "var(--muted)",
            }}
          >
            Cargando clubes...
          </p>
        ) : myClubs.length === 0 ? (
          <p
            style={{
              margin: 0,
              fontSize: "0.8rem",
              color: "var(--muted)",
            }}
          >
            Aún no formas parte de ningún club. Crea uno o únete desde arriba.
          </p>
        ) : (
          <div
            style={{
              display: "flex",
              flexDirection: "column",
              gap: "0.6rem",
            }}
          >
            {myClubs.map((club) => {
              const isSelected = selectedClubId === club.id;
              const isActive = activeClubId === club.id;

              return (
                <article
                  key={club.id}
                  onClick={() => handleSelectClub(club)}
                  style={{
                    borderRadius: "0.9rem",
                    border: isSelected
                      ? "1.5px solid var(--accent)"
                      : "1px solid var(--border)",
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
                        width: 28,
                        height: 28,
                        borderRadius: "0.75rem",
                        background:
                          "linear-gradient(135deg, rgba(59,130,246,0.95), rgba(16,185,129,0.9))",
                        display: "flex",
                        alignItems: "center",
                        justifyContent: "center",
                        flexShrink: 0,
                      }}
                    >
                      <Icon name="club" size={16} color="#ffffff" />
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
                        {club.name}
                      </p>
                      <p
                        style={{
                          margin: 0,
                          marginTop: "0.15rem",
                          fontSize: "0.75rem",
                          color: "var(--muted)",
                          overflow: "hidden",
                          textOverflow: "ellipsis",
                          whiteSpace: "nowrap",
                        }}
                      >
                        {club.members?.length || 1} jugadores •{" "}
                        {club.description || "Sin descripción"}
                      </p>
                    </div>

                    <div
                      style={{
                        display: "flex",
                        flexDirection: "column",
                        alignItems: "flex-end",
                        gap: "0.2rem",
                      }}
                    >
                      {isActive && (
                        <span
                          style={{
                            fontSize: "0.7rem",
                            padding: "0.1rem 0.4rem",
                            borderRadius: "999px",
                            border: "1px solid var(--accent)",
                            color: "var(--accent)",
                          }}
                        >
                          Activo
                        </span>
                      )}
                      <Icon
                        name={isSelected ? "chevron-down" : "chevron-right"}
                        size={16}
                        color="var(--muted)"
                      />
                    </div>
                  </div>
                </article>
              );
            })}
          </div>
        )}
      </section>

      {/* PANEL DE GESTIÓN DEL CLUB SELECCIONADO */}
      {selectedClub && (
        <section className="card">
          <h2
            style={{
              margin: 0,
              marginBottom: "0.5rem",
              fontSize: "0.95rem",
            }}
          >
            Gestión: {selectedClub.name}
          </h2>

          <p
            style={{
              margin: 0,
              marginBottom: "0.5rem",
              fontSize: "0.78rem",
              color: "var(--muted)",
            }}
          >
            {isAdmin
              ? "Eres administrador de este club. Puedes editar datos y gestionar jugadores."
              : "Eres miembro de este club."}
          </p>

          {/* Datos del club (editar solo admin) */}
          <div
            style={{
              display: "flex",
              flexDirection: "column",
              gap: "0.55rem",
              marginBottom: "0.7rem",
            }}
          >
            <div>
              <label
                style={{
                  fontSize: "0.75rem",
                  fontWeight: 600,
                  display: "block",
                  marginBottom: "0.15rem",
                }}
              >
                Nombre
              </label>
              <input
                type="text"
                value={editClubForm.name}
                onChange={(e) =>
                  handleEditClubFieldChange("name", e.target.value)
                }
                disabled={!isAdmin}
                style={{
                  width: "100%",
                  borderRadius: "0.8rem",
                  border: "1px solid var(--border)",
                  padding: "0.45rem 0.55rem",
                  backgroundColor: isAdmin ? "var(--bg)" : "var(--bg-elevated)",
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
                  marginBottom: "0.15rem",
                }}
              >
                Descripción
              </label>
              <textarea
                value={editClubForm.description}
                onChange={(e) =>
                  handleEditClubFieldChange("description", e.target.value)
                }
                disabled={!isAdmin}
                rows={2}
                style={{
                  width: "100%",
                  borderRadius: "0.8rem",
                  border: "1px solid var(--border)",
                  padding: "0.45rem 0.55rem",
                  backgroundColor: isAdmin ? "var(--bg)" : "var(--bg-elevated)",
                  color: "var(--fg)",
                  fontSize: "0.85rem",
                  resize: "vertical",
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
                  marginBottom: "0.15rem",
                }}
              >
                Contraseña del club
              </label>
              <input
                type="text"
                value={editClubForm.password}
                onChange={(e) =>
                  handleEditClubFieldChange("password", e.target.value)
                }
                disabled={!isAdmin}
                placeholder="Dejar vacío para acceso libre"
                style={{
                  width: "100%",
                  borderRadius: "0.8rem",
                  border: "1px solid var(--border)",
                  padding: "0.45rem 0.55rem",
                  backgroundColor: isAdmin ? "var(--bg)" : "var(--bg-elevated)",
                  color: "var(--fg)",
                  fontSize: "0.85rem",
                  outline: "none",
                }}
              />
            </div>
          </div>

          {/* Miembros */}
          <div
            style={{
              marginBottom: "0.7rem",
            }}
          >
            <div
              style={{
                display: "flex",
                justifyContent: "space-between",
                alignItems: "center",
                marginBottom: "0.3rem",
              }}
            >
              <h3
                style={{
                  margin: 0,
                  fontSize: "0.9rem",
                }}
              >
                Jugadores ({selectedClub.members?.length || 0})
              </h3>
            </div>

            {loadingMembers ? (
              <p
                style={{
                  margin: 0,
                  fontSize: "0.8rem",
                  color: "var(--muted)",
                }}
              >
                Cargando jugadores...
              </p>
            ) : !selectedClub.members ||
              !Array.isArray(selectedClub.members) ||
              selectedClub.members.length === 0 ? (
              <p
                style={{
                  margin: 0,
                  fontSize: "0.8rem",
                  color: "var(--muted)",
                }}
              >
                Este club aún no tiene jugadores.
              </p>
            ) : (
              <div
                style={{
                  display: "flex",
                  flexDirection: "column",
                  gap: "0.35rem",
                }}
              >
                {selectedClub.members.map((memberId) => {
                  const info = membersInfo[memberId] || {};
                  const isCurrent = memberId === userId;
                  const letter =
                    (info.name || "J")[0]?.toUpperCase() || "J";

                  return (
                    <div
                      key={memberId}
                      style={{
                        borderRadius: "0.7rem",
                        border: "1px solid var(--border)",
                        padding: "0.35rem 0.5rem",
                        display: "flex",
                        alignItems: "center",
                        justifyContent: "space-between",
                        gap: "0.4rem",
                      }}
                    >
                      <div
                        style={{
                          display: "flex",
                          alignItems: "center",
                          gap: "0.45rem",
                        }}
                      >
                        <div
                          style={{
                            width: 28,
                            height: 28,
                            borderRadius: "999px",
                            backgroundColor: "var(--bg-elevated)",
                            overflow: "hidden",
                            display: "flex",
                            alignItems: "center",
                            justifyContent: "center",
                            fontSize: "0.78rem",
                            fontWeight: 600,
                            flexShrink: 0,
                          }}
                        >
                          {info.photoURL ? (
                            <img
                              src={info.photoURL}
                              alt={info.name || "Jugador"}
                              style={{
                                width: "100%",
                                height: "100%",
                                objectFit: "cover",
                              }}
                            />
                          ) : (
                            letter
                          )}
                        </div>
                        <div>
                          <div
                            style={{
                              fontSize: "0.82rem",
                              fontWeight: 500,
                            }}
                          >
                            {info.name || "Jugador"}
                            {isCurrent && (
                              <span
                                style={{
                                  marginLeft: "0.3rem",
                                  fontSize: "0.7rem",
                                  color: "var(--muted)",
                                }}
                              >
                                (tú)
                              </span>
                            )}
                          </div>
                          {info.email && (
                            <div
                              style={{
                                fontSize: "0.72rem",
                                color: "var(--muted)",
                              }}
                            >
                              {info.email}
                            </div>
                          )}
                        </div>
                      </div>

                      {isAdmin && !isCurrent && (
                        <button
                          type="button"
                          onClick={() => handleRemoveMember(memberId)}
                          style={{
                            border: "none",
                            borderRadius: "999px",
                            padding: "0.25rem 0.45rem",
                            backgroundColor: "transparent",
                            color: "#fecaca",
                            display: "flex",
                            alignItems: "center",
                            gap: "0.2rem",
                            fontSize: "0.7rem",
                            cursor: "pointer",
                          }}
                        >
                          <Icon name="delete" size={14} color="#fecaca" />
                          Quitar
                        </button>
                      )}
                    </div>
                  );
                })}
              </div>
            )}
          </div>

          {/* Acciones del club */}
          <div
            style={{
              display: "flex",
              flexDirection: "column",
              gap: "0.45rem",
            }}
          >
            {/* Botón de club activo */}
            <button
              type="button"
              onClick={() =>
                activeClubId === selectedClub.id
                  ? handleSetActiveClub(null)
                  : handleSetActiveClub(selectedClub.id)
              }
              disabled={saving}
              style={{
                borderRadius: "0.9rem",
                border:
                  activeClubId === selectedClub.id
                    ? "1.5px solid var(--accent)"
                    : "1px solid var(--border)",
                padding: "0.5rem 0.7rem",
                background:
                  activeClubId === selectedClub.id
                    ? "var(--bg-elevated)"
                    : "transparent",
                color:
                  activeClubId === selectedClub.id
                    ? "var(--accent)"
                    : "var(--fg)",
                fontSize: "0.8rem",
                fontWeight: 500,
                cursor: saving ? "default" : "pointer",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                gap: "0.3rem",
              }}
            >
              <Icon
                name="trophy"
                size={14}
                color={
                  activeClubId === selectedClub.id
                    ? "var(--accent)"
                    : "var(--muted)"
                }
              />
              {activeClubId === selectedClub.id
                ? "Este es tu club activo"
                : "Marcar como club activo"}
            </button>

            {isAdmin && (
              <button
                type="button"
                onClick={handleSaveClubChanges}
                disabled={saving}
                style={{
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
                {saving ? "Guardando..." : "Guardar cambios del club"}
              </button>
            )}

            <button
              type="button"
              onClick={() => handleLeaveClub(selectedClub)}
              disabled={saving}
              style={{
                borderRadius: "0.9rem",
                border: "1px solid #f97373",
                padding: "0.55rem 0.7rem",
                background: "transparent",
                color: "#fecaca",
                fontSize: "0.8rem",
                fontWeight: 500,
                cursor: saving ? "default" : "pointer",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                gap: "0.3rem",
              }}
            >
              <Icon name="logout" size={14} color="#fecaca" />
              Salir de este club
            </button>

            <button
              type="button"
              onClick={() => handleSelectClub(null)}
              style={{
                marginTop: "0.1rem",
                borderRadius: "0.9rem",
                border: "1px solid var(--border)",
                padding: "0.4rem 0.7rem",
                background: "transparent",
                color: "var(--muted)",
                fontSize: "0.78rem",
                cursor: "pointer",
              }}
            >
              Cerrar gestión
            </button>
          </div>
        </section>
      )}

      {/* OTROS CLUBES (vista rápida) */}
      {otherClubs.length > 0 && !showJoin && (
        <section>
          <h2
            style={{
              margin: 0,
              marginBottom: "0.4rem",
              fontSize: "0.95rem",
            }}
          >
            Otros clubes ({otherClubs.length})
          </h2>
          <p
            style={{
              margin: 0,
              marginBottom: "0.5rem",
              fontSize: "0.8rem",
              color: "var(--muted)",
            }}
          >
            Puedes unirte desde el botón “Unirse” de arriba.
          </p>

          <div
            style={{
              display: "flex",
              flexDirection: "column",
              gap: "0.5rem",
            }}
          >
            {otherClubs.slice(0, 3).map((club) => (
              <div
                key={club.id}
                style={{
                  borderRadius: "0.8rem",
                  border: "1px dashed var(--border)",
                  padding: "0.5rem 0.6rem",
                  background: "var(--bg)",
                }}
              >
                <p
                  style={{
                    margin: 0,
                    fontSize: "0.85rem",
                    fontWeight: 600,
                  }}
                >
                  {club.name}
                </p>
                <p
                  style={{
                    margin: 0,
                    marginTop: "0.15rem",
                    fontSize: "0.75rem",
                    color: "var(--muted)",
                  }}
                >
                  {club.members?.length || 0} jugadores
                </p>
              </div>
            ))}
          </div>
        </section>
      )}
    </div>
  );
}
