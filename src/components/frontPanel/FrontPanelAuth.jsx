import React, { useState } from "react";
import { Lock, User, Eye, EyeOff, ShieldCheck, ArrowLeft, Sparkles } from "lucide-react";
import logoImg from "../../assets/LOGO-WEb.png";

export const FrontPanelAuth = ({ onAuthenticated, onCancel }) => {
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState("");
  const [isLoading, setIsLoading] = useState(false);

  // Read credentials from .env with fallback
  const validUser = import.meta.env.VITE_FRONT_PANEL_USER || "admin";
  const validPass = import.meta.env.VITE_FRONT_PANEL_PASS || "amardokan2026";

  const handleSubmit = (e) => {
    e.preventDefault();
    setError("");
    setIsLoading(true);

    setTimeout(() => {
      if (username.trim() === validUser && password === validPass) {
        sessionStorage.setItem("amardokan_front_auth", "true");
        setIsLoading(false);
        onAuthenticated();
      } else {
        setIsLoading(false);
        setError("Invalid username or password! Please check your credentials and try again.");
      }
    }, 250);
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-neutral-950 via-neutral-900 to-neutral-950 flex items-center justify-center p-4 selection:bg-emerald-500 selection:text-white">
      <div className="max-w-md w-full bg-neutral-900/90 border border-neutral-800 rounded-3xl p-7 sm:p-8 shadow-2xl backdrop-blur-xl relative overflow-hidden">
        {/* Glow decoration */}
        <div className="absolute -top-24 -right-24 w-48 h-48 bg-emerald-500/10 rounded-full blur-3xl pointer-events-none" />
        <div className="absolute -bottom-24 -left-24 w-48 h-48 bg-teal-500/10 rounded-full blur-3xl pointer-events-none" />

        <div className="text-center mb-6">
          <div className="inline-flex items-center justify-center w-14 h-14 rounded-2xl bg-gradient-to-tr from-emerald-600 to-teal-500 text-white shadow-lg shadow-emerald-900/30 mb-4 ring-4 ring-emerald-500/20">
            <Sparkles className="w-7 h-7 text-white" />
          </div>
          <h2 className="text-xl sm:text-2xl font-black text-white tracking-tight">
            Front Panel Customizer
          </h2>
          <p className="text-xs text-neutral-400 mt-1.5">
            Log in to customize storefront design, homepage banners, and product page details
          </p>
        </div>

        {error && (
          <div className="mb-4 p-3 rounded-xl bg-rose-950/60 border border-rose-800/60 text-xs text-rose-300 flex items-center gap-2 animate-in fade-in">
            <span>⚠️</span>
            <span>{error}</span>
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-4 text-xs">
          <div>
            <label className="block text-neutral-300 font-semibold mb-1.5">Username</label>
            <div className="relative">
              <User className="w-4 h-4 text-neutral-500 absolute left-3.5 top-1/2 -translate-y-1/2" />
              <input
                type="text"
                required
                value={username}
                onChange={(e) => setUsername(e.target.value)}
                placeholder="Enter username"
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

        <div className="mt-6 pt-4 border-t border-neutral-800/80 flex items-center justify-between text-xs">
          <button
            type="button"
            onClick={onCancel}
            className="text-neutral-400 hover:text-white flex items-center gap-1.5 transition-colors cursor-pointer"
          >
            <ArrowLeft className="w-3.5 h-3.5" />
            <span>Back to Store</span>
          </button>

          <span className="text-[11px] text-neutral-600 font-mono">v1.0.0 Native</span>
        </div>
      </div>
    </div>
  );
};
