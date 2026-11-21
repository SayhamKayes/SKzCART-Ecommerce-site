import { useState, useEffect, useCallback } from "react";
import {
  ShieldCheck,
  AlertCircle,
  CheckCircle2,
  RefreshCw,
  KeyRound,
  LogOut,
  CreditCard,
  Facebook,
  X,
  Lock,
  Sparkles,
  ExternalLink,
  BookOpen,
} from "lucide-react";
import { apiClient } from "../../services/api";

const BILLING_BADGE_STYLES = {
  HEALTHY: "bg-emerald-50 text-emerald-800 border-emerald-200",
  WARNING: "bg-amber-50 text-amber-800 border-amber-200",
  PAYMENT_DUE: "bg-rose-50 text-rose-800 border-rose-300",
  BLOCKED: "bg-rose-100 text-rose-900 border-rose-300",
  PERMISSION_MISSING: "bg-amber-50 text-amber-900 border-amber-300",
  UNVERIFIED: "bg-neutral-100 text-neutral-600 border-neutral-200",
};

const MetaConnectionBar = ({
  connection,
  shopName = "Store",
  hasServerOAuthApp = false,
  showSetupGuide = false,
  onToggleSetupGuide,
  onConnectionUpdated,
}) => {
  // Connect Modal (OAuth App Config OR Direct System User Token)
  const [isConnectModalOpen, setIsConnectModalOpen] = useState(false);
  const [connectMode, setConnectMode] = useState("oauth"); // 'oauth' | 'token'
  const [oauthAppId, setOauthAppId] = useState("");
  const [oauthAppSecret, setOauthAppSecret] = useState("");
  const [systemToken, setSystemToken] = useState("");
  const [manualAdAccountId, setManualAdAccountId] = useState("");
  const [manualPageId, setManualPageId] = useState("");
  const [sandboxToggle, setSandboxToggle] = useState(false);

  const [isWorking, setIsWorking] = useState(false);
  const [statusMsg, setStatusMsg] = useState("");
  const [errorMsg, setErrorMsg] = useState("");

  const activeStoreName = shopName || "Store";

  const handleOAuthCodeExchange = useCallback(
    async (code, state) => {
      setIsWorking(true);
      setErrorMsg("");
      setStatusMsg("Exchanging Facebook OAuth authorization & discovering Pages/Ad Accounts...");
      try {
        let pendingAppId = oauthAppId.trim();
        let pendingAppSecret = oauthAppSecret.trim();
        try {
          const savedRaw = sessionStorage.getItem("amardokan_pending_meta_oauth_app");
          if (savedRaw) {
            const saved = JSON.parse(savedRaw);
            if (!pendingAppId && saved?.appId) pendingAppId = String(saved.appId).trim();
            if (!pendingAppSecret && saved?.appSecret) pendingAppSecret = String(saved.appSecret).trim();
            sessionStorage.removeItem("amardokan_pending_meta_oauth_app");
          }
        } catch {}

        const redirectUri = `${window.location.origin}/admin?tab=adCampaigns`;
        const res = await apiClient.exchangeMetaOAuthCode({
          code,
          state,
          redirectUri,
          appId: pendingAppId || undefined,
          appSecret: pendingAppSecret || undefined,
        });
        if (res && res.success) {
          setStatusMsg("Facebook account connected securely! Choose your Ad Account & Page below.");
          setIsConnectModalOpen(false);
          onConnectionUpdated?.(res.connection);
        } else {
          setErrorMsg(res?.message || "Failed to complete Facebook OAuth login.");
          setStatusMsg("");
        }
      } catch (err) {
        setErrorMsg(err.message || "OAuth exchange error.");
        setStatusMsg("");
      } finally {
        setIsWorking(false);
      }
    },
    [oauthAppId, oauthAppSecret, onConnectionUpdated]
  );

  // Handle Facebook OAuth redirect (?code=...&state=...) AND popup postMessage
  useEffect(() => {
    if (typeof window === "undefined") return;

    const params = new URLSearchParams(window.location.search);
    const code = params.get("code");
    const state = params.get("state");
    if (code && state && (!window.opener || window.opener === window)) {
      window.history.replaceState({}, document.title, "/admin");
      handleOAuthCodeExchange(code, state);
    }

    const onMessage = (ev) => {
      if (ev.origin !== window.location.origin) return;
      if (ev.data && ev.data.type === "META_OAUTH_CODE" && ev.data.code) {
        handleOAuthCodeExchange(ev.data.code, ev.data.state || "");
      }
    };
    window.addEventListener("message", onMessage);
    return () => window.removeEventListener("message", onMessage);
  }, [handleOAuthCodeExchange]);

  const handleLaunchFacebookOAuth = async () => {
    setIsWorking(true);
    setErrorMsg("");
    setStatusMsg("");
    try {
      const redirectUri = `${window.location.origin}/admin?tab=adCampaigns`;
      const res = await apiClient.getMetaOAuthUrl({
        redirectUri,
        appId: oauthAppId.trim() || undefined,
      });
      if (res && res.success && res.authUrl) {
        try {
          if (oauthAppId.trim() || oauthAppSecret.trim()) {
            sessionStorage.setItem(
              "amardokan_pending_meta_oauth_app",
              JSON.stringify({ appId: oauthAppId.trim(), appSecret: oauthAppSecret.trim() })
            );
          }
        } catch {}
        const popup = window.open(
          res.authUrl,
          "MetaOAuthConnect",
          "width=640,height=740,menubar=no,toolbar=no,status=no"
        );
        if (!popup) {
          window.location.href = res.authUrl;
        }
      } else {
        setErrorMsg(
          res?.message ||
            "Configure META_APP_ID on backend or enter your Meta App ID below, or connect using System User Token."
        );
      }
    } finally {
      setIsWorking(false);
    }
  };

  const handleConnectToken = async (e) => {
    e.preventDefault();
    if (!systemToken.trim()) return;
    setIsWorking(true);
    setErrorMsg("");
    setStatusMsg("");
    try {
      const res = await apiClient.connectMetaToken({
        accessToken: systemToken.trim(),
        appId: oauthAppId.trim() || undefined,
        adAccountId: manualAdAccountId.trim() || undefined,
        pageId: manualPageId.trim() || undefined,
        isSandboxMode: sandboxToggle,
        tokenType: "SYSTEM_USER",
      });
      if (res && res.success) {
        setSystemToken("");
        setIsConnectModalOpen(false);
        setStatusMsg("Meta access token encrypted with Fernet & bound to this store tenant!");
        onConnectionUpdated?.(res.connection);
      } else {
        setErrorMsg(res?.message || "Meta rejected the access token.");
      }
    } finally {
      setIsWorking(false);
    }
  };

  const handleBindAssets = async (updates) => {
    setIsWorking(true);
    setErrorMsg("");
    try {
      const res = await apiClient.selectMetaAssets(updates);
      if (res && res.success) {
        setStatusMsg("Meta Ad Account / Page / Pixel selection saved & Billing Guard refreshed.");
        onConnectionUpdated?.(res.connection);
      } else {
        setErrorMsg(res?.message || "Failed to update Meta assets.");
      }
    } finally {
      setIsWorking(false);
    }
  };

  const handleRefreshBillingHealth = async () => {
    setIsWorking(true);
    setErrorMsg("");
    try {
      const res = await apiClient.getMetaAccountHealth();
      if (res && res.connection) {
        onConnectionUpdated?.(res.connection);
      }
      if (res && res.success) {
        setStatusMsg("Meta Billing Guard & Ad Account health verified live.");
      } else {
        setErrorMsg(res?.message || "Billing health check returned a warning.");
      }
    } finally {
      setIsWorking(false);
    }
  };

  const handleDisconnect = async () => {
    setIsWorking(true);
    setErrorMsg("");
    try {
      const res = await apiClient.disconnectMetaConnection();
      if (res && res.success) {
        setStatusMsg("Meta account disconnected & encrypted tokens wiped for this tenant.");
        onConnectionUpdated?.(res.connection);
      }
    } finally {
      setIsWorking(false);
    }
  };

  const isConnected = Boolean(connection?.isConnected);
  const billingStatus = connection?.billingStatus || "UNVERIFIED";
  const billingBadgeCls = BILLING_BADGE_STYLES[billingStatus] || BILLING_BADGE_STYLES.UNVERIFIED;
  const adAccounts = Array.isArray(connection?.availableAdAccounts) ? connection.availableAdAccounts : [];
  const pages = Array.isArray(connection?.availablePages) ? connection.availablePages : [];
  const pixels = Array.isArray(connection?.availablePixels) ? connection.availablePixels : [];
  const currency = connection?.adAccountCurrency || "BDT";

  return (
    <div className="bg-white rounded-3xl p-5 border border-neutral-200 shadow-xs space-y-4">
      {/* Row 1: Single-Store Facebook Connection & Primary Actions */}
      <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-3 pb-3.5 border-b border-neutral-100">
        <div className="flex flex-wrap items-center gap-2.5">
          <div className="w-9 h-9 rounded-2xl bg-blue-600 text-white flex items-center justify-center shadow-xs shrink-0">
            <Facebook className="w-4.5 h-4.5" />
          </div>
          <div>
            <div className="flex items-center gap-2 flex-wrap">
              <span className="text-sm font-black text-neutral-900">
                Meta Connection & Billing Guard
              </span>
              {isConnected ? (
                <span className="inline-flex items-center gap-1 text-[10px] font-bold px-2 py-0.5 rounded-full bg-emerald-50 text-emerald-700 border border-emerald-200">
                  <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
                  Connected: {connection.metaUserName || connection.tokenMasked}
                </span>
              ) : (
                <span className="inline-flex items-center gap-1 text-[10px] font-bold px-2 py-0.5 rounded-full bg-amber-50 text-amber-800 border border-amber-200">
                  Not Connected
                </span>
              )}
            </div>
            <p className="text-[11px] text-neutral-500 mt-0.5">
              Connect your Facebook Page, Ad Account & Pixel with encrypted server-side token storage to run live Boost & Sales campaigns.
            </p>
          </div>
        </div>

        {/* Connect Actions */}
        <div className="flex flex-wrap items-center gap-2">
          {typeof onToggleSetupGuide === "function" && (
            <button
              type="button"
              onClick={onToggleSetupGuide}
              className={`inline-flex items-center gap-1.5 px-3 py-2 rounded-xl font-bold text-xs border transition-all cursor-pointer ${
                showSetupGuide
                  ? "bg-amber-500 hover:bg-amber-600 text-white border-amber-600 shadow-xs"
                  : "bg-amber-50 hover:bg-amber-100 text-amber-900 border-amber-300"
              }`}
              title={showSetupGuide ? "Hide Setup Guide" : "Open Meta Ads & Commerce Setup Guide"}
            >
              <BookOpen className="w-3.5 h-3.5" />
              <span>{showSetupGuide ? "Hide Guide" : "Setup Guide"}</span>
            </button>
          )}
          {!isConnected ? (
            <button
              type="button"
              onClick={() => setIsConnectModalOpen(true)}
              className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-blue-600 hover:bg-blue-700 text-white font-bold text-xs shadow-xs transition-colors cursor-pointer"
            >
              <Facebook className="w-3.5 h-3.5" />
              <span>Connect Facebook / OAuth</span>
            </button>
          ) : (
            <>
              <button
                type="button"
                onClick={handleRefreshBillingHealth}
                disabled={isWorking}
                className="inline-flex items-center gap-1 px-2.5 py-2 rounded-xl bg-emerald-50 hover:bg-emerald-100 text-emerald-800 border border-emerald-200 font-bold text-xs transition-colors cursor-pointer disabled:opacity-50"
              >
                <RefreshCw className={`w-3.5 h-3.5 ${isWorking ? "animate-spin" : ""}`} />
                <span>Billing Guard</span>
              </button>
              <button
                type="button"
                onClick={() => setIsConnectModalOpen(true)}
                className="inline-flex items-center gap-1 px-2.5 py-2 rounded-xl bg-neutral-100 hover:bg-neutral-200 text-neutral-700 font-bold text-xs transition-colors cursor-pointer"
              >
                <KeyRound className="w-3.5 h-3.5" />
                <span>Re-Auth</span>
              </button>
              <button
                type="button"
                onClick={handleDisconnect}
                disabled={isWorking}
                className="inline-flex items-center gap-1 px-2.5 py-2 rounded-xl bg-rose-50 hover:bg-rose-100 text-rose-700 border border-rose-200 font-bold text-xs transition-colors cursor-pointer"
              >
                <LogOut className="w-3.5 h-3.5" />
                <span>Disconnect</span>
              </button>
            </>
          )}
        </div>
      </div>

      {/* Status / Error Alerts */}
      {statusMsg && (
        <div className="p-2.5 rounded-xl bg-emerald-50 border border-emerald-200 text-emerald-800 text-xs font-semibold flex items-center justify-between gap-2">
          <span className="flex items-center gap-1.5">
            <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
            <span>{statusMsg}</span>
          </span>
          <button onClick={() => setStatusMsg("")} className="text-emerald-700 hover:text-emerald-900">
            <X className="w-3.5 h-3.5" />
          </button>
        </div>
      )}

      {errorMsg && (
        <div className="p-2.5 rounded-xl bg-rose-50 border border-rose-200 text-rose-800 text-xs font-semibold flex items-center justify-between gap-2">
          <span className="flex items-center gap-1.5">
            <AlertCircle className="w-4 h-4 text-rose-600 shrink-0" />
            <span>{errorMsg}</span>
          </span>
          <button onClick={() => setErrorMsg("")} className="text-rose-700 hover:text-rose-900">
            <X className="w-3.5 h-3.5" />
          </button>
        </div>
      )}

      {/* Row 2: Connected Asset Pickers & Live Billing Guard Card */}
      {isConnected ? (
        <div className="grid grid-cols-1 xl:grid-cols-12 gap-3 items-stretch">
          {/* Bound Meta Assets (7 cols) */}
          <div className="xl:col-span-7 grid grid-cols-1 sm:grid-cols-3 gap-2.5 bg-neutral-50/70 p-3 rounded-2xl border border-neutral-200/80 text-xs">
            <div>
              <label className="text-[10px] font-bold uppercase text-neutral-500 block mb-1">
                Ad Account ({currency})
              </label>
              <select
                value={connection.adAccountId || ""}
                onChange={(e) => handleBindAssets({ adAccountId: e.target.value })}
                disabled={isWorking}
                className="w-full px-2.5 py-1.5 rounded-xl border border-neutral-200 bg-white font-semibold text-neutral-800 focus:outline-none focus:border-blue-600 text-xs"
              >
                {adAccounts.length === 0 ? (
                  <option value={connection.adAccountId || ""}>
                    {connection.adAccountId || "No Ad Account found"}
                  </option>
                ) : (
                  adAccounts.map((acc) => (
                    <option key={acc.id} value={acc.id}>
                      {acc.name} ({acc.id} • {acc.statusLabel})
                    </option>
                  ))
                )}
              </select>
            </div>

            <div>
              <label className="text-[10px] font-bold uppercase text-neutral-500 block mb-1">
                Facebook Page {connection.instagramActorId ? "+ IG" : ""}
              </label>
              <select
                value={connection.pageId || ""}
                onChange={(e) => handleBindAssets({ pageId: e.target.value })}
                disabled={isWorking}
                className="w-full px-2.5 py-1.5 rounded-xl border border-neutral-200 bg-white font-semibold text-neutral-800 focus:outline-none focus:border-blue-600 text-xs"
              >
                {pages.length === 0 ? (
                  <option value={connection.pageId || ""}>
                    {connection.pageName || connection.pageId || "No Page linked"}
                  </option>
                ) : (
                  pages.map((pg) => (
                    <option key={pg.id} value={pg.id}>
                      {pg.name} {pg.instagramUsername ? `(@${pg.instagramUsername})` : ""}
                    </option>
                  ))
                )}
              </select>
            </div>

            <div>
              <label className="text-[10px] font-bold uppercase text-neutral-500 block mb-1">
                Conversion Pixel & Mode
              </label>
              <div className="flex items-center gap-1.5">
                <select
                  value={connection.pixelId || ""}
                  onChange={(e) => handleBindAssets({ pixelId: e.target.value })}
                  disabled={isWorking}
                  className="w-full px-2 py-1.5 rounded-xl border border-neutral-200 bg-white font-semibold text-neutral-800 focus:outline-none focus:border-blue-600 text-xs"
                >
                  <option value="">No Pixel (Traffic/Boost)</option>
                  {pixels.map((px) => (
                    <option key={px.id} value={px.id}>
                      {px.name} ({px.id})
                    </option>
                  ))}
                  {connection.pixelId && !pixels.some((p) => p.id === connection.pixelId) && (
                    <option value={connection.pixelId}>Pixel: {connection.pixelId}</option>
                  )}
                </select>
                <button
                  type="button"
                  onClick={() => handleBindAssets({ isSandboxMode: !connection.isSandboxMode })}
                  title="Toggle Sandbox vs Live billing protection"
                  className={`px-2 py-1.5 rounded-xl text-[10px] font-extrabold border shrink-0 cursor-pointer ${
                    connection.isSandboxMode
                      ? "bg-purple-50 text-purple-800 border-purple-200"
                      : "bg-emerald-50 text-emerald-800 border-emerald-200"
                  }`}
                >
                  {connection.isSandboxMode ? "SANDBOX" : "LIVE"}
                </button>
              </div>
            </div>
          </div>

          {/* Billing Guard & Delivery Diagnostics (5 cols) */}
          <div className={`xl:col-span-5 p-3 rounded-2xl border text-xs flex flex-col justify-between space-y-1.5 ${billingBadgeCls}`}>
            <div className="flex items-center justify-between gap-2">
              <div className="flex items-center gap-1.5 font-extrabold">
                <CreditCard className="w-3.5 h-3.5 shrink-0" />
                <span>Billing Guard: {billingStatus}</span>
                <span className="text-[10px] font-mono opacity-80">
                  ({connection.adAccountStatus || "UNKNOWN"})
                </span>
              </div>
              <span className="inline-flex items-center gap-1 text-[10px] font-bold">
                <Lock className="w-3 h-3" />
                <span>Fernet Encrypted ({connection.tokenMasked})</span>
              </span>
            </div>

            <div className="flex flex-wrap items-center gap-x-3 gap-y-1 text-[11px] opacity-90">
              <span>Method: <strong>{connection.fundingSourceSummary || "Meta Billing"}</strong></span>
              <span>Spent: <strong>{Number(connection.amountSpent || 0).toLocaleString()} {currency}</strong></span>
              {connection.spendCap > 0 && (
                <span>Cap: <strong>{Number(connection.spendCap).toLocaleString()} {currency}</strong></span>
              )}
            </div>

            {connection.billingAlertMessage ? (
              <p className="text-[11px] font-semibold leading-snug">
                ⚠️ {connection.billingAlertMessage}
              </p>
            ) : (
              <p className="text-[11px] opacity-85">
                ✓ Account & permissions verified for live ad creation, boosting & status sync. Note: Meta Automated Ad Review still validates policy & billing on Facebook.
              </p>
            )}
          </div>
        </div>
      ) : (
        <div className="bg-gradient-to-r from-blue-50/80 via-indigo-50/50 to-white rounded-2xl p-4 border border-blue-200/80 flex flex-col md:flex-row md:items-center justify-between gap-3 text-xs">
          <div className="space-y-1">
            <div className="font-bold text-blue-950 flex items-center gap-1.5">
              <ShieldCheck className="w-4 h-4 text-blue-600" />
              <span>Connect {activeStoreName}'s Facebook Page & Ad Account to Boost Live</span>
            </div>
            <p className="text-[11px] text-blue-900/80 leading-relaxed">
              Sign in with Facebook OAuth or paste a Meta Business System User Token (`ads_management`, `ads_read`, `pages_read_engagement`).
              All tokens are encrypted server-side before saving.
            </p>
          </div>
          <button
            type="button"
            onClick={() => setIsConnectModalOpen(true)}
            className="inline-flex items-center gap-1.5 px-4 py-2 rounded-xl bg-blue-600 hover:bg-blue-700 text-white font-bold text-xs shadow-xs shrink-0 cursor-pointer"
          >
            <Sparkles className="w-3.5 h-3.5" />
            <span>Setup Facebook Connection</span>
          </button>
        </div>
      )}

      {/* Modal: Connect Facebook OAuth OR System User Token */}
      {isConnectModalOpen && (
        <div className="fixed inset-0 z-50 bg-black/50 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl max-w-lg w-full p-6 border border-neutral-200 shadow-2xl space-y-4 text-xs">
            <div className="flex items-center justify-between border-b border-neutral-100 pb-3">
              <div className="flex items-center gap-2">
                <Facebook className="w-4.5 h-4.5 text-blue-600" />
                <div>
                  <h3 className="font-black text-sm text-neutral-900">
                    Connect Facebook Ads — {activeStoreName}
                  </h3>
                  <p className="text-[11px] text-neutral-500">
                    Authorize Page, Ad Account & Pixel permissions
                  </p>
                </div>
              </div>
              <button onClick={() => setIsConnectModalOpen(false)} className="p-1 text-neutral-400 hover:text-neutral-700">
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="grid grid-cols-2 gap-2 p-1 bg-neutral-100 rounded-xl">
              <button
                type="button"
                onClick={() => setConnectMode("oauth")}
                className={`py-2 rounded-lg font-bold transition-all cursor-pointer ${
                  connectMode === "oauth" ? "bg-white text-blue-700 shadow-xs" : "text-neutral-600"
                }`}
              >
                Facebook OAuth Login
              </button>
              <button
                type="button"
                onClick={() => setConnectMode("token")}
                className={`py-2 rounded-lg font-bold transition-all cursor-pointer ${
                  connectMode === "token" ? "bg-white text-emerald-700 shadow-xs" : "text-neutral-600"
                }`}
              >
                System User Token
              </button>
            </div>

            {connectMode === "oauth" ? (
              <div className="space-y-3">
                <div className="p-3 rounded-xl bg-blue-50 border border-blue-200 text-blue-900 text-[11px] leading-relaxed">
                  <strong>SaaS Seller Login:</strong> Seller clicks below to log into Facebook, authorize
                  <code className="mx-1 bg-white px-1 rounded">ads_management</code>,
                  <code className="mx-1 bg-white px-1 rounded">ads_read</code>, and
                  <code className="mx-1 bg-white px-1 rounded">pages_read_engagement</code>, and auto-bind their Facebook Page & Ad Account.
                </div>

                {!hasServerOAuthApp && (
                  <div className="grid grid-cols-2 gap-2.5">
                    <div>
                      <label className="font-bold text-neutral-700 block mb-1">Meta App ID</label>
                      <input
                        type="text"
                        value={oauthAppId}
                        onChange={(e) => setOauthAppId(e.target.value)}
                        placeholder="e.g. 123456789012345"
                        className="w-full px-3 py-2 rounded-xl border border-neutral-200 font-mono focus:outline-none focus:border-blue-600"
                      />
                    </div>
                    <div>
                      <label className="font-bold text-neutral-700 block mb-1">Meta App Secret</label>
                      <input
                        type="password"
                        value={oauthAppSecret}
                        onChange={(e) => setOauthAppSecret(e.target.value)}
                        placeholder="Optional if set on backend .env"
                        className="w-full px-3 py-2 rounded-xl border border-neutral-200 font-mono focus:outline-none focus:border-blue-600"
                      />
                    </div>
                  </div>
                )}

                <div className="text-[11px] text-neutral-500 bg-neutral-50 p-2.5 rounded-xl border border-neutral-200">
                  Valid OAuth Redirect URI to whitelist in Meta App Settings:{" "}
                  <code className="text-neutral-800 break-all">
                    {typeof window !== "undefined" ? `${window.location.origin}/admin?tab=adCampaigns` : "/admin?tab=adCampaigns"}
                  </code>
                </div>

                <div className="flex justify-end gap-2 pt-2 border-t border-neutral-100">
                  <button
                    type="button"
                    onClick={() => setIsConnectModalOpen(false)}
                    className="px-4 py-2 rounded-xl border border-neutral-200 text-neutral-700 font-semibold"
                  >
                    Cancel
                  </button>
                  <button
                    type="button"
                    onClick={handleLaunchFacebookOAuth}
                    disabled={isWorking}
                    className="inline-flex items-center gap-1.5 px-4 py-2 rounded-xl bg-blue-600 hover:bg-blue-700 text-white font-bold shadow-xs cursor-pointer disabled:opacity-50"
                  >
                    <Facebook className="w-3.5 h-3.5" />
                    <span>{isWorking ? "Opening Facebook..." : "Continue with Facebook"}</span>
                    <ExternalLink className="w-3 h-3" />
                  </button>
                </div>
              </div>
            ) : (
              <form onSubmit={handleConnectToken} className="space-y-3">
                <div className="p-3 rounded-xl bg-emerald-50 border border-emerald-200 text-emerald-900 text-[11px] leading-relaxed">
                  Paste a <strong>Business System User Token</strong> (from Meta Business Settings → System Users) with
                  <code className="mx-1 bg-white px-1 rounded">ads_management</code> &
                  <code className="mx-1 bg-white px-1 rounded">pages_read_engagement</code>. Stored encrypted via Fernet.
                </div>

                <div>
                  <label className="font-bold text-neutral-700 block mb-1">Meta Access Token *</label>
                  <textarea
                    rows={3}
                    required
                    value={systemToken}
                    onChange={(e) => setSystemToken(e.target.value)}
                    placeholder="EAAG..."
                    className="w-full px-3 py-2 rounded-xl border border-neutral-200 font-mono text-[11px] focus:outline-none focus:border-emerald-600"
                  />
                </div>

                <div className="grid grid-cols-2 gap-2.5">
                  <div>
                    <label className="font-bold text-neutral-700 block mb-1">Override Ad Account ID</label>
                    <input
                      type="text"
                      value={manualAdAccountId}
                      onChange={(e) => setManualAdAccountId(e.target.value)}
                      placeholder="Optional (act_123456)"
                      className="w-full px-3 py-2 rounded-xl border border-neutral-200 font-mono focus:outline-none focus:border-emerald-600"
                    />
                  </div>
                  <div>
                    <label className="font-bold text-neutral-700 block mb-1">Override Page ID</label>
                    <input
                      type="text"
                      value={manualPageId}
                      onChange={(e) => setManualPageId(e.target.value)}
                      placeholder="Optional Page ID"
                      className="w-full px-3 py-2 rounded-xl border border-neutral-200 font-mono focus:outline-none focus:border-emerald-600"
                    />
                  </div>
                </div>

                <label className="flex items-center gap-2 text-neutral-700 font-semibold cursor-pointer">
                  <input
                    type="checkbox"
                    checked={sandboxToggle}
                    onChange={(e) => setSandboxToggle(e.target.checked)}
                    className="rounded border-neutral-300 text-purple-600"
                  />
                  <span>This is a Meta Sandbox Test Ad Account (no live billing charges)</span>
                </label>

                <div className="flex justify-end gap-2 pt-2 border-t border-neutral-100">
                  <button
                    type="button"
                    onClick={() => setIsConnectModalOpen(false)}
                    className="px-4 py-2 rounded-xl border border-neutral-200 text-neutral-700 font-semibold"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    disabled={isWorking}
                    className="px-4 py-2 rounded-xl bg-emerald-700 hover:bg-emerald-800 text-white font-bold shadow-xs cursor-pointer disabled:opacity-50"
                  >
                    {isWorking ? "Verifying & Encrypting..." : "Verify & Connect Token"}
                  </button>
                </div>
              </form>
            )}
          </div>
        </div>
      )}
    </div>
  );
};

export default MetaConnectionBar;

