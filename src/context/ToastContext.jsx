import { createContext, useCallback, useContext, useMemo, useState } from "react";
import Toast from "../components/common/Toast";

const ToastContext = createContext(null);

export function ToastProvider({ children }) {
  const [toast, setToast] = useState(null);

  const showToast = useCallback((message, type = "info", options = {}) => {
    if (!message) return;
    setToast({
      id: Date.now(),
      message,
      type,
      duration: options.duration ?? 2600,
    });
  }, []);

  const hideToast = useCallback(() => setToast(null), []);

  const value = useMemo(
    () => ({
      toast,
      showToast,
      hideToast,
    }),
    [toast, showToast, hideToast]
  );

  return (
    <ToastContext.Provider value={value}>
      {children}
      <Toast toast={toast} onClose={hideToast} />
    </ToastContext.Provider>
  );
}

export function useToast() {
  return useContext(ToastContext);
}

