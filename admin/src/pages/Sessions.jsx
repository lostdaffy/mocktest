import { useEffect, useState } from "react";
import { RiComputerLine, RiSmartphoneLine, RiLogoutBoxRLine, RiShieldCheckLine } from "@remixicon/react";
import api from "../api/axios";
import { PageHeader } from "../components/ui";
import { useToast } from "../components/Toast";

function when(value) {
  if (!value) return "—";
  const date = new Date(value);
  const mins = Math.round((Date.now() - date.getTime()) / 60000);
  if (mins < 1) return "just now";
  if (mins < 60) return `${mins} min ago`;
  if (mins < 24 * 60) return `${Math.round(mins / 60)} hr ago`;
  return date.toLocaleString("en-IN", { day: "numeric", month: "short", hour: "numeric", minute: "2-digit" });
}

export default function Sessions() {
  const toast = useToast();
  const [sessions, setSessions] = useState([]);
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState("");

  async function load() {
    setLoading(true);
    try {
      const res = await api.get("/auth/sessions");
      setSessions(res.data.sessions || []);
    } catch (err) {
      toast.error("Couldn't load sessions: " + (err.response?.data?.message || err.message));
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  async function endSession(session) {
    const ok = await toast.confirm({
      title: session.current ? "Log out of this device?" : "Log out that device?",
      message: session.current
        ? "You'll be signed out here and sent back to the login page."
        : `${session.device} (${session.ip || "unknown IP"}) will be signed out the moment it next contacts the server.`,
      confirmLabel: "Log out",
      danger: true,
    });
    if (!ok) return;

    setBusy(session._id);
    try {
      await api.delete(`/auth/sessions/${session._id}`);
      if (session.current) {
        localStorage.removeItem("adminToken");
        localStorage.removeItem("adminUser");
        window.location.reload();
        return;
      }
      toast.success("That device has been signed out");
      load();
    } catch (err) {
      toast.error(err.response?.data?.message || "Couldn't end that session");
    } finally {
      setBusy("");
    }
  }

  async function endOthers() {
    const others = sessions.filter((s) => !s.current).length;
    const ok = await toast.confirm({
      title: "Log out everywhere else?",
      message: `${others} other session(s) will be signed out. This one stays.`,
      confirmLabel: "Log out others",
      danger: true,
    });
    if (!ok) return;

    setBusy("others");
    try {
      const res = await api.post("/auth/sessions/revoke-others");
      toast.success(res.data.message || "Done");
      load();
    } catch (err) {
      toast.error(err.response?.data?.message || "Couldn't sign the others out");
    } finally {
      setBusy("");
    }
  }

  const others = sessions.filter((s) => !s.current);

  return (
    <div>
      <PageHeader
        eyebrow="Security"
        title="Login Activity"
        subtitle="Every device this admin account is signed in on. End any session you don't recognise."
        actions={
          others.length > 0 && (
            <button onClick={endOthers} disabled={!!busy} className="rv-btn-secondary">
              {busy === "others" ? "Signing out..." : `Log out ${others.length} other device${others.length === 1 ? "" : "s"}`}
            </button>
          )
        }
      />

      {loading ? (
        <p className="text-slate-soft">Loading...</p>
      ) : sessions.length === 0 ? (
        <p className="text-slate-soft">No active sessions found.</p>
      ) : (
        <div className="space-y-3">
          {sessions.map((s) => {
            const isApp = /app|Android|iPhone/i.test(s.device);
            const Icon = isApp ? RiSmartphoneLine : RiComputerLine;
            return (
              <div key={s._id} className={`rv-card p-5 flex items-center justify-between gap-4 ${s.current ? "border-brand" : ""}`}>
                <div className="flex items-center gap-3 min-w-0">
                  <div className="w-10 h-10 rounded-xl bg-slate-light flex items-center justify-center shrink-0">
                    <Icon size={18} className="text-slate" />
                  </div>
                  <div className="min-w-0">
                    <p className="font-medium text-ink flex items-center gap-2">
                      {s.device}
                      {s.current && (
                        <span className="text-[10px] font-semibold bg-success-light text-success px-2 py-0.5 rounded-full inline-flex items-center gap-1">
                          <RiShieldCheckLine size={11} /> This device
                        </span>
                      )}
                    </p>
                    <p className="text-xs text-slate-soft">
                      IP {s.ip || "unknown"} · signed in {when(s.startedAt)} · last active {when(s.lastSeenAt)}
                    </p>
                  </div>
                </div>

                <button
                  onClick={() => endSession(s)}
                  disabled={!!busy}
                  className="shrink-0 px-3 py-1.5 rounded-lg bg-danger-light hover:opacity-80 text-danger text-xs font-medium inline-flex items-center gap-1.5 disabled:opacity-50"
                >
                  <RiLogoutBoxRLine size={14} />
                  {busy === s._id ? "..." : s.current ? "Log out" : "Log out device"}
                </button>
              </div>
            );
          })}
        </div>
      )}

      <p className="text-xs text-slate-soft mt-6">
        A session ends the moment that device next contacts the server — nothing stays usable after you log it out.
        Sessions also end by themselves when the password is reset.
      </p>
    </div>
  );
}
