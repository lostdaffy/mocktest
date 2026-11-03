import { useEffect, useState } from "react";
import { RiComputerLine, RiSmartphoneLine, RiLogoutBoxRLine, RiShieldCheckLine } from "@remixicon/react";
import api from "../api/axios";
import { PageHeader, Card } from "../components/ui";
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
  const apps = sessions.filter((s) => /app|Android|iPhone/i.test(s.device)).length;
  const ips = new Set(sessions.map((s) => s.ip).filter(Boolean)).size;

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

      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4 mb-5">
        {[
          ["Signed-in devices", sessions.length, "bg-brand"],
          ["Other than this one", others.length, others.length ? "bg-warn" : "bg-success"],
          ["On the phone app", apps, "bg-info"],
          ["Different IP addresses", ips, "bg-slate-soft"],
        ].map(([label, v, tone]) => (
          <Card key={label} className="!p-4 flex items-center gap-3">
            <span className={`w-1.5 self-stretch rounded-full ${tone}`} />
            <div>
              <p className="font-display text-xl font-extrabold text-ink tabular-nums">{loading ? "—" : v}</p>
              <p className="text-xs text-slate">{label}</p>
            </div>
          </Card>
        ))}
      </div>

      <Card className="!p-0 overflow-hidden">
        {loading ? (
          <p className="text-slate-soft text-center py-10">Loading...</p>
        ) : sessions.length === 0 ? (
          <p className="text-slate-soft text-center py-10">No active sessions found.</p>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="bg-slate-light/60 text-left text-[11px] font-semibold uppercase tracking-wide text-slate">
                  <th className="px-4 py-3">Device</th>
                  <th className="px-4 py-3">IP address</th>
                  <th className="px-4 py-3 whitespace-nowrap">Signed in</th>
                  <th className="px-4 py-3 whitespace-nowrap">Last active</th>
                  <th className="px-4 py-3 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border-soft">
                {sessions.map((s) => {
                  const isApp = /app|Android|iPhone/i.test(s.device);
                  const Icon = isApp ? RiSmartphoneLine : RiComputerLine;
                  return (
                    <tr key={s._id} className={`align-middle transition-colors ${s.current ? "bg-brand/[0.04]" : "hover:bg-slate-light/40"}`}>
                      <td className="px-4 py-3 min-w-[220px]">
                        <div className="flex items-center gap-3">
                          <span className="w-9 h-9 rounded-lg bg-slate-light grid place-items-center shrink-0 text-slate">
                            <Icon size={17} />
                          </span>
                          <div>
                            <p className="font-medium text-ink">{s.device}</p>
                            {s.current && (
                              <span className="text-[10px] font-semibold bg-success-light text-success px-2 py-0.5 rounded-full inline-flex items-center gap-1">
                                <RiShieldCheckLine size={11} /> This device
                              </span>
                            )}
                          </div>
                        </div>
                      </td>
                      <td className="px-4 py-3 font-mono text-xs text-slate">{s.ip || "unknown"}</td>
                      <td className="px-4 py-3 text-slate whitespace-nowrap text-xs">{when(s.startedAt)}</td>
                      <td className="px-4 py-3 text-slate whitespace-nowrap text-xs">{when(s.lastSeenAt)}</td>
                      <td className="px-4 py-3 text-right">
                        <button
                          onClick={() => endSession(s)}
                          disabled={!!busy}
                          className="px-3 py-1.5 rounded-md bg-danger-light hover:opacity-80 text-danger text-xs font-semibold inline-flex items-center gap-1.5 disabled:opacity-50"
                        >
                          <RiLogoutBoxRLine size={14} />
                          {busy === s._id ? "..." : s.current ? "Log out" : "Log out device"}
                        </button>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </Card>

      <p className="text-xs text-slate-soft mt-5">
        A session ends the moment that device next contacts the server — nothing stays usable after you log it out. Sessions also end by themselves when
        the password is reset.
      </p>
    </div>
  );
}
