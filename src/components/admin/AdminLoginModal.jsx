import { useState, useEffect } from "react";
import { ShieldCheck, Lock, User, AlertCircle, ArrowLeft, KeyRound, Mail, CheckCircle2 } from "lucide-react";
import { useThemeConfig } from "../frontPanel/FrontPanelContext";
import { apiClient } from "../../services/api";

const AdminLoginModal = ({
  onSuccess,
  onBackToStore
}) => {
  const frontPanel = useThemeConfig?.() || {};
  const currentThemeShop = frontPanel?.themeConfig?.shop;

  const [shopName, setShopName] = useState(() => {
    return currentThemeShop?.name || currentThemeShop?.shopName || "AmarDokan";
  });

  useEffect(() => {
    if (currentThemeShop?.name || currentThemeShop?.shopName) {
      setShopName(currentThemeShop?.name || currentThemeShop?.shopName);
      return;
    }
    apiClient.getShopSettings().then((st) => {
      if (st && (st.shopName || st.name)) {
        setShopName(st.shopName || st.name);
      }
    }).catch(() => {});
  }, [currentThemeShop]);

  const [mode, setMode] = useState("login"); // 'login' | '2fa' | 'forgot' | 'reset'
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");

  // 2FA challenge state
  const [challengeToken, setChallengeToken] = useState("");
  const [twoFaMethod, setTwoFaMethod] = useState("TOTP");
  const [twoFaTarget, setTwoFaTarget] = useState("");
  const [hasRecoveryPin, setHasRecoveryPin] = useState(false);
  const [twoFaCode, setTwoFaCode] = useState("");

  // Forgot password state
  const [forgotIdentifier, setForgotIdentifier] = useState("");
  const [resetToken, setResetToken] = useState("");
  const [resetOtp, setResetOtp] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmNewPassword, setConfirmNewPassword] = useState("");

  const [error, setError] = useState("");
  const [successMsg, setSuccessMsg] = useState("");
  const [loading, setLoading] = useState(false);

  const handleLogin = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError("");
    setSuccessMsg("");

    const cleanUser = username.trim().toLowerCase();
    const cleanPass = password.trim();

    try {
      const res = await apiClient.staffLogin({ username: cleanUser, password: cleanPass });
      const staffUser = res?.user || res?.staff;

      if (res?.success && res?.requiresTwoStep && res?.challengeToken) {
        setChallengeToken(res.challengeToken);
        setTwoFaMethod(res.method || "TOTP");
        setTwoFaTarget(res.maskedTarget || "Authenticator App");
        setHasRecoveryPin(Boolean(res.hasRecoveryPin));
        setTwoFaCode("");
        setMode("2fa");
        setSuccessMsg(res.message || "Enter your 6-digit verification code.");
        setLoading(false);
        return;
      }

      if (res?.success && staffUser) {
        onSuccess(staffUser);
        setLoading(false);
        return;
      }

      setError(res?.message || "Invalid username or password. Please try again.");
    } catch {
      setError("Unable to reach authentication server. Please check your connection and try again.");
    }

    setLoading(false);
  };

  const handleVerify2FA = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError("");
    try {
      const res = await apiClient.verifyStaff2FA({
        challengeToken,
        code: twoFaCode.trim(),
      });
      const staffUser = res?.user || res?.staff;
      if (res?.success && staffUser) {
        onSuccess(staffUser);
      } else {
        setError(res?.message || "Invalid verification code. Please try again.");
      }
    } catch {
      setError("Failed to verify code. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  const handleSendForgotOtp = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError("");
    setSuccessMsg("");
    try {
      const res = await apiClient.staffForgotPassword(forgotIdentifier.trim());
      if (res?.success && res?.resetToken) {
        setResetToken(res.resetToken);
        setResetOtp("");
        setNewPassword("");
        setConfirmNewPassword("");
        setMode("reset");
        setSuccessMsg(res.message || "Verification code sent to your email.");
      } else {
        setError(res?.message || "Could not send password reset code.");
      }
    } catch {
      setError("Failed to connect to server.");
    } finally {
      setLoading(false);
    }
  };

  const handleCompleteResetPassword = async (e) => {
    e.preventDefault();
    setError("");
    setSuccessMsg("");
    if (newPassword.trim().length < 4) {
      setError("New password must be at least 4 characters long.");
      return;
    }
    if (newPassword.trim() !== confirmNewPassword.trim()) {
      setError("Passwords do not match.");
      return;
    }
    setLoading(true);
    try {
      const res = await apiClient.staffResetPassword({
        resetToken,
        otp: resetOtp.trim(),
        newPassword: newPassword.trim(),
      });
      if (res?.success) {
        setMode("login");
        setPassword("");
        setSuccessMsg(res.message || "Password reset successfully! Please sign in.");
      } else {
        setError(res?.message || "Invalid or expired verification code.");
      }
    } catch {
      setError("Failed to reset password.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-neutral-950 flex flex-col justify-center items-center p-4 relative">
      <div className="max-w-md w-full bg-neutral-900 border border-neutral-800 rounded-3xl p-7 sm:p-8 shadow-2xl text-neutral-100">
        <div className="flex items-center justify-between mb-6">
          <button
            onClick={mode === "login" ? onBackToStore : () => {
              setMode("login");
              setError("");
              setSuccessMsg("");
            }}
            className="inline-flex items-center gap-1.5 text-xs text-neutral-400 hover:text-white transition-colors cursor-pointer"
          >
            <ArrowLeft className="w-4 h-4" />
            <span>{mode === "login" ? "Return to Shop" : "Back to Sign In"}</span>
          </button>
        </div>

        <div className="w-14 h-14 rounded-2xl bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 flex items-center justify-center mb-5 shadow-xs">
          {mode === "2fa" ? (
            <KeyRound className="w-7 h-7" />
          ) : mode === "forgot" || mode === "reset" ? (
            <Mail className="w-7 h-7" />
          ) : (
            <ShieldCheck className="w-8 h-8" />
          )}
        </div>

        <h2 className="text-2xl font-black text-white tracking-tight">
          {mode === "2fa"
            ? "Two-Step Verification"
            : mode === "forgot" || mode === "reset"
              ? "Admin Password Recovery"
              : `${shopName} Operations Portal`}
        </h2>
        <p className="text-xs text-neutral-400 mt-1.5 mb-6 leading-relaxed">
          {mode === "2fa"
            ? (twoFaMethod === "EMAIL_OTP"
                ? `Enter the 6-digit security code sent to ${twoFaTarget}.`
                : `Enter the 6-digit code from your Authenticator app${hasRecoveryPin ? " or Backup Recovery PIN" : ""}.`)
            : mode === "forgot"
              ? "Enter your staff username or registered email to receive a 6-digit recovery code."
              : mode === "reset"
                ? "Enter the 6-digit email verification code and choose a new password."
                : "Sign in with your assigned role credentials (Admin, Manager, or Dispatcher)."}
        </p>

        {error && (
          <div className="mb-4 p-3 bg-red-950/40 border border-red-800/60 rounded-xl text-red-300 text-xs flex items-center gap-2">
            <AlertCircle className="w-4 h-4 shrink-0 text-red-400" />
            <span>{error}</span>
          </div>
        )}

        {successMsg && (
          <div className="mb-4 p-3 bg-emerald-950/40 border border-emerald-800/60 rounded-xl text-emerald-300 text-xs flex items-center gap-2">
            <CheckCircle2 className="w-4 h-4 shrink-0 text-emerald-400" />
            <span>{successMsg}</span>
          </div>
        )}

        {mode === "login" && (
          <form onSubmit={handleLogin} className="space-y-4">
            <div>
              <label className="block text-xs font-semibold text-neutral-300 mb-1.5">
                Username
              </label>
              <div className="relative">
                <User className="w-4 h-4 text-neutral-500 absolute left-3.5 top-1/2 -translate-y-1/2" />
                <input
                  type="text"
                  required
                  value={username}
                  onChange={(e) => setUsername(e.target.value)}
                  className="w-full bg-neutral-800/60 border border-neutral-700 rounded-xl pl-10 pr-4 py-2.5 text-sm text-white focus:border-emerald-500 focus:outline-hidden"
                  placeholder="Enter username"
                />
              </div>
            </div>

            <div>
              <div className="flex items-center justify-between mb-1.5">
                <label className="block text-xs font-semibold text-neutral-300">
                  Password
                </label>
                <button
                  type="button"
                  onClick={() => {
                    setMode("forgot");
                    setForgotIdentifier(username.trim());
                    setError("");
                    setSuccessMsg("");
                  }}
                  className="text-[11px] font-semibold text-emerald-400 hover:text-emerald-300 hover:underline cursor-pointer"
                >
                  Forgot Password?
                </button>
              </div>
              <div className="relative">
                <Lock className="w-4 h-4 text-neutral-500 absolute left-3.5 top-1/2 -translate-y-1/2" />
                <input
                  type="password"
                  required
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="w-full bg-neutral-800/60 border border-neutral-700 rounded-xl pl-10 pr-4 py-2.5 text-sm text-white focus:border-emerald-500 focus:outline-hidden"
                  placeholder="••••••••"
                />
              </div>
            </div>

            <button
              type="submit"
              disabled={loading}
              className="w-full py-3 bg-emerald-600 hover:bg-emerald-500 font-bold text-sm text-white rounded-xl transition-colors shadow-lg shadow-emerald-900/30 flex items-center justify-center gap-2 mt-2 cursor-pointer disabled:opacity-50"
            >
              {loading ? "Verifying..." : "Sign In"}
            </button>
          </form>
        )}

        {mode === "2fa" && (
          <form onSubmit={handleVerify2FA} className="space-y-4">
            <div>
              <label className="block text-xs font-semibold text-neutral-300 mb-1.5">
                6-Digit Verification Code
              </label>
              <input
                type="text"
                inputMode="numeric"
                maxLength={6}
                required
                autoFocus
                value={twoFaCode}
                onChange={(e) => setTwoFaCode(e.target.value.replace(/\D/g, ""))}
                placeholder="000000"
                className="w-full bg-neutral-800/60 border border-neutral-700 rounded-xl px-4 py-3 text-center text-xl font-mono font-bold tracking-[0.4em] text-white focus:border-emerald-500 focus:outline-hidden"
              />
            </div>

            <button
              type="submit"
              disabled={loading || twoFaCode.length < 6}
              className="w-full py-3 bg-emerald-600 hover:bg-emerald-500 font-bold text-sm text-white rounded-xl transition-colors shadow-lg shadow-emerald-900/30 flex items-center justify-center gap-2 cursor-pointer disabled:opacity-50"
            >
              {loading ? "Verifying Code..." : "Verify & Access Portal"}
            </button>
          </form>
        )}

        {mode === "forgot" && (
          <form onSubmit={handleSendForgotOtp} className="space-y-4">
            <div>
              <label className="block text-xs font-semibold text-neutral-300 mb-1.5">
                Staff Username or Email
              </label>
              <div className="relative">
                <User className="w-4 h-4 text-neutral-500 absolute left-3.5 top-1/2 -translate-y-1/2" />
                <input
                  type="text"
                  required
                  autoFocus
                  value={forgotIdentifier}
                  onChange={(e) => setForgotIdentifier(e.target.value)}
                  className="w-full bg-neutral-800/60 border border-neutral-700 rounded-xl pl-10 pr-4 py-2.5 text-sm text-white focus:border-emerald-500 focus:outline-hidden"
                  placeholder="e.g. admin or admin@yourstore.com"
                />
              </div>
            </div>

            <button
              type="submit"
              disabled={loading}
              className="w-full py-3 bg-emerald-600 hover:bg-emerald-500 font-bold text-sm text-white rounded-xl transition-colors shadow-lg shadow-emerald-900/30 flex items-center justify-center gap-2 cursor-pointer disabled:opacity-50"
            >
              {loading ? "Sending Code..." : "Send 6-Digit Recovery Code"}
            </button>
          </form>
        )}

        {mode === "reset" && (
          <form onSubmit={handleCompleteResetPassword} className="space-y-4">
            <div>
              <label className="block text-xs font-semibold text-neutral-300 mb-1.5">
                6-Digit Email Code
              </label>
              <input
                type="text"
                inputMode="numeric"
                maxLength={6}
                required
                autoFocus
                value={resetOtp}
                onChange={(e) => setResetOtp(e.target.value.replace(/\D/g, ""))}
                placeholder="000000"
                className="w-full bg-neutral-800/60 border border-neutral-700 rounded-xl px-4 py-2.5 text-center text-lg font-mono font-bold tracking-[0.35em] text-white focus:border-emerald-500 focus:outline-hidden"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-neutral-300 mb-1.5">
                New Password
              </label>
              <input
                type="password"
                required
                value={newPassword}
                onChange={(e) => setNewPassword(e.target.value)}
                placeholder="At least 4 characters"
                className="w-full bg-neutral-800/60 border border-neutral-700 rounded-xl px-4 py-2.5 text-sm text-white focus:border-emerald-500 focus:outline-hidden"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-neutral-300 mb-1.5">
                Confirm New Password
              </label>
              <input
                type="password"
                required
                value={confirmNewPassword}
                onChange={(e) => setConfirmNewPassword(e.target.value)}
                placeholder="Repeat new password"
                className="w-full bg-neutral-800/60 border border-neutral-700 rounded-xl px-4 py-2.5 text-sm text-white focus:border-emerald-500 focus:outline-hidden"
              />
            </div>

            <button
              type="submit"
              disabled={loading || resetOtp.length < 6}
              className="w-full py-3 bg-emerald-600 hover:bg-emerald-500 font-bold text-sm text-white rounded-xl transition-colors shadow-lg shadow-emerald-900/30 flex items-center justify-center gap-2 cursor-pointer disabled:opacity-50"
            >
              {loading ? "Resetting..." : "Update Password & Sign In"}
            </button>
          </form>
        )}
      </div>
    </div>
  );
};

export { AdminLoginModal };
