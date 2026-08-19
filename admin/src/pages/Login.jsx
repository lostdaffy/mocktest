import { useState, useRef, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import {
  RiEyeLine,
  RiEyeOffLine,
  RiShieldCheckLine,
  RiArrowLeftLine,
  RiPhoneLine,
  RiLockLine,
  RiKeyLine,
  RiFileList3Line,
  RiFilePaperLine,
  RiBroadcastLine,
  RiCoupon3Line,
} from "@remixicon/react";
import { useAuth } from "../context/AuthContext";
import api from "../api/axios";

const FEATURES = [
  { Icon: RiFileList3Line, label: "Exam mock series, built to real patterns" },
  { Icon: RiFilePaperLine, label: "Genuine previous-year papers, extracted not invented" },
  { Icon: RiBroadcastLine, label: "Live, ranked exams for every aspirant" },
  { Icon: RiCoupon3Line, label: "Subscriptions, coupons, and student management" },
];

export default function Login() {
  const [view, setView] = useState("login"); // "login" | "forgot"

  return (
    <div className="min-h-screen flex bg-white">
      {/* Brand panel - hidden on small screens, this is where the "premium" feel lives */}
      <div className="hidden lg:flex lg:w-[44%] relative overflow-hidden bg-gradient-to-br from-[#2563EB] via-brand to-[#0B3EC1]">
        <div className="absolute -top-24 -right-16 w-96 h-96 rounded-full border-[56px] border-white/[0.05]" />
        <div className="absolute bottom-[-80px] right-24 w-64 h-64 rounded-full border-[40px] border-white/[0.04]" />

        <div className="relative z-10 flex flex-col justify-between p-12 text-white w-full">
          <div className="flex items-center gap-2.5">
            <div className="w-9 h-9 rounded-lg bg-white/15 backdrop-blur flex items-center justify-center font-display font-extrabold text-lg">
              R
            </div>
            <span className="font-display font-bold text-lg">Rankveer</span>
          </div>

          <div>
            <h2 className="font-display text-[34px] leading-[1.15] font-extrabold mb-4 max-w-sm">
              Everything behind the rank, in one place.
            </h2>
            <p className="text-white/75 text-[15px] leading-relaxed max-w-sm mb-10">
              The admin console for building mocks, verifying real papers, and running the exams that put a genuine
              number on where every student stands.
            </p>

            <div className="space-y-4">
              {FEATURES.map(({ Icon, label }) => (
                <div key={label} className="flex items-center gap-3">
                  <div className="w-8 h-8 rounded-lg bg-white/10 flex items-center justify-center shrink-0">
                    <Icon size={15} />
                  </div>
                  <span className="text-sm text-white/85">{label}</span>
                </div>
              ))}
            </div>
          </div>

          <p className="text-xs text-white/40">© {new Date().getFullYear()} Rankveer. Admin console.</p>
        </div>
      </div>

      {/* Form panel */}
      <div className="flex-1 flex items-center justify-center px-6 py-12 bg-slate-50 lg:bg-white">
        <div className="w-full max-w-sm">
          <div className="lg:hidden text-center mb-8">
            <div className="w-14 h-14 rounded-2xl bg-brand mx-auto flex items-center justify-center text-white text-2xl font-display font-bold shadow-lg shadow-brand/25">
              R
            </div>
            <h1 className="font-display text-2xl font-bold text-ink mt-4">Rankveer</h1>
          </div>

          {view === "login" ? <LoginForm onForgot={() => setView("forgot")} /> : <ForgotPasswordFlow onBack={() => setView("login")} />}

          <p className="flex items-center justify-center gap-1.5 text-xs text-slate-400 mt-8">
            <RiShieldCheckLine size={13} />
            Restricted access — authorized administrators only
          </p>
        </div>
      </div>
    </div>
  );
}

function LoginForm({ onForgot }) {
  const [mode, setMode] = useState("password"); // "password" | "otp"
  const [phone, setPhone] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [otp, setOtp] = useState("");
  const [otpSent, setOtpSent] = useState(false);
  const [sendingOtp, setSendingOtp] = useState(false);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const phoneRef = useRef(null);
  const { login, loginWithOtp } = useAuth();
  const navigate = useNavigate();

  useEffect(() => {
    phoneRef.current?.focus();
  }, []);

  function switchMode(next) {
    setMode(next);
    setError("");
    setOtpSent(false);
    setOtp("");
  }

  function friendlyError(err) {
    if (err.response?.status === 429) return "Too many attempts. Please wait a few minutes before trying again.";
    return err.response?.data?.message || err.message || "Login failed";
  }

  async function handlePasswordLogin(e) {
    e.preventDefault();
    setError("");
    setLoading(true);
    try {
      await login(phone, password);
      navigate("/");
    } catch (err) {
      setError(friendlyError(err));
    } finally {
      setLoading(false);
    }
  }

  async function handleSendOtp() {
    if (phone.length !== 10) {
      setError("Enter a valid 10-digit phone number");
      return;
    }
    setError("");
    setSendingOtp(true);
    try {
      await api.post("/auth/request-otp", { phone });
      setOtpSent(true);
    } catch (err) {
      setError(friendlyError(err));
    } finally {
      setSendingOtp(false);
    }
  }

  async function handleOtpLogin(e) {
    e.preventDefault();
    if (otp.length !== 6) {
      setError("Enter the 6-digit code");
      return;
    }
    setError("");
    setLoading(true);
    try {
      await loginWithOtp(phone, otp);
      navigate("/");
    } catch (err) {
      setError(friendlyError(err));
    } finally {
      setLoading(false);
    }
  }

  return (
    <>
      <div className="mb-7">
        <h1 className="font-display text-2xl font-bold text-ink">Welcome back</h1>
        <p className="text-sm text-slate-500 mt-1">Sign in to the admin console</p>
      </div>

      {/* Segmented mode toggle */}
      <div className="flex bg-slate-100 rounded-xl p-1 mb-6">
        <button
          type="button"
          onClick={() => switchMode("password")}
          className={`flex-1 py-2 rounded-lg text-sm font-semibold transition-all ${
            mode === "password" ? "bg-white text-brand shadow-sm" : "text-slate-500 hover:text-slate-700"
          }`}
        >
          Password
        </button>
        <button
          type="button"
          onClick={() => switchMode("otp")}
          className={`flex-1 py-2 rounded-lg text-sm font-semibold transition-all ${
            mode === "otp" ? "bg-white text-brand shadow-sm" : "text-slate-500 hover:text-slate-700"
          }`}
        >
          OTP
        </button>
      </div>

      <form
        onSubmit={
          mode === "password"
            ? handlePasswordLogin
            : otpSent
            ? handleOtpLogin
            : (e) => {
                e.preventDefault();
                handleSendOtp();
              }
        }
        className="space-y-5"
      >
        <div>
          <label className="block text-sm font-medium text-slate-700 mb-1.5">Admin Phone Number</label>
          <div className="relative">
            <RiPhoneLine size={17} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" />
            <input
              ref={phoneRef}
              type="tel"
              inputMode="numeric"
              autoComplete="tel"
              value={phone}
              disabled={mode === "otp" && otpSent}
              onChange={(e) => setPhone(e.target.value.replace(/[^0-9]/g, ""))}
              className="w-full pl-10 pr-4 py-2.5 rounded-lg border border-slate-200 focus:border-brand focus:ring-2 focus:ring-brand/20 outline-none transition disabled:bg-slate-50 disabled:text-slate-400"
              placeholder="Admin Phone Number"
              maxLength={10}
              required
            />
          </div>
        </div>

        {mode === "password" ? (
          <div>
            <div className="flex items-center justify-between mb-1.5">
              <label className="block text-sm font-medium text-slate-700">AdminPassword</label>
              <button type="button" onClick={onForgot} className="text-xs font-medium text-brand hover:underline">
                Forgot password?
              </button>
            </div>
            <div className="relative">
              <RiLockLine size={17} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" />
              <input
                type={showPassword ? "text" : "password"}
                autoComplete="current-password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="w-full pl-10 pr-11 py-2.5 rounded-lg border border-slate-200 focus:border-brand focus:ring-2 focus:ring-brand/20 outline-none transition"
                placeholder="••••••••"
                required
              />
              <button
                type="button"
                onClick={() => setShowPassword((s) => !s)}
                className="absolute right-3.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600"
                tabIndex={-1}
              >
                {showPassword ? <RiEyeOffLine size={17} /> : <RiEyeLine size={17} />}
              </button>
            </div>
          </div>
        ) : otpSent ? (
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1.5">Verification Code</label>
            <div className="relative">
              <RiKeyLine size={17} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" />
              <input
                type="text"
                inputMode="numeric"
                autoFocus
                value={otp}
                onChange={(e) => setOtp(e.target.value.replace(/[^0-9]/g, ""))}
                className="w-full pl-10 pr-4 py-2.5 rounded-lg border border-slate-200 focus:border-brand focus:ring-2 focus:ring-brand/20 outline-none transition tracking-widest font-semibold"
                placeholder="000000"
                maxLength={6}
                required
              />
            </div>
            <button type="button" onClick={handleSendOtp} disabled={sendingOtp} className="text-xs font-medium text-brand hover:underline mt-2">
              {sendingOtp ? "Sending..." : "Resend code"}
            </button>
          </div>
        ) : null}

        {error && <p className="text-sm text-red-600 bg-red-50 border border-red-100 rounded-lg px-3 py-2">{error}</p>}

        {mode === "password" ? (
          <button
            type="submit"
            disabled={loading}
            className="w-full bg-brand hover:bg-brand-dark text-white font-semibold py-2.5 rounded-lg transition-colors disabled:opacity-60 shadow-sm shadow-brand/20"
          >
            {loading ? "Signing in..." : "Sign In"}
          </button>
        ) : otpSent ? (
          <button
            type="submit"
            disabled={loading}
            className="w-full bg-brand hover:bg-brand-dark text-white font-semibold py-2.5 rounded-lg transition-colors disabled:opacity-60 shadow-sm shadow-brand/20"
          >
            {loading ? "Verifying..." : "Verify & Sign In"}
          </button>
        ) : (
          <button
            type="button"
            onClick={handleSendOtp}
            disabled={sendingOtp}
            className="w-full bg-brand hover:bg-brand-dark text-white font-semibold py-2.5 rounded-lg transition-colors disabled:opacity-60 shadow-sm shadow-brand/20"
          >
            {sendingOtp ? "Sending..." : "Send Code"}
          </button>
        )}
      </form>
    </>
  );
}

// Forgot-password: phone -> OTP + new password -> done. Reuses the same
// /auth/request-otp and /auth/reset-password endpoints the mobile app's
// password reset already uses.
function ForgotPasswordFlow({ onBack }) {
  const [step, setStep] = useState(1); // 1 = enter phone, 2 = enter OTP + new password, 3 = done
  const [phone, setPhone] = useState("");
  const [otp, setOtp] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  async function requestOtp(e) {
    e.preventDefault();
    setError("");
    if (phone.length !== 10) {
      setError("Enter a valid 10-digit phone number");
      return;
    }
    setLoading(true);
    try {
      await api.post("/auth/request-otp", { phone });
      setStep(2);
    } catch (err) {
      setError(err.response?.data?.message || "Couldn't send the code. Please try again.");
    } finally {
      setLoading(false);
    }
  }

  async function resetPassword(e) {
    e.preventDefault();
    setError("");
    if (otp.length !== 6) {
      setError("Enter the 6-digit code");
      return;
    }
    if (newPassword.length < 6) {
      setError("Password must be at least 6 characters");
      return;
    }
    setLoading(true);
    try {
      await api.post("/auth/reset-password", { phone, otp, newPassword });
      setStep(3);
    } catch (err) {
      setError(err.response?.data?.message || "Couldn't reset the password. Please check the code and try again.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <>
      <div className="mb-7">
        <h1 className="font-display text-2xl font-bold text-ink">{step === 3 ? "Password reset" : "Reset your password"}</h1>
        {step !== 3 && <p className="text-sm text-slate-500 mt-1">We'll text a code to verify it's you</p>}
      </div>

      {step === 1 && (
        <form onSubmit={requestOtp} className="space-y-5">
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1.5">Admin Phone Number</label>
            <div className="relative">
              <RiPhoneLine size={17} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" />
              <input
                type="tel"
                inputMode="numeric"
                autoFocus
                value={phone}
                onChange={(e) => setPhone(e.target.value.replace(/[^0-9]/g, ""))}
                className="w-full pl-10 pr-4 py-2.5 rounded-lg border border-slate-200 focus:border-brand focus:ring-2 focus:ring-brand/20 outline-none transition"
                placeholder="Admin Mobile Number"
                maxLength={10}
                required
              />
            </div>
          </div>

          {error && <p className="text-sm text-red-600 bg-red-50 border border-red-100 rounded-lg px-3 py-2">{error}</p>}

          <button
            type="submit"
            disabled={loading}
            className="w-full bg-brand hover:bg-brand-dark text-white font-semibold py-2.5 rounded-lg transition-colors disabled:opacity-60 shadow-sm shadow-brand/20"
          >
            {loading ? "Sending..." : "Send Code"}
          </button>

          <button
            type="button"
            onClick={onBack}
            className="flex items-center justify-center gap-1.5 w-full text-sm text-slate-500 hover:text-ink font-medium"
          >
            <RiArrowLeftLine size={15} /> Back to sign in
          </button>
        </form>
      )}

      {step === 2 && (
        <form onSubmit={resetPassword} className="space-y-5">
          <p className="text-sm text-slate-500 -mt-2">Code sent by SMS to {phone}.</p>

          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1.5">Verification Code</label>
            <div className="relative">
              <RiKeyLine size={17} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" />
              <input
                type="text"
                inputMode="numeric"
                autoFocus
                value={otp}
                onChange={(e) => setOtp(e.target.value.replace(/[^0-9]/g, ""))}
                className="w-full pl-10 pr-4 py-2.5 rounded-lg border border-slate-200 focus:border-brand focus:ring-2 focus:ring-brand/20 outline-none transition tracking-widest font-semibold"
                placeholder="000000"
                maxLength={6}
                required
              />
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1.5">New Password</label>
            <div className="relative">
              <RiLockLine size={17} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" />
              <input
                type={showPassword ? "text" : "password"}
                autoComplete="new-password"
                value={newPassword}
                onChange={(e) => setNewPassword(e.target.value)}
                className="w-full pl-10 pr-11 py-2.5 rounded-lg border border-slate-200 focus:border-brand focus:ring-2 focus:ring-brand/20 outline-none transition"
                placeholder="At least 6 characters"
                required
              />
              <button
                type="button"
                onClick={() => setShowPassword((s) => !s)}
                className="absolute right-3.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600"
                tabIndex={-1}
              >
                {showPassword ? <RiEyeOffLine size={17} /> : <RiEyeLine size={17} />}
              </button>
            </div>
          </div>

          {error && <p className="text-sm text-red-600 bg-red-50 border border-red-100 rounded-lg px-3 py-2">{error}</p>}

          <button
            type="submit"
            disabled={loading}
            className="w-full bg-brand hover:bg-brand-dark text-white font-semibold py-2.5 rounded-lg transition-colors disabled:opacity-60 shadow-sm shadow-brand/20"
          >
            {loading ? "Resetting..." : "Reset Password"}
          </button>

          <button
            type="button"
            onClick={() => setStep(1)}
            className="flex items-center justify-center gap-1.5 w-full text-sm text-slate-500 hover:text-ink font-medium"
          >
            <RiArrowLeftLine size={15} /> Use a different number
          </button>
        </form>
      )}

      {step === 3 && (
        <div className="text-center space-y-5">
          <div className="w-14 h-14 rounded-full bg-emerald-50 mx-auto flex items-center justify-center">
            <RiShieldCheckLine size={26} className="text-emerald-600" />
          </div>
          <p className="text-sm text-slate-600">Your password has been reset. Sign in with your new password.</p>
          <button
            onClick={onBack}
            className="w-full bg-brand hover:bg-brand-dark text-white font-semibold py-2.5 rounded-lg transition-colors shadow-sm shadow-brand/20"
          >
            Back to Sign In
          </button>
        </div>
      )}
    </>
  );
}