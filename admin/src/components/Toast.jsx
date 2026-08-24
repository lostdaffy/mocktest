import { createContext, useCallback, useContext, useRef, useState } from "react";
import { RiCheckLine, RiErrorWarningLine, RiInformationLine, RiCloseLine, RiAlertLine } from "@remixicon/react";

// Replaces the browser's native alert()/confirm() everywhere in the admin
// panel - those render as an OS-level popup that looks like nothing else
// in the product and blocks the whole tab. This renders in-app, matches
// the rest of the UI, and doesn't freeze the page.

const ToastContext = createContext(null);

const VARIANTS = {
  success: {
    icon: RiCheckLine,
    wrap: "bg-success-light border-success-border",
    text: "text-success",
    iconColor: "text-success",
  },
  error: {
    icon: RiErrorWarningLine,
    wrap: "bg-danger-light border-danger-border",
    text: "text-danger",
    iconColor: "text-danger",
  },
  info: {
    icon: RiInformationLine,
    wrap: "bg-surface border-border",
    text: "text-ink",
    iconColor: "text-brand",
  },
};

export function ToastProvider({ children }) {
  const [toasts, setToasts] = useState([]);
  const [confirmState, setConfirmState] = useState(null);
  const idRef = useRef(0);

  const showToast = useCallback((message, variant = "info") => {
    const id = ++idRef.current;
    setToasts((t) => [...t, { id, message, variant }]);
    setTimeout(() => {
      setToasts((t) => t.filter((x) => x.id !== id));
    }, 4000);
  }, []);

  const showConfirm = useCallback(({ title, message, confirmLabel = "Confirm", danger = false }) => {
    return new Promise((resolve) => {
      setConfirmState({ title, message, confirmLabel, danger, resolve });
    });
  }, []);

  function resolveConfirm(value) {
    confirmState?.resolve(value);
    setConfirmState(null);
  }

  return (
    <ToastContext.Provider
      value={{
        success: (m) => showToast(m, "success"),
        error: (m) => showToast(m, "error"),
        info: (m) => showToast(m, "info"),
        confirm: showConfirm,
      }}
    >
      {children}

      {/* Toast stack */}
      <div className="fixed top-4 right-4 z-[100] flex flex-col gap-2.5 w-[calc(100vw-2rem)] max-w-sm">
        {toasts.map((t) => {
          const v = VARIANTS[t.variant];
          const Icon = v.icon;
          return (
            <div
              key={t.id}
              className={`flex items-start gap-3 ${v.wrap} border rounded-sm shadow-lift px-4 py-3.5 animate-[toastIn_0.2s_ease-out]`}
            >
              <Icon size={18} className={`${v.iconColor} shrink-0 mt-0.5`} />
              <p className={`text-sm font-medium ${v.text} leading-snug flex-1`}>{t.message}</p>
              <button
                onClick={() => setToasts((prev) => prev.filter((x) => x.id !== t.id))}
                className="shrink-0 text-slate-soft hover:text-ink transition-colors"
                aria-label="Dismiss"
              >
                <RiCloseLine size={16} />
              </button>
            </div>
          );
        })}
      </div>

      {/* Confirm dialog */}
      {confirmState && (
        <div className="fixed inset-0 bg-brand-navy/60 backdrop-blur-sm flex items-center justify-center p-4 z-[100] animate-fade-in">
          <div className="bg-surface rounded-lg p-6 w-full max-w-sm shadow-lift">
            <div
              className={`w-11 h-11 rounded-sm grid place-items-center mb-4 ${
                confirmState.danger ? "bg-danger-light text-danger" : "bg-brand/10 text-brand"
              }`}
            >
              <RiAlertLine size={21} />
            </div>

            <h3 className="font-display font-bold text-ink mb-1.5">{confirmState.title}</h3>
            <p className="text-sm text-slate mb-6 leading-relaxed">{confirmState.message}</p>

            <div className="flex gap-2.5">
              <button onClick={() => resolveConfirm(false)} className="rv-btn-secondary flex-1">
                Cancel
              </button>
              <button
                onClick={() => resolveConfirm(true)}
                className={`flex-1 rv-btn text-white ${
                  confirmState.danger ? "bg-danger hover:opacity-90" : "bg-brand hover:bg-brand-dark shadow-brand"
                }`}
              >
                {confirmState.confirmLabel}
              </button>
            </div>
          </div>
        </div>
      )}

      <style>{`
        @keyframes toastIn {
          from { opacity: 0; transform: translateX(16px); }
          to { opacity: 1; transform: translateX(0); }
        }
      `}</style>
    </ToastContext.Provider>
  );
}

// Usage: const toast = useToast(); toast.success("Saved"); toast.error("Failed: " + msg);
// const ok = await toast.confirm({ title: "Delete this?", message: "This can't be undone.", danger: true });
export function useToast() {
  const ctx = useContext(ToastContext);
  if (!ctx) throw new Error("useToast must be used inside <ToastProvider>");
  return ctx;
}
