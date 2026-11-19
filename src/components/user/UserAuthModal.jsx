import { useState } from "react";
import {
  X,
  User,
  Lock,
  Phone,
  Mail,
  ArrowRight,
  ShieldCheck,
  CheckCircle2,
  AlertCircle,
  Sparkles
} from "lucide-react";
import { normalizeBangladeshPhone } from "../../utils/bangladesh";
import { apiClient } from "../../services/api";
import { useLanguage } from "../../Context/LanguageContext";

const UserAuthModal = ({
  isOpen,
  onClose,
  onLoginSuccess
}) => {
  const { isEnglish } = useLanguage();
  const [tab, setTab] = useState("login");
  const [loginIdentifier, setLoginIdentifier] = useState("");
  const [loginPassword, setLoginPassword] = useState("");
  const [regName, setRegName] = useState("");
  const [regPhone, setRegPhone] = useState("");
  const [regEmail, setRegEmail] = useState("");
  const [regPassword, setRegPassword] = useState("");
  const [forgotEmail, setForgotEmail] = useState("");
  const [forgotSent, setForgotSent] = useState(false);
  const [errorMsg, setErrorMsg] = useState("");
  const [successMsg, setSuccessMsg] = useState("");
  const [isLoading, setIsLoading] = useState(false);

  if (!isOpen) return null;

  const handleLogin = async (e) => {
    e.preventDefault();
    setErrorMsg("");
    setSuccessMsg("");

    const trimmed = loginIdentifier.trim();
    if (!trimmed) {
      setErrorMsg("Please enter phone number or email.");
      return;
    }
    if (!loginPassword || loginPassword.length < 4) {
      setErrorMsg("Please enter a valid password (at least 4 characters).");
      return;
    }

    const cleanIdentifier = trimmed.includes('@') ? trimmed : normalizeBangladeshPhone(trimmed);

    setIsLoading(true);
    try {
      const res = await apiClient.userAuth({
        action: 'login',
        phone: cleanIdentifier,
        password: loginPassword.trim()
      });

      if (res.success && res.user) {
        setSuccessMsg(res.message || ("Logged in successfully!"));
        setTimeout(() => {
          onLoginSuccess(res.user);
          onClose();
        }, 400);
      } else {
        setErrorMsg(res.message || ("Login failed. Check your phone number or password."));
      }
    } catch (err) {
      setErrorMsg(err?.message || ("Connection error. Please try again."));
    } finally {
      setIsLoading(false);
    }
  };

  const handleRegister = async (e) => {
    e.preventDefault();
    setErrorMsg("");
    setSuccessMsg("");

    if (!regName.trim()) {
      setErrorMsg("Please enter your full name.");
      return;
    }
    const cleanPhone = normalizeBangladeshPhone(regPhone);
    if (!cleanPhone || cleanPhone.length < 11) {
      setErrorMsg("Please enter a valid 11-digit phone number (e.g. 017XXXXXXXX).");
      return;
    }
    if (!regPassword || regPassword.length < 4) {
      setErrorMsg("Password must be at least 4 characters.");
      return;
    }

    setIsLoading(true);
    try {
      const res = await apiClient.userAuth({
        action: 'register',
        name: regName.trim(),
        phone: cleanPhone,
        email: regEmail.trim() || undefined,
        password: regPassword.trim()
      });

      if (res.success && res.user) {
        setSuccessMsg(res.message || ("Account created successfully!"));
        setTimeout(() => {
          onLoginSuccess(res.user);
          onClose();
        }, 500);
      } else {
        setErrorMsg(res.message || ("Failed to create account. Please try again."));
      }
    } catch (err) {
      setErrorMsg(err?.message || ("Connection error. Please try again."));
    } finally {
      setIsLoading(false);
    }
  };

  const handleForgotPassword = async (e) => {
    e.preventDefault();
    setErrorMsg("");
    setSuccessMsg("");

    const cleanEmail = forgotEmail.trim().toLowerCase();
    if (!cleanEmail || !cleanEmail.includes("@")) {
      setErrorMsg("Please enter a valid email address.");
      return;
    }

    setIsLoading(true);
    try {
      const res = await apiClient.forgotPassword(cleanEmail);
      if (res.success) {
        setForgotSent(true);
        setSuccessMsg(res.message || ("Password reset instructions sent to your email!"));
      } else {
        setErrorMsg(res.message || ("Account not found with this email."));
      }
    } catch (err) {
      setErrorMsg(err?.message || ("Connection error. Please try again."));
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 overflow-y-auto bg-black/60 backdrop-blur-xs flex items-center justify-center p-3 sm:p-4 animate-in fade-in duration-200">
      <div className="relative bg-white rounded-3xl max-w-md w-full overflow-hidden shadow-2xl p-6 sm:p-8 border border-neutral-200 animate-in zoom-in-95 duration-200">
        {/* Close Button */}
        <button
          onClick={onClose}
          className="absolute top-5 right-5 p-2 rounded-full text-neutral-400 hover:text-neutral-700 hover:bg-neutral-100 transition-colors"
        >
          <X className="w-5 h-5" />
        </button>

        {/* Top Header */}
        <div className="text-center mb-6">
          <div className="w-14 h-14 rounded-2xl bg-emerald-500/10 border border-emerald-500/20 text-emerald-600 flex items-center justify-center mx-auto mb-3">
            {tab === "forgot" ? <Mail className="w-7 h-7" /> : <User className="w-7 h-7" />}
          </div>
          <h2 className="text-2xl font-black text-neutral-900 tracking-tight">
            {tab === "login" 
              ? ("Customer Login")
              : tab === "register"
              ? ("Create Account")
              : ("Reset Password")}
          </h2>
          <p className="text-xs text-neutral-500 mt-1">
            {tab === "login"
              ? ("Sign in with your mobile number & password")
              : tab === "register"
              ? ("Create a free account for order tracking & faster checkout")
              : ("Enter your registered email to receive a new password")}
          </p>
        </div>

        {/* Tabs */}
        {tab !== "forgot" ? (
          <div className="flex bg-neutral-100 p-1 rounded-xl mb-5 text-xs font-semibold">
            <button
              type="button"
              onClick={() => {
                setTab("login");
                setErrorMsg("");
                setSuccessMsg("");
              }}
              className={`flex-1 py-2 rounded-lg transition-all ${
                tab === "login"
                  ? "bg-white text-emerald-800 shadow-xs"
                  : "text-neutral-500 hover:text-neutral-900"
              }`}
            >
              {"Sign In"}
            </button>
            <button
              type="button"
              onClick={() => {
                setTab("register");
                setErrorMsg("");
                setSuccessMsg("");
              }}
              className={`flex-1 py-2 rounded-lg transition-all ${
                tab === "register"
                  ? "bg-white text-emerald-800 shadow-xs"
                  : "text-neutral-500 hover:text-neutral-900"
              }`}
            >
              {"Sign Up"}
            </button>
          </div>
        ) : (
          <div className="flex items-center justify-between mb-5 bg-emerald-50/80 border border-emerald-100 px-3.5 py-2 rounded-xl text-xs">
            <span className="font-bold text-emerald-800 flex items-center gap-1.5">
              <Mail className="w-3.5 h-3.5 text-emerald-600" />
              {"Password Recovery"}
            </span>
            <button
              type="button"
              onClick={() => {
                setTab("login");
                setErrorMsg("");
                setSuccessMsg("");
                setForgotSent(false);
              }}
              className="text-emerald-700 hover:text-emerald-900 font-semibold hover:underline cursor-pointer"
            >
              ← {"Back to Login"}
            </button>
          </div>
        )}

        {errorMsg && (
          <div className="mb-4 p-3 rounded-xl bg-rose-50 border border-rose-200 text-xs text-rose-700 flex items-center gap-2">
            <AlertCircle className="w-4 h-4 shrink-0 text-rose-500" />
            <span>{errorMsg}</span>
          </div>
        )}

        {successMsg && (
          <div className="mb-4 p-3 rounded-xl bg-emerald-50 border border-emerald-200 text-xs text-emerald-700 flex items-center gap-2 font-medium">
            <CheckCircle2 className="w-4 h-4 shrink-0 text-emerald-600" />
            <span>{successMsg}</span>
          </div>
        )}

        {tab === "login" ? (
          <form onSubmit={handleLogin} className="space-y-4 text-xs">
            <div>
              <label className="block font-bold text-neutral-700 mb-1">
                {"Mobile Number or Email"}
              </label>
              <div className="relative">
                <Phone className="w-4 h-4 absolute left-3.5 top-1/2 -translate-y-1/2 text-neutral-400" />
                <input
                  type="text"
                  required
                  placeholder={"017XXXXXXXX or email@gmail.com"}
                  value={loginIdentifier}
                  onChange={(e) => setLoginIdentifier(e.target.value)}
                  className="w-full pl-10 pr-3.5 py-2.5 bg-neutral-50 rounded-xl border border-neutral-300 focus:bg-white focus:border-emerald-600 focus:outline-hidden text-neutral-900 text-xs font-medium"
                />
              </div>
            </div>

            <div>
              <div className="flex justify-between items-center mb-1">
                <label className="font-bold text-neutral-700">
                  {"Password"}
                </label>
                <button
                  type="button"
                  onClick={() => {
                    setTab("forgot");
                    setErrorMsg("");
                    setSuccessMsg("");
                    setForgotSent(false);
                    if (loginIdentifier.includes('@')) {
                      setForgotEmail(loginIdentifier);
                    }
                  }}
                  className="text-[11px] text-emerald-600 hover:text-emerald-700 font-semibold hover:underline cursor-pointer bg-transparent border-0 p-0"
                >
                  {"Forgot password?"}
                </button>
              </div>
              <div className="relative">
                <Lock className="w-4 h-4 absolute left-3.5 top-1/2 -translate-y-1/2 text-neutral-400" />
                <input
                  type="password"
                  required
                  placeholder="••••••••"
                  value={loginPassword}
                  onChange={(e) => setLoginPassword(e.target.value)}
                  className="w-full pl-10 pr-3.5 py-2.5 bg-neutral-50 rounded-xl border border-neutral-300 focus:bg-white focus:border-emerald-600 focus:outline-hidden text-neutral-900 text-xs font-medium"
                />
              </div>
            </div>

            <button
              type="submit"
              disabled={isLoading}
              className="w-full py-3 px-4 bg-emerald-600 hover:bg-emerald-700 text-white font-bold rounded-xl transition-colors shadow-md text-xs flex items-center justify-center gap-2 disabled:opacity-50 cursor-pointer"
            >
              <span>
                {isLoading
                  ? ("Signing in...")
                  : ("Sign In to Account")}
              </span>
              <ArrowRight className="w-4 h-4" />
            </button>
          </form>
        ) : tab === "register" ? (
          <form onSubmit={handleRegister} className="space-y-3.5 text-xs">
            <div>
              <label className="block font-bold text-neutral-700 mb-1">
                {"Full Name"}
              </label>
              <div className="relative">
                <User className="w-4 h-4 absolute left-3.5 top-1/2 -translate-y-1/2 text-neutral-400" />
                <input
                  type="text"
                  required
                  placeholder={"e.g. Tanvir Ahmed"}
                  value={regName}
                  onChange={(e) => setRegName(e.target.value)}
                  className="w-full pl-10 pr-3.5 py-2.5 bg-neutral-50 rounded-xl border border-neutral-300 focus:bg-white focus:border-emerald-600 focus:outline-hidden text-neutral-900 text-xs font-medium"
                />
              </div>
            </div>

            <div>
              <label className="block font-bold text-neutral-700 mb-1">
                {"Mobile Number (11 Digits)"}
              </label>
              <div className="relative">
                <Phone className="w-4 h-4 absolute left-3.5 top-1/2 -translate-y-1/2 text-neutral-400" />
                <input
                  type="tel"
                  required
                  placeholder="01XXXXXXXXX"
                  value={regPhone}
                  onChange={(e) => setRegPhone(e.target.value)}
                  className="w-full pl-10 pr-3.5 py-2.5 bg-neutral-50 rounded-xl border border-neutral-300 focus:bg-white focus:border-emerald-600 focus:outline-hidden text-neutral-900 text-xs font-medium"
                />
              </div>
            </div>

            <div>
              <label className="block font-bold text-neutral-700 mb-1">
                {"Email Address"}{" "}
                <span className="text-neutral-400 font-normal">
                  {"(For password recovery & invoices)"}
                </span>
              </label>
              <div className="relative">
                <Mail className="w-4 h-4 absolute left-3.5 top-1/2 -translate-y-1/2 text-neutral-400" />
                <input
                  type="email"
                  placeholder="name@gmail.com"
                  value={regEmail}
                  onChange={(e) => setRegEmail(e.target.value)}
                  className="w-full pl-10 pr-3.5 py-2.5 bg-neutral-50 rounded-xl border border-neutral-300 focus:bg-white focus:border-emerald-600 focus:outline-hidden text-neutral-900 text-xs font-medium"
                />
              </div>
            </div>

            <div>
              <label className="block font-bold text-neutral-700 mb-1">
                {"Create Password"}
              </label>
              <div className="relative">
                <Lock className="w-4 h-4 absolute left-3.5 top-1/2 -translate-y-1/2 text-neutral-400" />
                <input
                  type="password"
                  required
                  placeholder={"At least 4 characters"}
                  value={regPassword}
                  onChange={(e) => setRegPassword(e.target.value)}
                  className="w-full pl-10 pr-3.5 py-2.5 bg-neutral-50 rounded-xl border border-neutral-300 focus:bg-white focus:border-emerald-600 focus:outline-hidden text-neutral-900 text-xs font-medium"
                />
              </div>
            </div>

            <button
              type="submit"
              disabled={isLoading}
              className="w-full py-3 px-4 bg-emerald-600 hover:bg-emerald-700 text-white font-bold rounded-xl transition-colors shadow-md text-xs flex items-center justify-center gap-2 disabled:opacity-50 cursor-pointer"
            >
              <span>
                {isLoading
                  ? ("Creating account...")
                  : ("Complete Registration")}
              </span>
              <ArrowRight className="w-4 h-4" />
            </button>
          </form>
        ) : (
          <form onSubmit={handleForgotPassword} className="space-y-4 text-xs">
            <div>
              <label className="block font-bold text-neutral-700 mb-1">
                {"Registered Email Address"}
              </label>
              <div className="relative">
                <Mail className="w-4 h-4 absolute left-3.5 top-1/2 -translate-y-1/2 text-neutral-400" />
                <input
                  type="email"
                  required
                  autoFocus
                  placeholder="yourname@gmail.com"
                  value={forgotEmail}
                  onChange={(e) => setForgotEmail(e.target.value)}
                  className="w-full pl-10 pr-3.5 py-2.5 bg-neutral-50 rounded-xl border border-neutral-300 focus:bg-white focus:border-emerald-600 focus:outline-hidden text-neutral-900 text-xs font-medium"
                />
              </div>
              <p className="text-[11px] text-neutral-500 mt-1.5 leading-relaxed">
                {"We will generate a new temporary password and send it directly to your email inbox."}
              </p>
            </div>

            <button
              type="submit"
              disabled={isLoading || forgotSent}
              className="w-full py-3 px-4 bg-emerald-600 hover:bg-emerald-700 text-white font-bold rounded-xl transition-colors shadow-md text-xs flex items-center justify-center gap-2 disabled:opacity-50 cursor-pointer"
            >
              <span>
                {isLoading
                  ? ("Sending reset email...")
                  : forgotSent
                  ? ("Password Sent ✓")
                  : ("Send New Password to Email")}
              </span>
              <ArrowRight className="w-4 h-4" />
            </button>

            <div className="text-center pt-2">
              <button
                type="button"
                onClick={() => {
                  setTab("login");
                  setErrorMsg("");
                  setSuccessMsg("");
                  setForgotSent(false);
                }}
                className="text-xs text-neutral-600 hover:text-emerald-700 font-semibold cursor-pointer"
              >
                ← {"Back to Login"}
              </button>
            </div>
          </form>
        )}

        <div className="mt-4 text-center">
          <p className="text-[11px] text-neutral-400 flex items-center justify-center gap-1">
            <ShieldCheck className="w-3.5 h-3.5 text-emerald-600" />
            <span>
              {"Your privacy and data security are 100% guaranteed."}
            </span>
          </p>
        </div>
      </div>
    </div>
  );
};
export {
  UserAuthModal
};
