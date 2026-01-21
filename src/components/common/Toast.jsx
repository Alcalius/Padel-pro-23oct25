import { useEffect } from "react";
import Icon from "./Icon";

const ICONS = {
  success: "check",
  error: "close",
  warning: "alert",
  info: "info",
};

export default function Toast({ toast, onClose }) {
  useEffect(() => {
    if (!toast) return undefined;
    const duration = toast.duration ?? 2600;
    const timer = setTimeout(() => onClose?.(), duration);
    return () => clearTimeout(timer);
  }, [toast, onClose]);

  if (!toast) return null;

  const type = toast.type || "info";

  return (
    <div className={`toast toast-${type}`} role="status" aria-live="polite">
      <Icon name={ICONS[type] || "info"} size={16} color="currentColor" />
      <span>{toast.message}</span>
      <button
        type="button"
        className="toast-close"
        onClick={onClose}
        aria-label="Cerrar"
      >
        ×
      </button>
    </div>
  );
}

