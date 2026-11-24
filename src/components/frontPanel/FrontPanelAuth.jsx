import React, { useState } from "react";
import { Lock, User, Eye, EyeOff, ShieldCheck, ArrowLeft, Sparkles, KeyRound } from "lucide-react";
import { apiClient } from "../../services/api";

export const FrontPanelAuth = ({ onAuthenticated, onCancel }) => {
  const [mode, setMode] = useState("login"); // 'login' | '2fa'
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);

  // 2FA challenge state
  const [challengeToken, setChallengeToken] = useState("");
  const [twoFaTarget, setTwoFaTarget] = useState("");
  const [twoFaCode, setTwoFaCode] = useState("");
  const [hasRecoveryPin, setHasRecoveryPin] = useState(false);

  const [error, setError] = useState("");
  const [successMsg, setSuccessMsg] = useState("");
  const [isLoading, setIsLoading] = useState(false);

  const completeAuth = (staffUser) => {
    try {
      sessionStorage.setItem("amardokan_front_auth", "true");
      if (staffUser) {
        sessionStorage.setItem("amardokan_front_user", JSON.stringify(staffUser));
      }
    } catch {}
    onAuthenticated(staffUser);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError("");
    setSuccessMsg("");
    setIsLoading(true);

    try {
      const res = await apiClient.staffLogin({
        username: username.trim().toLowerCase(),
        password: password.trim(),
        portal: "front_panel",
      });

      if (res?.success && res?.requiresTwoStep && res?.challengeToken) {
        setChallengeToken(res.challengeToken);
        setTwoFaTarget(res.maskedTarget || "Authenticator App");
        setHasRecoveryPin(Boolean(res.hasRecoveryPin));
        setTwoFaCode("");
        setMode("2fa");
        setSuccessMsg(res.message || "Enter your 6-digit verification code.");
        return;
      }

      const staffUser = res?.user || res?.staff;
      if (res?.success && staffUser) {
        completeAuth(staffUser);
        return;
      }

      setError(res?.message || "Invalid username or password, or insufficient permissions.");
    } catch {
      setError("Unable to reach authentication server. Please verify backend connection.");
    } finally {
      setIsLoading(false);
    }
  };

  const handleVerify2FA = async (e) => {
    e.preventDefault();
    setError("");
    setIsLoading(true);
    try {
      const res = await apiClient.verifyStaff2FA({
        challengeToken,
        code: twoFaCode.trim(),
        portal: "front_panel",
      });
      const staffUser = res?.user || res?.staff;
      if (res?.success && staffUser) {
        completeAuth(staffUser);
      } else {
        setError(res?.message || "Invalid verification code. Please try again.");
      }
    } catch {
      setError("Failed to verify code. Please try again.");
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-neutral-950 via-neutral-900 to-neutral-950 flex items-center justify-center p-4 selection:bg-emerald-500 selection:text-white">
      <div className="max-w-md w-full bg-neutral-900/90 border border-neutral-800 rounded-3xl p-7 sm:p-8 shadow-2xl backdrop-blur-xl relative overflow-hidden">
        <div className="absolute -top-24 -right-24 w-48 h-48 bg-emerald-500/10 rounded-full blur-3xl pointer-events-none" />
        <div className="absolute -bottom-24 -left-24 w-48 h-48 bg-teal-500/10 rounded-full blur-3xl pointer-events-none" />

        <div className="text-center mb-6">
          <div className="inline-flex items-center justify-center w-14 h-14 rounded-2xl bg-gradient-to-tr from-emerald-600 to-teal-500 text-white shadow-lg shadow-emerald-900/30 mb-4 ring-4 ring-emerald-500/20">
            <Sparkles className="w-7 h-7 text-white" />
          </div>
          <h2 className="text-xl sm:text-2xl font-black text-white tracking-tight">
            {mode === "2fa" ? "Two-Step Verification" : "Front Panel Customizer"}
          </h2>
          <p className="text-xs text-neutral-400 mt-1.5">
            {mode === "2fa"
              ? `Enter the 6-digit code from ${twoFaTarget}${hasRecoveryPin ? " (or Backup PIN)" : ""}.`
              : "Sign in with your Admin Panel staff credentials to customize storefront design & settings."}
          </p>
        </div>

        {error && (
          <div className="mb-4 p-3 rounded-xl bg-rose-950/60 border border-rose-800/60 text-xs text-rose-300 flex items-center gap-2 animate-in fade-in">
            <span>⚠️</span>
            <span>{error}</span>
          </div>
        )}

        {successMsg && (
          <div className="mb-4 p-3 rounded-xl bg-emerald-950/60 border border-emerald-800/60 text-xs text-emerald-300 flex items-center gap-2 animate-in fade-in">
            <ShieldCheck className="w-4 h-4 shrink-0 text-emerald-400" />
            <span>{successMsg}</span>
          </div>
        )}

        {mode === "2fa" ? (
          <form onSubmit={handleVerify2FA} className="space-y-4 text-xs">
            <div>
              <label className="block text-neutral-300 font-semibold mb-1.5">Verification Code</label>
              <div className="relative">
                <KeyRound className="w-4 h-4 text-neutral-500 absolute left-3.5 top-1/2 -translate-y-1/2" />
                <input
                  type="text"
                  required
                  value={twoFaCode}
                  onChange={(e) => setTwoFaCode(e.target.value)}
                  placeholder="Enter 6-digit code"
                  className="w-full bg-neutral-950 border border-neutral-700/80 rounded-xl pl-10 pr-3.5 py-2.5 text-white placeholder-neutral-500 focus:outline-none focus:border-emerald-500 focus:ring-1 focus:ring-emerald-500 transition-all font-mono text-sm tracking-widest"
                />
              </div>
            </div>

            <button
              type="submit"
              disabled={isLoading}
              className="w-full mt-2 py-3 rounded-xl bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-500 hover:to-teal-500 text-white font-bold text-xs shadow-lg shadow-emerald-900/40 transition-all cursor-pointer flex items-center justify-center gap-2 disabled:opacity-50"
            >
              {isLoading ? (
                <span className="inline-block w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
              ) : (
                <>
                  <ShieldCheck className="w-4 h-4" />
                  <span>Verify & Open Panel</span>
                </>
              )}
            </button>

            <button
              type="button"
              onClick={() => {
                setMode("login");
                setError("");
                setSuccessMsg("");
              }}
              className="w-full text-center text-neutral-400 hover:text-white text-xs pt-1 cursor-pointer"
            >
              ← Back to Password Sign In
            </button>
          </form>
        ) : (
          <form onSubmit={handleSubmit} className="space-y-4 text-xs">
            <div>
              <label className="block text-neutral-300 font-semibold mb-1.5">Staff Username</label>
              <div className="relative">
                <User className="w-4 h-4 text-neutral-500 absolute left-3.5 top-1/2 -translate-y-1/2" />
                <input
                  type="text"
                  required
                  value={username}
                  onChange={(e) => setUsername(e.target.value)}
                  placeholder="Enter staff username"
                  className="w-full bg-neutral-950 border border-neutral-700/80 rounded-xl pl-10 pr-3.5 py-2.5 text-white placeholder-neutral-500 focus:outline-none focus:border-emerald-500 focus:ring-1 focus:ring-emerald-500 transition-all font-medium text-xs"
                />
              </div>
            </div>

            <div>
              <label className="block text-neutral-300 font-semibold mb-1.5">Password</label>
              <div className="relative">
                <Lock className="w-4 h-4 text-neutral-500 absolute left-3.5 top-1/2 -translate-y-1/2" />
                <input
                  type={showPassword ? "text" : "password"}
                  required
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="••••••••••••"
                  className="w-full bg-neutral-950 border border-neutral-700/80 rounded-xl pl-10 pr-10 py-2.5 text-white placeholder-neutral-500 focus:outline-none focus:border-emerald-500 focus:ring-1 focus:ring-emerald-500 transition-all font-medium text-xs"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-3.5 top-1/2 -translate-y-1/2 text-neutral-400 hover:text-white transition-colors cursor-pointer"
                >
                  {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                </button>
              </div>
            </div>

            <button
              type="submit"
              disabled={isLoading}
              className="w-full mt-2 py-3 rounded-xl bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-500 hover:to-teal-500 text-white font-bold text-xs shadow-lg shadow-emerald-900/40 transition-all cursor-pointer flex items-center justify-center gap-2 disabled:opacity-50"
            >
              {isLoading ? (
                <span className="inline-block w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
              ) : (
                <>
                  <Lock className="w-3.5 h-3.5" />
                  <span>Log In & Open Panel</span>
                </>
              )}
            </button>
          </form>
        )}

        <div className="mt-6 pt-4 border-t border-neutral-800/80 flex items-center justify-between text-xs">
          <button
            type="button"
            onClick={onCancel}
            className="text-neutral-400 hover:text-white flex items-center gap-1.5 transition-colors cursor-pointer"
          >
            <ArrowLeft className="w-3.5 h-3.5" />
            <span>Back to Store</span>
          </button>
          <span className="text-[11px] text-neutral-500 flex items-center gap-1">
            <ShieldCheck className="w-3.5 h-3.5 text-emerald-500" />
            <span>Admin DB Auth</span>
          </span>
        </div>
      </div>
    </div>
  );
};
