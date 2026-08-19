import { createContext, useCallback, useContext, useRef, useState } from "react";
import { RiCheckLine, RiErrorWarningLine, RiInformationLine, RiCloseLine } from "@remixicon/react";

// Replaces the browser's native alert()/confirm() everywhere in the admin
// panel - those render as an OS-level popup that looks like nothing else
// in the product and blocks the whole tab. This renders in-app, matches
// the rest of the UI, and doesn't freeze the page.

const ToastContext = createContext(null);

const VARIANTS = {
  success: { icon: RiCheckLine, bg: "bg-emerald-50", border: "border-emerald-200", text: "text-emerald-800", iconColor: "text-emerald-600" },
  error: { icon: RiErrorWarningLine, bg: "bg-red-50", border: "border-red-200", text: "text-red-800", iconColor: "text-red-600" },
  info: { icon: RiInformationLine, bg: "bg-brand/5", border: "border-brand/20", text: "text-ink", iconColor: "text-brand" },
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
    <ToastContext.Provider value={{ success: (m) => showToast(m, "success"), error: (m) => showToast(m, "error"), info: (m) => showToast(m, "info"), confirm: showConfirm }}>
      {children}

      {/* Toast stack */}
      <div className="fixed top-5 right-5 z-[100] flex flex-col gap-2.5 max-w-sm">
        {toasts.map((t) => {
          const v = VARIANTS[t.variant];
          const Icon = v.icon;
          return (
            <div key={t.id} className={`flex items-start gap-3 ${v.bg} border ${v.border} rounded-xl shadow-lg px-4 py-3.5 animate-[slideIn_0.2s_ease-out]`}>
              <Icon size={18} className={`${v.iconColor} shrink-0 mt-0.5`} />
              <p className={`text-sm font-medium ${v.text} leading-snug`}>{t.message}</p>
              <button onClick={() => setToasts((prev) => prev.filter((x) => x.id !== t.id))} className="ml-auto shrink-0 text-slate-400 hover:text-slate-600">
                <RiCloseLine size={16} />
              </button>
            </div>
          );
        })}
      </div>

      {/* Confirm dialog */}
      {confirmState && (
        <div className="fixed inset-0 bg-black/40 flex items-center justify-center p-4 z-[100]">
          <div className="bg-white rounded-2xl p-6 w-full max-w-sm shadow-2xl">
            <h3 className="font-semibold text-ink mb-1.5">{confirmState.title}</h3>
            <p className="text-sm text-slate-500 mb-5 leading-relaxed">{confirmState.message}</p>
            <div className="flex gap-2">
              <button
                onClick={() => resolveConfirm(false)}
                className="flex-1 px-4 py-2.5 rounded-lg bg-slate-100 hover:bg-slate-200 text-sm font-medium text-slate-700 transition-colors"
              >
                Cancel
              </button>
              <button
                onClick={() => resolveConfirm(true)}
                className={`flex-1 px-4 py-2.5 rounded-lg text-white text-sm font-medium transition-colors ${
                  confirmState.danger ? "bg-red-500 hover:bg-red-600" : "bg-brand hover:bg-brand-dark"
                }`}
              >
                {confirmState.confirmLabel}
              </button>
            </div>
          </div>
        </div>
      )}

      <style>{`
        @keyframes slideIn {
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