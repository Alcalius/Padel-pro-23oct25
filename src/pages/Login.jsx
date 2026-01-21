import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "../context/AuthContext";
import Icon from "../components/common/Icon";
import { auth, db } from "../firebase/firebase";
import {
  createUserWithEmailAndPassword,
  updateProfile,
  sendPasswordResetEmail,
} from "firebase/auth";
import { doc, setDoc } from "firebase/firestore";

// Logo
import AppIcon from "../assets/logo/AppIcon.png";

export default function Login() {
  const { login } = useAuth();
  const navigate = useNavigate();

  const [isLogin, setIsLogin] = useState(true);

  // Login
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [rememberMe, setRememberMe] = useState(false);

  // Registro
  const [registerData, setRegisterData] = useState({
    name: "",
    email: "",
    password: "",
    confirmPassword: "",
  });

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [resetMessage, setResetMessage] = useState("");
  const [formErrors, setFormErrors] = useState({});
  const [hasSavedCreds, setHasSavedCreds] = useState(false);
  const [autoLoginTried, setAutoLoginTried] = useState(false);

  // Cargar credenciales guardadas
  useEffect(() => {
    const saved = localStorage.getItem("padel-remembered-credentials");
    if (!saved) return;

    try {
      const parsed = JSON.parse(saved);
      if (parsed.remember && parsed.email && parsed.password) {
        setEmail(parsed.email);
        setPassword(parsed.password);
        setRememberMe(true);
        setHasSavedCreds(true);
      }
    } catch (e) {
      console.error("Error leyendo credenciales guardadas:", e);
    }
  }, []);

  // Auto-login cuando hay credenciales guardadas + recordar activado
  useEffect(() => {
    const shouldAutoLogin =
      isLogin && rememberMe && hasSavedCreds && !autoLoginTried && email && password;

    if (!shouldAutoLogin) return;

    const doAutoLogin = async () => {
      try {
        setLoading(true);
        setError("");
        await login(email, password);
        navigate("/");
      } catch (err) {
        console.error("Error en auto-login:", err);
        const msg = mapAuthError(err.code, "Error al iniciar sesión.");
        setError(msg);
      } finally {
        setLoading(false);
        setAutoLoginTried(true);
      }
    };

    doAutoLogin();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isLogin, rememberMe, hasSavedCreds, autoLoginTried, email, password, login, navigate]);

  // Limpiar errores al cambiar entre login / registro o modificar campos
  useEffect(() => {
    setError("");
    setResetMessage("");
    setFormErrors({});
  }, [isLogin, email, password, registerData]);

  const mapAuthError = (code, fallback) => {
    switch (code) {
      case "auth/user-not-found":
        return "No existe una cuenta con este email.";
      case "auth/wrong-password":
        return "Contraseña incorrecta.";
      case "auth/invalid-email":
        return "Email no válido.";
      case "auth/too-many-requests":
        return "Demasiados intentos. Intenta más tarde.";
      case "auth/email-already-in-use":
        return "Este email ya está registrado.";
      case "auth/weak-password":
        return "La contraseña es muy débil (mínimo 6 caracteres).";
      default:
        return fallback;
    }
  };

  const handleLogin = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError("");
    setResetMessage("");

    try {
      await login(email, password);

      if (rememberMe) {
        localStorage.setItem(
          "padel-remembered-credentials",
          JSON.stringify({
            email,
            password,
            remember: true,
          })
        );
        setHasSavedCreds(true);
      } else {
        localStorage.removeItem("padel-remembered-credentials");
        setHasSavedCreds(false);
      }

      navigate("/");
    } catch (err) {
      console.error("Error al iniciar sesión:", err);
      const msg = mapAuthError(err.code, "Error al iniciar sesión.");
      setError(msg);
    } finally {
      setLoading(false);
    }
  };

  const validateRegisterForm = () => {
    const errors = {};

    if (!registerData.name.trim()) {
      errors.name = "El nombre es requerido.";
    }

    if (!registerData.email.trim()) {
      errors.email = "El email es requerido.";
    } else if (!/\S+@\S+\.\S+/.test(registerData.email)) {
      errors.email = "Email no válido.";
    }

    if (!registerData.password) {
      errors.password = "La contraseña es requerida.";
    } else if (registerData.password.length < 6) {
      errors.password = "Mínimo 6 caracteres.";
    }

    if (!registerData.confirmPassword) {
      errors.confirmPassword = "Confirma tu contraseña.";
    } else if (registerData.password !== registerData.confirmPassword) {
      errors.confirmPassword = "Las contraseñas no coinciden.";
    }

    return errors;
  };

  const handleRegister = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError("");
    setResetMessage("");
    setFormErrors({});

    const errors = validateRegisterForm();
    if (Object.keys(errors).length > 0) {
      setFormErrors(errors);
      setLoading(false);
      return;
    }

    try {
      const { email, password, name } = registerData;

      const cred = await createUserWithEmailAndPassword(auth, email, password);
      const user = cred.user;

      await updateProfile(user, {
        displayName: name,
      });

      const userData = {
        displayName: name,
        email,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      };

      await setDoc(doc(db, "users", user.uid), userData);

      if (rememberMe) {
        localStorage.setItem(
          "padel-remembered-credentials",
          JSON.stringify({
            email,
            password,
            remember: true,
          })
        );
        setHasSavedCreds(true);
      }

      navigate("/");
    } catch (err) {
      console.error("Error al registrar:", err);
      const msg = mapAuthError(err.code, "Error al crear la cuenta.");
      setError(msg);
    } finally {
      setLoading(false);
    }
  };

  const clearSavedCredentials = () => {
    localStorage.removeItem("padel-remembered-credentials");
    setHasSavedCreds(false);
    setEmail("");
    setPassword("");
    setRememberMe(false);
    setAutoLoginTried(false);
  };

  const handleToggleMode = () => {
    setIsLogin((prev) => !prev);
  };

  const handleForgotPassword = async () => {
    setError("");
    setResetMessage("");

    if (!email) {
      setError("Ingresa tu email para recuperar tu contraseña.");
      return;
    }

    try {
      await sendPasswordResetEmail(auth, email);
      setResetMessage(
        "Te enviamos un correo para restablecer tu contraseña."
      );
    } catch (err) {
      console.error("Error al enviar correo de recuperación:", err);
      const msg = mapAuthError(
        err.code,
        "No se pudo enviar el correo de recuperación."
      );
      setError(msg);
    }
  };

  // ===================================================================
  // UI
  // ===================================================================

  return (
    <div
      className="auth-screen"
      style={{
        minHeight: "100vh",
        display: "flex",
        flexDirection: "column",
        alignItems: "center",
        justifyContent: "flex-start",
        padding: "2.5rem 1.5rem 1.5rem",
        backgroundColor: "var(--bg)",
      }}
    >
      {/* Marca */}
      <div style={{ textAlign: "center", marginBottom: "1.7rem" }}>
        <img
          src={AppIcon}
          alt="League of Padel"
          style={{
            width: "150px",
            height: "150px",
            borderRadius: "22px",
            objectFit: "cover",
            marginBottom: "1rem",
          }}
        />

        <h1
          style={{
            fontSize: "1.8rem",
            fontWeight: 700,
            margin: 0,
            marginBottom: "0.25rem",
          }}
        >
          League of Padel
        </h1>
        <p
          style={{
            margin: 0,
            fontSize: "0.9rem",
            color: "var(--muted)",
          }}
        >
          {isLogin
            ? "Inicia sesión para continuar"
            : "Crea tu cuenta para empezar"}
        </p>
      </div>

      {/* Contenido principal (sin card, solo ancho limitado) */}
      <div
        className="auth-card"
        style={{
          width: "100%",
          maxWidth: "440px",
        }}
      >
        {/* Toggle Login / Registro */}
        <div
          style={{
            display: "flex",
            marginBottom: "1.3rem",
            backgroundColor: "rgba(15, 23, 42, 0.17)",
            borderRadius: "999px",
            padding: "0.25rem",
          }}
        >
          <button
            type="button"
            onClick={() => setIsLogin(true)}
            disabled={loading}
            className="pressable"
            style={{
              flex: 1,
              border: "none",
              borderRadius: "999px",
              padding: "0.6rem 0.75rem",
              cursor: loading ? "default" : "pointer",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              gap: "0.4rem",
              fontSize: "0.85rem",
              fontWeight: 600,
              backgroundColor: isLogin ? "var(--accent)" : "transparent",
              color: isLogin ? "#ffffff" : "var(--muted)",
            }}
          >
            <Icon name="lock" size={16} color={isLogin ? "#fff" : "currentColor"} />
            Login
          </button>

          <button
            type="button"
            onClick={() => setIsLogin(false)}
            disabled={loading}
            className="pressable"
            style={{
              flex: 1,
              border: "none",
              borderRadius: "999px",
              padding: "0.6rem 0.75rem",
              cursor: loading ? "default" : "pointer",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              gap: "0.4rem",
              fontSize: "0.85rem",
              fontWeight: 600,
              backgroundColor: !isLogin ? "var(--accent)" : "transparent",
              color: !isLogin ? "#ffffff" : "var(--muted)",
            }}
          >
            <Icon name="add" size={16} color={!isLogin ? "#fff" : "currentColor"} />
            Registro
          </button>
        </div>

        {/* Errores / mensajes */}
        {(error || resetMessage) && (
          <div style={{ marginBottom: "1rem" }}>
            {error && (
              <div
                style={{
                  marginBottom: resetMessage ? "0.5rem" : 0,
                  padding: "0.75rem 0.9rem",
                  borderRadius: "0.9rem",
                  border: "1px solid #f87171",
                  backgroundColor: "rgba(248,113,113,0.1)",
                  color: "#fecaca",
                  fontSize: "0.8rem",
                  display: "flex",
                  alignItems: "center",
                  gap: "0.4rem",
                }}
              >
                <Icon name="close" size={16} color="#fecaca" />
                <span>{error}</span>
              </div>
            )}
            {resetMessage && (
              <div
                style={{
                  padding: "0.75rem 0.9rem",
                  borderRadius: "0.9rem",
                  border: "1px solid rgba(34,197,94,0.6)",
                  backgroundColor: "rgba(34,197,94,0.12)",
                  color: "#bbf7d0",
                  fontSize: "0.8rem",
                  display: "flex",
                  alignItems: "center",
                  gap: "0.4rem",
                }}
              >
                <Icon name="check" size={16} color="#bbf7d0" />
                <span>{resetMessage}</span>
              </div>
            )}
          </div>
        )}

        {/* FORM Login */}
        {isLogin ? (
          <form onSubmit={handleLogin}>
            {/* email */}
            <div style={{ marginBottom: "0.9rem" }}>
              <label
                style={{
                  display: "block",
                  marginBottom: "0.35rem",
                  fontSize: "0.8rem",
                  fontWeight: 600,
                }}
              >
                Email
              </label>
              <input
                type="email"
                value={email}
                required
                onChange={(e) => setEmail(e.target.value)}
                placeholder="tu@email.com"
                disabled={loading}
                style={{
                  width: "100%",
                  padding: "0.7rem 0.9rem",
                  borderRadius: "0.9rem",
                  border: "1px solid var(--border)",
                  backgroundColor: "var(--bg)",
                  color: "var(--fg)",
                }}
              />
            </div>

            {/* password */}
            <div style={{ marginBottom: "0.4rem" }}>
              <label
                style={{
                  display: "block",
                  marginBottom: "0.35rem",
                  fontSize: "0.8rem",
                  fontWeight: 600,
                }}
              >
                Contraseña
              </label>
              <input
                type="password"
                value={password}
                required
                onChange={(e) => setPassword(e.target.value)}
                placeholder="••••••••"
                disabled={loading}
                style={{
                  width: "100%",
                  padding: "0.7rem 0.9rem",
                  borderRadius: "0.9rem",
                  border: "1px solid var(--border)",
                  backgroundColor: "var(--bg)",
                  color: "var(--fg)",
                }}
              />
            </div>

            {/* recordar + olvidar */}
            <div
              style={{
                marginBottom: "1rem",
                display: "flex",
                alignItems: "center",
                justifyContent: "space-between",
                gap: "0.75rem",
                fontSize: "0.78rem",
                color: "var(--muted)",
              }}
            >
              <label
                style={{
                  display: "flex",
                  alignItems: "center",
                  gap: "0.4rem",
                  cursor: "pointer",
                }}
              >
                <input
                  type="checkbox"
                  checked={rememberMe}
                  onChange={(e) => {
                    setRememberMe(e.target.checked);
                    if (!e.target.checked) {
                      localStorage.removeItem("padel-remembered-credentials");
                      setHasSavedCreds(false);
                      setAutoLoginTried(false);
                    }
                  }}
                />
                <span>Recordar mis credenciales</span>
              </label>

              <button
                type="button"
                onClick={handleForgotPassword}
                disabled={loading}
              className="pressable"
                style={{
                  border: "none",
                  background: "none",
                  color: "var(--accent)",
                  fontSize: "0.78rem",
                  fontWeight: 600,
                  cursor: loading ? "default" : "pointer",
                  whiteSpace: "nowrap",
                }}
              >
                ¿Olvidaste tu contraseña?
              </button>
            </div>

            {/* submit */}
            <button
              type="submit"
              disabled={loading}
              className="btn btn-primary btn-glow pressable"
              style={{
                width: "100%",
                padding: "0.8rem",
                borderRadius: "999px",
                border: "none",
                cursor: loading ? "default" : "pointer",
                background:
                  "linear-gradient(135deg, var(--accent), rgba(59,130,246,0.8))",
                color: "#ffffff",
                fontWeight: 600,
                fontSize: "0.95rem",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                gap: "0.45rem",
              }}
            >
              {loading ? (
                <>
                  <div
                    style={{
                      width: "16px",
                      height: "16px",
                      borderRadius: "50%",
                      border: "2px solid rgba(255,255,255,0.3)",
                      borderTopColor: "#ffffff",
                      animation: "spin 1s linear infinite",
                    }}
                  />
                  Procesando...
                </>
              ) : (
                <>
                  <Icon name="lock" size={18} color="#ffffff" />
                  Iniciar sesión
                </>
              )}
            </button>

            {hasSavedCreds && (
              <div style={{ marginTop: "0.75rem", textAlign: "center" }}>
                <button
                  type="button"
                  onClick={clearSavedCredentials}
                  style={{
                    border: "none",
                    background: "none",
                    color: "var(--muted)",
                    fontSize: "0.75rem",
                    textDecoration: "underline",
                  }}
                >
                  Olvidar credenciales guardadas
                </button>
              </div>
            )}
          </form>
        ) : (
          // ============================
          // Formulario Registro
          // ============================
          <form onSubmit={handleRegister}>
            {/* nombre */}
            <div style={{ marginBottom: "0.75rem" }}>
              <label style={{ fontSize: "0.8rem", fontWeight: 600 }}>
                Nombre
              </label>
              <input
                type="text"
                value={registerData.name}
                onChange={(e) =>
                  setRegisterData((prev) => ({
                    ...prev,
                    name: e.target.value,
                  }))
                }
                placeholder="Tu nombre"
                disabled={loading}
                style={{
                  width: "100%",
                  padding: "0.7rem 0.9rem",
                  borderRadius: "0.9rem",
                  border: `1px solid ${
                    formErrors.name ? "#f97373" : "var(--border)"
                  }`,
                  backgroundColor: "var(--bg)",
                  color: "var(--fg)",
                  fontSize: "0.9rem",
                }}
              />
              {formErrors.name && (
                <p
                  style={{
                    margin: "0.25rem 0 0",
                    fontSize: "0.75rem",
                    color: "#fca5a5",
                  }}
                >
                  {formErrors.name}
                </p>
              )}
            </div>

            {/* email */}
            <div style={{ marginBottom: "0.75rem" }}>
              <label style={{ fontSize: "0.8rem", fontWeight: 600 }}>
                Email
              </label>
              <input
                type="email"
                value={registerData.email}
                onChange={(e) =>
                  setRegisterData((prev) => ({
                    ...prev,
                    email: e.target.value,
                  }))
                }
                placeholder="tu@email.com"
                disabled={loading}
                style={{
                  width: "100%",
                  padding: "0.7rem 0.9rem",
                  borderRadius: "0.9rem",
                  border: `1px solid ${
                    formErrors.email ? "#f97373" : "var(--border)"
                  }`,
                  backgroundColor: "var(--bg)",
                  color: "var(--fg)",
                  fontSize: "0.9rem",
                }}
              />
              {formErrors.email && (
                <p
                  style={{
                    margin: "0.25rem 0 0",
                    fontSize: "0.75rem",
                    color: "#fca5a5",
                  }}
                >
                  {formErrors.email}
                </p>
              )}
            </div>

            {/* contraseña */}
            <div style={{ marginBottom: "0.75rem" }}>
              <label style={{ fontSize: "0.8rem", fontWeight: 600 }}>
                Contraseña
              </label>
              <input
                type="password"
                value={registerData.password}
                onChange={(e) =>
                  setRegisterData((prev) => ({
                    ...prev,
                    password: e.target.value,
                  }))
                }
                placeholder="••••••••"
                disabled={loading}
                style={{
                  width: "100%",
                  padding: "0.7rem 0.9rem",
                  borderRadius: "0.9rem",
                  border: `1px solid ${
                    formErrors.password ? "#f97373" : "var(--border)"
                  }`,
                  backgroundColor: "var(--bg)",
                  color: "var(--fg)",
                }}
              />
              {formErrors.password ? (
                <p
                  style={{
                    margin: "0.25rem 0 0",
                    fontSize: "0.75rem",
                    color: "#fca5a5",
                  }}
                >
                  {formErrors.password}
                </p>
              ) : (
                <p
                  style={{
                    margin: "0.25rem 0 0",
                    fontSize: "0.75rem",
                    color: "var(--muted)",
                  }}
                >
                  Mínimo 6 caracteres.
                </p>
              )}
            </div>

            {/* confirmar */}
            <div style={{ marginBottom: "0.9rem" }}>
              <label style={{ fontSize: "0.8rem", fontWeight: 600 }}>
                Confirmar contraseña
              </label>
              <input
                type="password"
                value={registerData.confirmPassword}
                onChange={(e) =>
                  setRegisterData((prev) => ({
                    ...prev,
                    confirmPassword: e.target.value,
                  }))
                }
                placeholder="••••••••"
                disabled={loading}
                style={{
                  width: "100%",
                  padding: "0.7rem 0.9rem",
                  borderRadius: "0.9rem",
                  border: `1px solid ${
                    formErrors.confirmPassword ? "#f97373" : "var(--border)"
                  }`,
                  backgroundColor: "var(--bg)",
                  color: "var(--fg)",
                }}
              />
              {formErrors.confirmPassword && (
                <p
                  style={{
                    margin: "0.25rem 0 0",
                    fontSize: "0.75rem",
                    color: "#fca5a5",
                  }}
                >
                  {formErrors.confirmPassword}
                </p>
              )}
            </div>

            {/* recordar en registro */}
            <div
              style={{
                marginBottom: "1rem",
                display: "flex",
                alignItems: "center",
                gap: "0.5rem",
                fontSize: "0.8rem",
                color: "var(--muted)",
              }}
            >
              <input
                type="checkbox"
                checked={rememberMe}
                onChange={(e) => setRememberMe(e.target.checked)}
              />
              <span>Recordar mis credenciales</span>
            </div>

            {/* submit */}
            <button
              type="submit"
              disabled={loading}
              className="btn btn-primary btn-glow pressable"
              style={{
                width: "100%",
                padding: "0.8rem",
                borderRadius: "999px",
                border: "none",
                cursor: loading ? "default" : "pointer",
                background:
                  "linear-gradient(135deg, var(--accent), rgba(59,130,246,0.8))",
                color: "#ffffff",
                fontWeight: 600,
                fontSize: "0.95rem",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                gap: "0.45rem",
              }}
            >
              {loading ? (
                <>
                  <div
                    style={{
                      width: "16px",
                      height: "16px",
                      borderRadius: "50%",
                      border: "2px solid rgba(255,255,255,0.3)",
                      borderTopColor: "#ffffff",
                      animation: "spin 1s linear infinite",
                    }}
                  />
                  Creando cuenta...
                </>
              ) : (
                <>
                  <Icon name="add" size={18} color="#ffffff" />
                  Crear cuenta
                </>
              )}
            </button>
          </form>
        )}

        {/* Cambiar modo */}
        <div
          style={{
            marginTop: "1.4rem",
            borderTop: "1px solid var(--border)",
            paddingTop: "0.9rem",
            textAlign: "center",
            fontSize: "0.8rem",
            color: "var(--muted)",
          }}
        >
          {isLogin ? "¿No tienes cuenta?" : "¿Ya tienes cuenta?"}{" "}
          <button
            type="button"
            onClick={handleToggleMode}
            disabled={loading}
            className="pressable"
            style={{
              border: "none",
              background: "none",
              color: "var(--accent)",
              fontWeight: 600,
              cursor: loading ? "default" : "pointer",
            }}
          >
            {isLogin ? "Regístrate aquí" : "Inicia sesión aquí"}
          </button>
        </div>

        {/* Animación loader */}
        <style>{`
          @keyframes spin {
            0% { transform: rotate(0deg); }
            100% { transform: rotate(360deg); }
          }
        `}</style>
      </div>
    </div>
  );
}
