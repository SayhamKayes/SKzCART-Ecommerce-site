import { useState, useEffect, useCallback } from "react";
import {
  Copy,
  Check,
  Layers,
  Database,
  Cpu,
  ShieldCheck,
  RefreshCw,
  Truck,
  CreditCard,
  Webhook,
  CheckCircle2,
  AlertTriangle,
  Info
} from "lucide-react";
import { apiClient } from "../../services/api";
import { realtimeService } from "../../services/realtime";

const AdminBlueprint = () => {
  const [activeTab, setActiveTab] = useState("integrations");
  const [copiedKey, setCopiedKey] = useState(null);
  const [blueprint, setBlueprint] = useState(null);
  const [loading, setLoading] = useState(true);
  const [errorMsg, setErrorMsg] = useState("");

  const fetchBlueprint = useCallback(async () => {
    setLoading(true);
    setErrorMsg("");
    try {
      const res = await apiClient.getSystemBlueprint();
      if (res?.success && res.blueprint) {
        setBlueprint(res.blueprint);
      } else {
        setErrorMsg(res?.message || "Failed to load live system blueprint.");
      }
    } catch (err) {
      setErrorMsg(err?.message || "Unable to connect to system blueprint endpoint.");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchBlueprint();
    const unsub = realtimeService.subscribe((event) => {
      if (
        event?.type === "SETTINGS_UPDATED" ||
        event?.type === "COURIER_UPDATED" ||
        event?.type === "PAYMENT_UPDATED" ||
        event?.type === "ORDER_CREATED" ||
        event?.type === "ORDER_UPDATED" ||
        event?.type === "PRODUCT_UPDATED"
      ) {
        fetchBlueprint();
      }
    });
    return () => {
      if (typeof unsub === "function") unsub();
    };
  }, [fetchBlueprint]);

  const copyValue = (val, key) => {
    navigator.clipboard.writeText(String(val || ""));
    setCopiedKey(key);
    setTimeout(() => setCopiedKey(null), 2000);
  };

  const runtime = blueprint?.runtime || {};
  const counts = blueprint?.counts || {};
  const couriers = Array.isArray(blueprint?.couriers) ? blueprint.couriers : [];
  const payments = Array.isArray(blueprint?.payments) ? blueprint.payments : [];
  const security = blueprint?.security || {};
  const callbacks = blueprint?.callbacks || {};
  const envChecks = Array.isArray(blueprint?.envChecks) ? blueprint.envChecks : [];
  const endpoints = blueprint?.endpoints || {};

  const activeCouriers = couriers.filter((c) => c.isActive);
  const activePayments = payments.filter((p) => p.isActive);
  const totalRecords = Object.values(counts).reduce((sum, n) => sum + (Number(n) || 0), 0);

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="bg-white rounded-3xl p-6 border border-neutral-200 shadow-xs flex flex-wrap items-center justify-between gap-4">
        <div>
          <span className="text-xs font-bold uppercase tracking-wider text-emerald-700 bg-emerald-50 px-2.5 py-1 rounded-full">
            {"Live System & Runtime Blueprint"}
          </span>
          <h1 className="text-2xl font-black text-neutral-900 mt-2">
            {blueprint?.shopName ? `${blueprint.shopName} Architecture Diagnostics` : "System Architecture Diagnostics"}
          </h1>
          <p className="text-xs text-neutral-500">
            {"Real-time backend runtime telemetry, active courier/gateway webhooks, database counts, and production security checks."}
          </p>
        </div>

        <button
          type="button"
          onClick={fetchBlueprint}
          disabled={loading}
          className="px-4 py-2.5 rounded-xl bg-neutral-900 hover:bg-neutral-800 text-white text-xs font-bold flex items-center gap-2 transition-colors cursor-pointer disabled:opacity-50"
        >
          <RefreshCw className={`w-3.5 h-3.5 ${loading ? "animate-spin" : ""}`} />
          <span>{loading ? "Refreshing..." : "Refresh Live Telemetry"}</span>
        </button>
      </div>

      {errorMsg && (
        <div className="p-4 rounded-2xl bg-red-50 border border-red-200 text-xs font-semibold text-red-700">
          {errorMsg}
        </div>
      )}

      {/* Live Stack Pillars */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 text-xs">
        <div className="p-4 rounded-2xl bg-white border border-neutral-200 shadow-xs flex items-center gap-3">
          <div className="p-2.5 rounded-xl bg-emerald-50 text-emerald-600">
            <Layers className="w-5 h-5" />
          </div>
          <div>
            <span className="font-bold text-neutral-900 block">
              {`Django ${runtime.djangoVersion || "-"} (DRF)`}
            </span>
            <span className="text-[11px] text-neutral-500">
              {`Python ${runtime.pythonVersion || "-"} • ${runtime.debug ? "DEBUG=True" : "Production Mode"}`}
            </span>
          </div>
        </div>

        <div className="p-4 rounded-2xl bg-white border border-neutral-200 shadow-xs flex items-center gap-3">
          <div className="p-2.5 rounded-xl bg-blue-50 text-blue-600">
            <Database className="w-5 h-5" />
          </div>
          <div>
            <span className="font-bold text-neutral-900 block uppercase">
              {`${runtime.dbEngine || "Database"} Engine`}
            </span>
            <span className="text-[11px] text-neutral-500">
              {`${totalRecords} Total DB Rows • ${counts.orders ?? 0} Orders`}
            </span>
          </div>
        </div>

        <div className="p-4 rounded-2xl bg-white border border-neutral-200 shadow-xs flex items-center gap-3">
          <div className="p-2.5 rounded-xl bg-indigo-50 text-indigo-600">
            <Truck className="w-5 h-5" />
          </div>
          <div>
            <span className="font-bold text-neutral-900 block">
              {`${activeCouriers.length} Active Courier(s)`}
            </span>
            <span className="text-[11px] text-neutral-500 truncate max-w-[180px]">
              {activeCouriers.length > 0 ? activeCouriers.map((c) => c.name.replace(" Courier", "")).join(", ") : "None enabled"}
            </span>
          </div>
        </div>

        <div className="p-4 rounded-2xl bg-white border border-neutral-200 shadow-xs flex items-center gap-3">
          <div className="p-2.5 rounded-xl bg-amber-50 text-amber-600">
            <ShieldCheck className="w-5 h-5" />
          </div>
          <div>
            <span className="font-bold text-neutral-900 block">
              {`${activePayments.length} Active Gateway(s)`}
            </span>
            <span className="text-[11px] text-neutral-500">
              {`2FA: ${security.twoFactorEnabled ? "Enabled" : "Off"} • ${counts.staff ?? 0} Staff`}
            </span>
          </div>
        </div>
      </div>

      {/* Live Inspector Tabs */}
      <div className="bg-neutral-900 rounded-3xl overflow-hidden border border-neutral-800 shadow-xl">
        <div className="p-4 bg-neutral-950 border-b border-neutral-800 flex flex-wrap items-center justify-between gap-3 text-xs">
          <div className="flex flex-wrap items-center gap-2">
            <button
              type="button"
              onClick={() => setActiveTab("integrations")}
              className={`px-3 py-1.5 rounded-xl font-bold transition-all cursor-pointer ${
                activeTab === "integrations"
                  ? "bg-emerald-600 text-white"
                  : "text-neutral-400 hover:text-white hover:bg-neutral-800"
              }`}
            >
              Active Couriers, Gateways & Webhooks
            </button>

            <button
              type="button"
              onClick={() => setActiveTab("database")}
              className={`px-3 py-1.5 rounded-xl font-bold transition-all cursor-pointer ${
                activeTab === "database"
                  ? "bg-emerald-600 text-white"
                  : "text-neutral-400 hover:text-white hover:bg-neutral-800"
              }`}
            >
              Live Database Inventory
            </button>

            <button
              type="button"
              onClick={() => setActiveTab("security")}
              className={`px-3 py-1.5 rounded-xl font-bold transition-all cursor-pointer ${
                activeTab === "security"
                  ? "bg-emerald-600 text-white"
                  : "text-neutral-400 hover:text-white hover:bg-neutral-800"
              }`}
            >
              Environment & Security Audit
            </button>

            <button
              type="button"
              onClick={() => setActiveTab("endpoints")}
              className={`px-3 py-1.5 rounded-xl font-bold transition-all cursor-pointer ${
                activeTab === "endpoints"
                  ? "bg-emerald-600 text-white"
                  : "text-neutral-400 hover:text-white hover:bg-neutral-800"
              }`}
            >
              Live API Snapshot (JSON)
            </button>
          </div>

          <button
            type="button"
            onClick={() => copyValue(JSON.stringify(blueprint || {}, null, 2), "json_snapshot")}
            className="py-1.5 px-3 rounded-lg bg-neutral-800 hover:bg-neutral-700 text-neutral-300 hover:text-white font-semibold flex items-center gap-1.5 transition-colors cursor-pointer"
          >
            {copiedKey === "json_snapshot" ? (
              <>
                <Check className="w-3.5 h-3.5 text-emerald-400" />
                <span>{"Copied"}</span>
              </>
            ) : (
              <>
                <Copy className="w-3.5 h-3.5" />
                <span>{"Copy Live JSON"}</span>
              </>
            )}
          </button>
        </div>

        <div className="p-6 text-xs text-neutral-200">
          {activeTab === "integrations" && (
            <div className="space-y-5">
              {/* Live Callback URLs */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="p-4 rounded-2xl bg-neutral-800/70 border border-neutral-700 space-y-2">
                  <div className="flex items-center justify-between">
                    <span className="font-bold text-emerald-400 flex items-center gap-1.5">
                      <Webhook className="w-4 h-4" />
                      Unified Courier Webhook URL
                    </span>
                    <button
                      type="button"
                      onClick={() => copyValue(callbacks.unifiedCourierWebhook, "wh_unified")}
                      className="text-[11px] px-2 py-1 rounded bg-neutral-700 hover:bg-neutral-600 text-white cursor-pointer"
                    >
                      {copiedKey === "wh_unified" ? "Copied" : "Copy"}
                    </button>
                  </div>
                  <code className="block text-[11px] text-neutral-300 break-all font-mono">
                    {callbacks.unifiedCourierWebhook || "/api/v1/webhooks/couriers"}
                  </code>
                </div>

                <div className="p-4 rounded-2xl bg-neutral-800/70 border border-neutral-700 space-y-2">
                  <div className="flex items-center justify-between">
                    <span className="font-bold text-sky-400 flex items-center gap-1.5">
                      <CreditCard className="w-4 h-4" />
                      SSLCommerz IPN Callback URL
                    </span>
                    <button
                      type="button"
                      onClick={() => copyValue(callbacks.sslcommerzIpn, "ssl_ipn")}
                      className="text-[11px] px-2 py-1 rounded bg-neutral-700 hover:bg-neutral-600 text-white cursor-pointer"
                    >
                      {copiedKey === "ssl_ipn" ? "Copied" : "Copy"}
                    </button>
                  </div>
                  <code className="block text-[11px] text-neutral-300 break-all font-mono">
                    {callbacks.sslcommerzIpn || "/api/v1/payments/sslcommerz/ipn/"}
                  </code>
                </div>
              </div>

              {/* Couriers Live Table */}
              <div>
                <h3 className="text-[11px] font-bold uppercase tracking-wider text-neutral-400 mb-2">
                  Configured Couriers ({couriers.length})
                </h3>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                  {couriers.map((c) => (
                    <div key={c.id} className="p-3.5 rounded-xl bg-neutral-950 border border-neutral-800 flex items-center justify-between gap-3">
                      <div className="min-w-0">
                        <div className="flex items-center gap-2">
                          <span className="font-bold text-white">{c.name}</span>
                          <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold ${c.isActive ? "bg-emerald-500/20 text-emerald-300" : "bg-neutral-800 text-neutral-400"}`}>
                            {c.isActive ? "ACTIVE" : "DISABLED"}
                          </span>
                          <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold ${c.sandboxMode ? "bg-amber-500/20 text-amber-300" : "bg-blue-500/20 text-blue-300"}`}>
                            {c.sandboxMode ? "SANDBOX" : "LIVE API"}
                          </span>
                        </div>
                        <p className="text-[11px] text-neutral-400 mt-1 truncate font-mono">
                          {c.webhookUrl}
                        </p>
                      </div>
                      <button
                        type="button"
                        onClick={() => copyValue(c.webhookUrl, `wh_${c.id}`)}
                        className="px-2.5 py-1 rounded-lg bg-neutral-800 hover:bg-neutral-700 text-neutral-300 text-[11px] font-semibold shrink-0 cursor-pointer"
                      >
                        {copiedKey === `wh_${c.id}` ? "Copied" : "Copy"}
                      </button>
                    </div>
                  ))}
                </div>
              </div>

              {/* Payments Live Table */}
              <div>
                <h3 className="text-[11px] font-bold uppercase tracking-wider text-neutral-400 mb-2">
                  Configured Payment Gateways ({payments.length})
                </h3>
                <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-3">
                  {payments.map((p) => (
                    <div key={p.id} className="p-3.5 rounded-xl bg-neutral-950 border border-neutral-800 flex flex-col gap-1.5">
                      <div className="flex items-center justify-between gap-2">
                        <span className="font-bold text-white">{p.name}</span>
                        <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold ${p.isActive ? "bg-emerald-500/20 text-emerald-300" : "bg-neutral-800 text-neutral-400"}`}>
                          {p.isActive ? "ACTIVE" : "OFF"}
                        </span>
                      </div>
                      <div className="text-[11px] text-neutral-400 flex items-center justify-between">
                        <span>{p.type}</span>
                        <span>{p.hasMerchantConfig ? "Configured" : "Needs Setup"}</span>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          )}

          {activeTab === "database" && (
            <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-3">
              {Object.entries(counts).map(([key, val]) => (
                <div key={key} className="p-4 rounded-2xl bg-neutral-950 border border-neutral-800">
                  <span className="text-[11px] uppercase tracking-wider text-neutral-400 block">
                    {key}
                  </span>
                  <span className="text-2xl font-black text-emerald-400 mt-1 block">
                    {val}
                  </span>
                </div>
              ))}
            </div>
          )}

          {activeTab === "security" && (
            <div className="space-y-3">
              {envChecks.map((chk) => (
                <div key={chk.key} className="p-4 rounded-2xl bg-neutral-950 border border-neutral-800 flex items-start justify-between gap-4">
                  <div className="flex items-start gap-3">
                    {chk.status === "ok" ? (
                      <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0 mt-0.5" />
                    ) : chk.status === "warning" ? (
                      <AlertTriangle className="w-4 h-4 text-amber-400 shrink-0 mt-0.5" />
                    ) : (
                      <Info className="w-4 h-4 text-sky-400 shrink-0 mt-0.5" />
                    )}
                    <div>
                      <div className="font-bold text-white">{chk.label}</div>
                      <div className="text-[11px] text-neutral-400 mt-0.5">{chk.detail}</div>
                    </div>
                  </div>
                  <span className="font-mono text-[10px] px-2 py-0.5 rounded bg-neutral-800 text-neutral-300 shrink-0">
                    {chk.key}
                  </span>
                </div>
              ))}
            </div>
          )}

          {activeTab === "endpoints" && (
            <div className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-2.5">
                {Object.entries(endpoints).map(([name, route]) => (
                  <div key={name} className="p-3 rounded-xl bg-neutral-950 border border-neutral-800 flex items-center justify-between">
                    <span className="font-semibold text-neutral-300">{name}</span>
                    <code className="font-mono text-[11px] text-emerald-400">{route}</code>
                  </div>
                ))}
              </div>
              <pre className="p-4 rounded-2xl bg-neutral-950 border border-neutral-800 font-mono text-[11px] text-neutral-300 overflow-x-auto max-h-[340px] overflow-y-auto">
                {JSON.stringify(blueprint || {}, null, 2)}
              </pre>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export { AdminBlueprint };
