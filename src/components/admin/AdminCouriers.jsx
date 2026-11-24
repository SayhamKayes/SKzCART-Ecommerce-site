import React, { useState, useEffect } from "react";
import {
  Truck,
  ExternalLink,
  Globe,
  Send,
  Key,
  Check,
  Copy,
  Settings,
  Wallet,
  X,
  ShieldCheck,
  RefreshCw,
  ChevronRight,
  Sparkles,
  Layers
} from "lucide-react";
import { formatBDT } from "../../utils/bangladesh";
import { formatOrderStatusLabel, COURIER_PROVIDER_STATUS_OPTIONS } from "../../utils/orderStatus";
import { apiClient } from "../../services/api";
import { realtimeService } from "../../services/realtime";
import { useLanguage } from "../../Context/LanguageContext";

const AdminCouriers = ({ orders, onRefresh, onOpenRiderPortal }) => {
  const { isEnglish, t } = useLanguage();
  const [selectedWebhookOrder, setSelectedWebhookOrder] = useState(
    orders[0]?.id || ""
  );
  const [selectedCourier, setSelectedCourier] = useState("steadfast");
  const [simulatedStatus, setSimulatedStatus] = useState("delivered");
  const [isSimulating, setIsSimulating] = useState(false);
  const [simulationLog, setSimulationLog] = useState("");
  const [courierConfigs, setCourierConfigs] = useState([]);
  const [loadingCouriers, setLoadingCouriers] = useState(true);
  const [webhookSimulatorEnabled, setWebhookSimulatorEnabled] = useState(false);
  const [isTogglingSimulator, setIsTogglingSimulator] = useState(false);
  const [isSwitchingAllMode, setIsSwitchingAllMode] = useState(false);
  const [modeFeedback, setModeFeedback] = useState("");

  // Active Selected Courier Modal (Opened on click)
  const [activeCourierModal, setActiveCourierModal] = useState(null);
  const [configForm, setConfigForm] = useState({
    apiKey: "",
    secret: "",
    extraCredentials: {},
    insideDhakaRate: 0,
    outsideDhakaRate: 0,
    codFeePercent: 1.0,
    coverage: ""
  });
  const [isSavingConfig, setIsSavingConfig] = useState(false);

  // Live Balance State per provider
  const [courierBalances, setCourierBalances] = useState({});
  const [loadingBalanceMap, setLoadingBalanceMap] = useState({});
  const [copiedWebhook, setCopiedWebhook] = useState(false);

  const loadLiveCouriers = async () => {
    setLoadingCouriers(true);
    try {
      const [data, ctrlRes] = await Promise.all([
        apiClient.getCouriers(),
        apiClient.getCourierControls(),
      ]);
      if (Array.isArray(data) && data.length > 0) {
        setCourierConfigs(data);
        setSelectedCourier((prev) => (data.some((c) => c.id === prev) ? prev : data[0].id));
      }
      if (ctrlRes?.success && ctrlRes.controls) {
        setWebhookSimulatorEnabled(Boolean(ctrlRes.controls.webhookSimulatorEnabled));
      }
    } catch (e) {
      console.error("Failed to load couriers:", e);
    } finally {
      setLoadingCouriers(false);
    }
  };

  const handleToggleWebhookSimulator = async () => {
    const nextVal = !webhookSimulatorEnabled;
    setIsTogglingSimulator(true);
    try {
      const res = await apiClient.updateCourierControls({ webhookSimulatorEnabled: nextVal });
      if (res?.success && res.controls) {
        setWebhookSimulatorEnabled(Boolean(res.controls.webhookSimulatorEnabled));
      } else {
        setWebhookSimulatorEnabled(nextVal);
      }
    } catch {
    } finally {
      setIsTogglingSimulator(false);
    }
  };

  const handleSetAllCouriersMode = async (targetMode) => {
    setIsSwitchingAllMode(true);
    setModeFeedback("");
    try {
      const res = await apiClient.setCourierMode({ mode: targetMode, provider: "all" });
      if (res?.success) {
        if (Array.isArray(res.couriers)) setCourierConfigs(res.couriers);
        if (res.controls) setWebhookSimulatorEnabled(Boolean(res.controls.webhookSimulatorEnabled));
        setModeFeedback(res.message || `Couriers switched to ${targetMode} mode.`);
        setTimeout(() => setModeFeedback(""), 4500);
      }
    } catch {
    } finally {
      setIsSwitchingAllMode(false);
    }
  };

  useEffect(() => {
    const opts = COURIER_PROVIDER_STATUS_OPTIONS[selectedCourier] || COURIER_PROVIDER_STATUS_OPTIONS.steadfast;
    if (opts && opts.length > 0 && !opts.some((o) => o.value === simulatedStatus)) {
      const deliveredOpt = opts.find((o) => o.label.toLowerCase() === "delivered");
      setSimulatedStatus(deliveredOpt ? deliveredOpt.value : opts[0].value);
    }
  }, [selectedCourier]);

  useEffect(() => {
    loadLiveCouriers();

    const unsubscribe = realtimeService.subscribe((msg) => {
      if (
        msg &&
        (msg.type === "COURIER_ASSIGNED" ||
          msg.type === "ORDER_CREATED" ||
          msg.type === "ORDER_STATUS_CHANGED")
      ) {
        if (typeof onRefresh === "function") onRefresh();
      }
    });

    return () => {
      if (typeof unsubscribe === "function") unsubscribe();
    };
  }, [onRefresh]);

  const handleFetchBalance = async (providerId) => {
    setLoadingBalanceMap((prev) => ({ ...prev, [providerId]: true }));
    try {
      const res = await apiClient.getCourierBalance(providerId);
      if (res && res.success) {
        setCourierBalances((prev) => ({ ...prev, [providerId]: res }));
      }
    } catch (err) {
      console.error(`Balance fetch failed for ${providerId}:`, err);
    } finally {
      setLoadingBalanceMap((prev) => ({ ...prev, [providerId]: false }));
    }
  };

  const handleOpenCourierHub = (cfg) => {
    setActiveCourierModal(cfg);
    setConfigForm({
      apiKey: cfg.apiKey || "",
      secret: cfg.secret || "",
      extraCredentials: (cfg.extraCredentials && typeof cfg.extraCredentials === "object") ? cfg.extraCredentials : {},
      insideDhakaRate: cfg.insideDhakaRate ?? 0,
      outsideDhakaRate: cfg.outsideDhakaRate ?? 0,
      codFeePercent: cfg.codFeePercent ?? 1.0,
      coverage: cfg.coverage || ""
    });
    // Automatically load live balance / test credentials for this provider
    handleFetchBalance(cfg.id);
  };

  const handleToggleCourier = async (e, id, currentActive) => {
    e.stopPropagation();
    try {
      await apiClient.updateCourier(id, { isActive: !currentActive });
      loadLiveCouriers();
    } catch (e) {
      console.error("Toggle courier failed:", e);
    }
  };

  const handleSaveConfig = async (e) => {
    e.preventDefault();
    if (!activeCourierModal) return;
    setIsSavingConfig(true);
    try {
      await apiClient.updateCourier(activeCourierModal.id, configForm);
      await loadLiveCouriers();
      await handleFetchBalance(activeCourierModal.id);
      setActiveCourierModal((prev) => (prev ? { ...prev, ...configForm } : null));
      alert("Courier settings saved successfully!");
    } catch (err) {
      alert("Failed to save config: " + err.message);
    } finally {
      setIsSavingConfig(false);
    }
  };

  const handleCopyWebhook = (providerId) => {
    const origin = window.location.origin;
    const webhookUrl = `${origin}/api/v1/webhooks/couriers/${providerId}`;
    navigator.clipboard.writeText(webhookUrl);
    setCopiedWebhook(true);
    setTimeout(() => setCopiedWebhook(false), 2500);
  };

  const handleSimulateWebhook = async () => {
    if (!selectedWebhookOrder) return;
    setIsSimulating(true);
    setSimulationLog(
      `Generating webhook request for ${selectedCourier.toUpperCase()} server...`
    );
    try {
      const res = await apiClient.simulateCourierWebhook({
        orderId: selectedWebhookOrder,
        provider: selectedCourier,
        eventStatus: simulatedStatus
      });
      if (res.success) {
        setSimulationLog(
          `[SUCCESS ${new Date().toLocaleTimeString()}] Webhook event processed successfully!\nOrder #${selectedWebhookOrder} updated to ${simulatedStatus.toUpperCase()}. Customer SMS & order history synchronized.`
        );
        // Realtime broadcast to sync customer portal and admin orders instantly
        realtimeService.broadcast("ORDER_UPDATED", res.order);
        onRefresh();
      } else {
        setSimulationLog(`[ERROR] Webhook failed: ${res.message}`);
      }
    } catch (err) {
      setSimulationLog(`[FAILED] Connection error: ${err.message}`);
    } finally {
      setIsSimulating(false);
    }
  };

  const codOrders = orders.filter((o) => o.paymentMethod === "COD");
  const settledCOD = codOrders.filter((o) => o.status === "DELIVERED").reduce((sum, o) => sum + o.total, 0);
  const pendingRemittanceCOD = codOrders
    .filter((o) => o.status === "IN_TRANSIT" || o.status === "COURIER_CREATED" || o.status === "OUT_FOR_DELIVERY")
    .reduce((sum, o) => sum + o.total, 0);

  const getProviderMeta = (providerId) => {
    switch (providerId) {
      case "steadfast":
        return {
          portalName: "Steadfast Merchant Dashboard",
          portalUrl: "https://portal.steadfast.com.bd",
          keyLabel: "API Key",
          secretLabel: "Secret Key",
          badgeText: "Recommended Nationwide",
          badgeColor: "bg-emerald-100 text-emerald-800",
          guideText: "Steadfast provides high COD success rate. Set Webhook URL in Settings > Webhook to receive real-time parcel updates."
        };
      case "pathao":
        return {
          portalName: "Pathao Courier Portal",
          portalUrl: "https://merchant.pathao.com",
          keyLabel: "Client ID",
          secretLabel: "Client Secret",
          badgeText: "Fastest Inside Dhaka",
          badgeColor: "bg-red-100 text-red-800",
          guideText: "Pathao offers express 24-hour delivery inside Dhaka. Enter your OAuth Client ID and Client Secret from developer settings."
        };
      case "redx":
        return {
          portalName: "RedX Logistics Portal",
          portalUrl: "https://redx.com.bd/merchant",
          keyLabel: "API Access Token",
          secretLabel: "Secret Hash / Key",
          badgeText: "Wide Remote Network",
          badgeColor: "bg-orange-100 text-orange-800",
          guideText: "RedX reaches extensive upazila and rural branches. Generate API Access Token from RedX Merchant Dashboard."
        };
      case "ecourier":
        return {
          portalName: "eCourier Partner Portal",
          portalUrl: "https://backoffice.ecourier.com.bd",
          keyLabel: "API Key",
          secretLabel: "API Secret",
          badgeText: "Smart OTP Tracking",
          badgeColor: "bg-blue-100 text-blue-800",
          guideText: "eCourier provides secure OTP parcel delivery verification and real-time transit status."
        };
      default:
        return {
          portalName: "Courier Portal",
          portalUrl: "#",
          keyLabel: "API Key",
          secretLabel: "Secret Key",
          badgeText: "Active Courier",
          badgeColor: "bg-neutral-100 text-neutral-800",
          guideText: "Configure courier credentials and webhook settings."
        };
    }
  };

  return (
    <div className="space-y-6">
      {/* COD Financial Reconciliation Stats */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <div className="bg-white rounded-2xl p-5 border border-neutral-200 shadow-xs">
          <span className="text-xs text-neutral-400 font-semibold block">
            {"Total Collected COD Cash"}
          </span>
          <span className="text-2xl font-black text-emerald-700 mt-1 block">
            {formatBDT(settledCOD)}
          </span>
          <span className="text-[11px] text-neutral-500 mt-1 block">
            {"Successfully delivered & settled"}
          </span>
        </div>

        <div className="bg-white rounded-2xl p-5 border border-neutral-200 shadow-xs">
          <span className="text-xs text-neutral-400 font-semibold block">
            {"Pending Courier Remittance"}
          </span>
          <span className="text-2xl font-black text-amber-600 mt-1 block">
            {formatBDT(pendingRemittanceCOD)}
          </span>
          <span className="text-[11px] text-neutral-500 mt-1 block">
            {"Parcels in-transit / awaiting cycle settlement"}
          </span>
        </div>

        <div className="bg-white rounded-2xl p-5 border border-neutral-200 shadow-xs">
          <span className="text-xs text-neutral-400 font-semibold block">
            {"Courier Integration Health"}
          </span>
          <span className="text-2xl font-black text-neutral-900 mt-1 block">
            {loadingCouriers
              ? "Loading..."
              : `${courierConfigs.filter((c) => c.isActive).length}/${courierConfigs.length} Online`}
          </span>
          <span className="text-[11px] text-emerald-600 font-semibold mt-1 block">
            {"Adapters & Webhook Listeners Ready"}
          </span>
        </div>
      </div>

      {/* Global Courier Mode Switcher (Testing / Sandbox vs Live Production API) */}
      <div className="bg-white rounded-3xl p-5 border border-neutral-200 shadow-xs flex flex-wrap items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2">
            <span className="text-xs font-bold uppercase tracking-wider text-emerald-700 bg-emerald-50 px-2.5 py-0.5 rounded-full">
              {"Environment Control"}
            </span>
            {courierConfigs.length > 0 && (
              <span
                className={`text-[11px] font-bold px-2.5 py-0.5 rounded-full ${
                  courierConfigs.some((c) => c.extraCredentials?.sandboxMode)
                    ? "bg-amber-100 text-amber-800"
                    : "bg-emerald-100 text-emerald-800"
                }`}
              >
                {courierConfigs.every((c) => c.extraCredentials?.sandboxMode)
                  ? "All Couriers in Testing Mode"
                  : courierConfigs.some((c) => c.extraCredentials?.sandboxMode)
                    ? "Mixed Testing and Live Mode"
                    : "Live Production API Mode"}
              </span>
            )}
          </div>
          <h3 className="text-sm font-black text-neutral-900 mt-1.5">
            {"One Click Testing Mode vs Live Merchant API"}
          </h3>
          <p className="text-xs text-neutral-500 mt-0.5">
            {"Enable Testing Mode to auto-configure sandbox tracing and Webhook Simulator across all couriers, or switch to Live API when real merchant keys are ready."}
          </p>
          {modeFeedback && (
            <p className="text-xs font-bold text-emerald-700 mt-1.5">{modeFeedback}</p>
          )}
        </div>

        <div className="flex flex-wrap items-center gap-2.5">
          <button
            type="button"
            disabled={isSwitchingAllMode}
            onClick={() => handleSetAllCouriersMode("sandbox")}
            className="px-4 py-2 rounded-xl bg-amber-500 hover:bg-amber-600 text-white text-xs font-bold shadow-xs transition-colors cursor-pointer disabled:opacity-50"
          >
            {isSwitchingAllMode ? "Updating..." : "Enable Testing Mode (All Couriers)"}
          </button>
          <button
            type="button"
            disabled={isSwitchingAllMode}
            onClick={() => handleSetAllCouriersMode("live")}
            className="px-4 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold shadow-xs transition-colors cursor-pointer disabled:opacity-50"
          >
            {isSwitchingAllMode ? "Updating..." : "Switch All to Live API"}
          </button>
        </div>
      </div>

      {/* 4 Unified Courier Provider Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {courierConfigs.map((cfg) => {
          const meta = getProviderMeta(cfg.id);
          const isSandbox = Boolean(cfg.extraCredentials?.sandboxMode);
          const isConfigured = Boolean(
            cfg.apiKey &&
            !cfg.apiKey.startsWith("stf_live_api_") &&
            !cfg.apiKey.startsWith("pk_live_pathao_") &&
            !cfg.apiKey.startsWith("redx_token_") &&
            !cfg.apiKey.startsWith("ec_usr_")
          );

          return (
            <div
              key={cfg.id}
              onClick={() => handleOpenCourierHub(cfg)}
              className="bg-white rounded-3xl p-6 border border-neutral-200 hover:border-emerald-500/70 hover:shadow-md transition-all cursor-pointer group space-y-4 relative"
            >
              <div className="flex justify-between items-start">
                <div className="flex items-center gap-3">
                  <div className="w-11 h-11 rounded-2xl bg-neutral-900 text-white flex items-center justify-center font-bold shadow-xs group-hover:scale-105 transition-transform">
                    <Truck className="w-5 h-5 text-emerald-400" />
                  </div>
                  <div>
                    <div className="flex items-center gap-2">
                      <h3 className="font-bold text-base text-neutral-900 group-hover:text-emerald-700 transition-colors">
                        {cfg.name}
                      </h3>
                      <span className={`text-[10px] px-2 py-0.5 rounded-full font-bold ${meta.badgeColor}`}>
                        {meta.badgeText}
                      </span>
                    </div>

                    <div className="flex items-center gap-2 mt-1">
                      <span
                        className={`text-[10px] px-2.5 py-0.5 rounded-full font-bold ${
                          cfg.isActive ? "text-emerald-700 bg-emerald-50" : "text-neutral-500 bg-neutral-100"
                        }`}
                      >
                        {cfg.isActive
                          ? "Active"
                          : "Disabled"}
                      </span>
                      {isSandbox ? (
                        <span className="text-[10px] text-amber-700 bg-amber-50 border border-amber-200 px-2 py-0.5 rounded-full font-semibold">
                          {"Sandbox Testing Mode"}
                        </span>
                      ) : isConfigured ? (
                        <span className="text-[10px] text-emerald-600 font-semibold flex items-center gap-0.5">
                          <Check className="w-3 h-3" /> {"Live API"}
                        </span>
                      ) : (
                        <span className="text-[10px] text-rose-600 font-semibold">
                          {"Live Credentials Missing"}
                        </span>
                      )}
                    </div>
                  </div>
                </div>

                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    onClick={(e) => handleToggleCourier(e, cfg.id, cfg.isActive)}
                    className={`text-[11px] font-bold px-3 py-1.5 rounded-xl transition-colors cursor-pointer ${
                      cfg.isActive
                        ? "bg-rose-50 text-rose-700 hover:bg-rose-100"
                        : "bg-emerald-50 text-emerald-700 hover:bg-emerald-100"
                    }`}
                  >
                    {cfg.isActive
                      ? "Disable"
                      : "Enable"}
                  </button>
                </div>
              </div>

              {/* Delivery Rates & Coverage */}
              <div className="space-y-1.5 text-xs text-neutral-600 pt-3 border-t border-neutral-100">
                <div className="flex items-center gap-2">
                  <Globe className="w-3.5 h-3.5 text-neutral-400 shrink-0" />
                  <span className="line-clamp-1">
                    {cfg.coverage || ("64 Districts Nationwide Coverage")}
                  </span>
                </div>
                <div className="flex items-center justify-between text-[11px]">
                  <span className="text-neutral-500">{"Delivery Fee:"}</span>
                  <span className="font-bold text-neutral-800">
                    {"Inside Dhaka:"} ৳{cfg.insideDhakaRate ?? 0} |{" "}
                    {"Outside:"} ৳{cfg.outsideDhakaRate ?? 0}
                  </span>
                </div>
                <div className="flex items-center justify-between text-[11px]">
                  <span className="text-neutral-500">{"COD Commission:"}</span>
                  <span className="font-bold text-emerald-700">{cfg.codFeePercent || 1}%</span>
                </div>
              </div>

              {/* Bottom Clickable CTA */}
              <div className="pt-2 flex justify-between items-center text-xs font-bold text-emerald-700 group-hover:text-emerald-800 border-t border-neutral-100">
                <span className="flex items-center gap-1.5">
                  <Settings className="w-3.5 h-3.5" />
                  <span>{"Open Courier Hub & Balance"}</span>
                </span>
                <ChevronRight className="w-4 h-4 transform group-hover:translate-x-1 transition-transform" />
              </div>
            </div>
          );
        })}
      </div>

      {/* Webhook Simulator & Event Testing Console */}
      <div className="bg-white rounded-3xl p-6 border border-neutral-200 shadow-xs space-y-4">
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div>
            <span className="text-xs font-bold uppercase tracking-wider text-indigo-700 bg-indigo-50 px-2.5 py-1 rounded-full">
              {"Developer & Operations Testing Tool"}
            </span>
            <h3 className="text-base font-bold text-neutral-900 mt-2">
              {"Live Courier Webhook Simulator"}
            </h3>
            <p className="text-xs text-neutral-500">
              {"Enable only during testing. When disabled, simulated webhook requests are blocked on the server."}
            </p>
          </div>

          <button
            type="button"
            disabled={isTogglingSimulator}
            onClick={handleToggleWebhookSimulator}
            className={`px-3.5 py-2 rounded-xl text-xs font-bold border transition-colors cursor-pointer disabled:opacity-50 ${
              webhookSimulatorEnabled
                ? "bg-indigo-600 text-white border-indigo-600 hover:bg-indigo-700"
                : "bg-neutral-100 text-neutral-700 border-neutral-300 hover:bg-neutral-200"
            }`}
          >
            {isTogglingSimulator
              ? "Updating..."
              : webhookSimulatorEnabled
              ? "Simulator Enabled (Click to Disable)"
              : "Simulator Disabled (Click to Enable)"}
          </button>
        </div>

        {webhookSimulatorEnabled && (
          <>
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 text-xs pt-2 border-t border-neutral-100">
              <div>
                <label className="block font-bold text-neutral-700 mb-1">
                  {"Select Order:"}
                </label>
                <select
                  value={selectedWebhookOrder}
                  onChange={(e) => setSelectedWebhookOrder(e.target.value)}
                  className="w-full px-3 py-2 bg-neutral-50 rounded-xl border border-neutral-300 font-medium cursor-pointer"
                >
                  {orders.map((o) => (
                    <option key={o.id} value={o.id}>
                      {`#${o.id} • ${o.address?.customerName || "Customer"} (${formatOrderStatusLabel(o.status)})`}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block font-bold text-neutral-700 mb-1">
                  {"Courier Provider:"}
                </label>
                <select
                  value={selectedCourier}
                  onChange={(e) => setSelectedCourier(e.target.value)}
                  className="w-full px-3 py-2 bg-neutral-50 rounded-xl border border-neutral-300 font-medium capitalize cursor-pointer"
                >
                  {courierConfigs.map((c) => (
                    <option key={c.id} value={c.id}>
                      {c.name}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block font-bold text-neutral-700 mb-1">
                  {"Simulated Event Status:"}
                </label>
                <select
                  value={simulatedStatus}
                  onChange={(e) => setSimulatedStatus(e.target.value)}
                  className="w-full px-3 py-2 bg-neutral-50 rounded-xl border border-neutral-300 font-medium cursor-pointer"
                >
                  {(COURIER_PROVIDER_STATUS_OPTIONS[selectedCourier] || COURIER_PROVIDER_STATUS_OPTIONS.steadfast).map((opt) => (
                    <option key={opt.value} value={opt.value}>
                      {opt.label}
                    </option>
                  ))}
                </select>
              </div>
            </div>

            <div className="flex flex-wrap items-center gap-3">
              <button
                onClick={handleSimulateWebhook}
                disabled={isSimulating}
                className="px-5 py-2.5 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white font-bold text-xs flex items-center gap-2 transition-colors shadow-xs disabled:opacity-50 cursor-pointer"
              >
                <Send className="w-3.5 h-3.5" />
                <span>
                  {isSimulating
                    ? "Sending webhook..."
                    : "Fire Test Webhook (POST /webhooks)"}
                </span>
              </button>

              <a
                href="/courier"
                target="_blank"
                rel="noopener noreferrer"
                className="px-4 py-2.5 bg-neutral-900 hover:bg-neutral-800 text-white rounded-xl text-xs font-bold flex items-center gap-2 shadow-xs transition-colors"
              >
                <Truck className="w-3.5 h-3.5 text-emerald-400" />
                <span>{"🛵 Live Rider Delivery Portal (/courier)"}</span>
                <ExternalLink className="w-3 h-3 text-neutral-400" />
              </a>
            </div>

            {simulationLog && (
              <div className="p-3 bg-neutral-900 text-emerald-400 font-mono text-[11px] rounded-xl whitespace-pre-line leading-relaxed">
                {simulationLog}
              </div>
            )}
          </>
        )}
      </div>

      {/* DEDICATED COURIER HUB MODAL (Opened upon clicking any courier card) */}
      {activeCourierModal && (() => {
        const meta = getProviderMeta(activeCourierModal.id);
        const providerBalance = courierBalances[activeCourierModal.id];
        const isBalanceLoading = loadingBalanceMap[activeCourierModal.id];
        const webhookUrl = `${typeof window !== 'undefined' ? window.location.origin : ''}/api/v1/webhooks/couriers/${activeCourierModal.id}`;

        return (
          <div className="fixed inset-0 z-50 overflow-y-auto bg-black/60 backdrop-blur-xs flex items-center justify-center p-3 sm:p-4">
            <div className="relative bg-white rounded-3xl max-w-2xl w-full overflow-hidden shadow-2xl p-6 sm:p-8 animate-in fade-in zoom-in-95 duration-200 space-y-6">
              {/* Modal Header */}
              <div className="flex justify-between items-start pb-4 border-b border-neutral-200">
                <div className="flex items-center gap-3">
                  <div className="w-11 h-11 rounded-2xl bg-neutral-900 text-white flex items-center justify-center font-bold">
                    <Truck className="w-6 h-6 text-emerald-400" />
                  </div>
                  <div>
                    <div className="flex items-center gap-2">
                      <h2 className="font-black text-lg text-neutral-900">
                        {activeCourierModal.name} {"Management Hub"}
                      </h2>
                      <span className={`text-[10px] px-2 py-0.5 rounded-full font-bold ${meta.badgeColor}`}>
                        {meta.badgeText}
                      </span>
                    </div>
                    <p className="text-xs text-neutral-500 mt-0.5">
                      {`Provider ID: ${activeCourierModal.id}`}
                    </p>
                  </div>
                </div>

                <button
                  type="button"
                  onClick={() => setActiveCourierModal(null)}
                  className="p-1.5 rounded-full text-neutral-400 hover:text-neutral-700 hover:bg-neutral-100 transition-colors cursor-pointer"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>

              {/* Balance & Webhook Row */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                {/* Balance Card */}
                <div className="bg-neutral-900 text-white rounded-2xl p-4 space-y-2 border border-neutral-800 shadow-xs">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2 text-xs font-bold text-neutral-300">
                      <Wallet className="w-4 h-4 text-emerald-400" />
                      <span>{`${activeCourierModal.name} Balance`}</span>
                    </div>
                    <button
                      type="button"
                      onClick={() => handleFetchBalance(activeCourierModal.id)}
                      disabled={isBalanceLoading}
                      className="text-[11px] text-neutral-400 hover:text-emerald-400 flex items-center gap-1 cursor-pointer transition-colors"
                      title="Refresh Balance"
                    >
                      <RefreshCw className={`w-3 h-3 ${isBalanceLoading ? "animate-spin text-emerald-400" : ""}`} />
                      <span>{"Refresh"}</span>
                    </button>
                  </div>

                  <div>
                    <div className="text-2xl font-black text-white">
                      {providerBalance?.balanceUnsupported
                        ? (providerBalance.success ? "Auth Verified ✓" : "Auth Failed")
                        : providerBalance
                          ? formatBDT(providerBalance.current_balance ?? 0)
                          : "৳---"}
                    </div>
                    <p className="text-[10px] text-neutral-400 mt-1">
                      {providerBalance?.message || (
                        providerBalance?.isDemo
                          ? "Demo Account Balance (Active)"
                          : "Live Synced Merchant Balance"
                      )}
                    </p>
                  </div>
                </div>

                {/* Webhook URL Box */}
                <div className="bg-emerald-50/60 rounded-2xl p-4 border border-emerald-200/80 space-y-2">
                  <div className="flex items-center justify-between text-xs font-bold text-emerald-950">
                    <span className="flex items-center gap-1.5">
                      <ShieldCheck className="w-4 h-4 text-emerald-700" />
                      <span>{"Dedicated Webhook URL"}</span>
                    </span>
                    <button
                      type="button"
                      onClick={() => handleCopyWebhook(activeCourierModal.id)}
                      className="px-2 py-0.5 rounded-lg bg-emerald-600 hover:bg-emerald-700 text-white text-[10px] font-bold flex items-center gap-1 transition-all cursor-pointer"
                    >
                      {copiedWebhook ? <Check className="w-3 h-3" /> : <Copy className="w-3 h-3" />}
                      <span>{copiedWebhook ? ("Copied") : ("Copy")}</span>
                    </button>
                  </div>

                  <div className="bg-white p-2 rounded-xl border border-emerald-200/90 font-mono text-[11px] text-emerald-900 truncate select-all">
                    {webhookUrl}
                  </div>
                  <p className="text-[10px] text-neutral-500 leading-tight">
                    {meta.guideText}
                  </p>
                </div>
              </div>

              {/* API Credentials & Rates Configuration Form */}
              <form onSubmit={handleSaveConfig} className="space-y-4 text-xs">
                <div className="border-t border-neutral-100 pt-3">
                  {/* Sandbox vs Live Production Mode Toggle */}
                  <div className="mb-4 p-3.5 rounded-2xl bg-neutral-50 border border-neutral-200 flex items-center justify-between gap-3">
                    <div>
                      <div className="font-bold text-neutral-900 text-xs">
                        {"Courier Environment Mode"}
                      </div>
                      <div className="text-[11px] text-neutral-500">
                        {configForm.extraCredentials?.sandboxMode
                          ? "Sandbox Testing Mode Active — Bookings generate test tracking IDs without calling live courier APIs."
                          : "Live Production Mode — Requires genuine merchant API credentials; never fakes bookings."}
                      </div>
                    </div>
                    <button
                      type="button"
                      onClick={() =>
                        setConfigForm((prev) => ({
                          ...prev,
                          extraCredentials: {
                            ...(prev.extraCredentials || {}),
                            sandboxMode: !prev.extraCredentials?.sandboxMode,
                          },
                        }))
                      }
                      className={`px-3 py-1.5 rounded-xl text-[11px] font-bold border shrink-0 transition-colors cursor-pointer ${
                        configForm.extraCredentials?.sandboxMode
                          ? "bg-amber-100 text-amber-800 border-amber-300"
                          : "bg-emerald-600 text-white border-emerald-600"
                      }`}
                    >
                      {configForm.extraCredentials?.sandboxMode ? "Sandbox Testing ON" : "Live API Active"}
                    </button>
                  </div>

                  <h4 className="font-bold text-neutral-900 text-sm mb-3 flex items-center gap-2">
                    <Key className="w-4 h-4 text-emerald-600" />
                    <span>{"API Credentials & Rates"}</span>
                  </h4>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    <div>
                      <label className="block font-bold text-neutral-700 mb-1">
                        {meta.keyLabel} {!configForm.extraCredentials?.sandboxMode && <span className="text-rose-500">*</span>}
                      </label>
                      <input
                        type="text"
                        required={!configForm.extraCredentials?.sandboxMode}
                        value={configForm.apiKey}
                        onChange={(e) => setConfigForm({ ...configForm, apiKey: e.target.value })}
                        placeholder={`Enter ${meta.keyLabel}`}
                        className="w-full px-3 py-2.5 rounded-xl border border-neutral-300 font-mono text-xs focus:border-emerald-600 focus:ring-1 focus:ring-emerald-600 outline-none bg-neutral-50/50"
                      />
                    </div>

                    <div>
                      <label className="block font-bold text-neutral-700 mb-1">
                        {meta.secretLabel} {activeCourierModal.id !== "redx" && !configForm.extraCredentials?.sandboxMode && <span className="text-rose-500">*</span>}
                      </label>
                      <input
                        type="password"
                        required={activeCourierModal.id !== "redx" && !configForm.extraCredentials?.sandboxMode}
                        value={configForm.secret}
                        onChange={(e) => setConfigForm({ ...configForm, secret: e.target.value })}
                        placeholder={activeCourierModal.id === "redx" ? "Optional for RedX" : `Enter ${meta.secretLabel}`}
                        className="w-full px-3 py-2.5 rounded-xl border border-neutral-300 font-mono text-xs focus:border-emerald-600 focus:ring-1 focus:ring-emerald-600 outline-none bg-neutral-50/50"
                      />
                    </div>
                  </div>

                  {/* Provider-Specific Extra Live Credentials */}
                  {activeCourierModal.id === "pathao" && (
                    <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 mt-3">
                      <div>
                        <label className="block font-bold text-neutral-700 mb-1">Pathao Email / Username *</label>
                        <input
                          type="text"
                          value={configForm.extraCredentials?.username || ""}
                          onChange={(e) => setConfigForm({ ...configForm, extraCredentials: { ...(configForm.extraCredentials || {}), username: e.target.value } })}
                          placeholder="merchant@email.com"
                          className="w-full px-3 py-2 rounded-xl border border-neutral-300 text-xs bg-neutral-50/50"
                        />
                      </div>
                      <div>
                        <label className="block font-bold text-neutral-700 mb-1">Pathao Password *</label>
                        <input
                          type="password"
                          value={configForm.extraCredentials?.password || ""}
                          onChange={(e) => setConfigForm({ ...configForm, extraCredentials: { ...(configForm.extraCredentials || {}), password: e.target.value } })}
                          placeholder="••••••••"
                          className="w-full px-3 py-2 rounded-xl border border-neutral-300 text-xs bg-neutral-50/50"
                        />
                      </div>
                      <div>
                        <label className="block font-bold text-neutral-700 mb-1">Pathao Store ID (Optional Auto)</label>
                        <input
                          type="text"
                          value={configForm.extraCredentials?.store_id || ""}
                          onChange={(e) => setConfigForm({ ...configForm, extraCredentials: { ...(configForm.extraCredentials || {}), store_id: e.target.value } })}
                          placeholder="Auto-detects if empty"
                          className="w-full px-3 py-2 rounded-xl border border-neutral-300 font-mono text-xs bg-neutral-50/50"
                        />
                      </div>
                      <label className="sm:col-span-3 inline-flex items-center gap-2 text-[11px] font-semibold text-neutral-700 cursor-pointer pt-1">
                        <input
                          type="checkbox"
                          checked={Boolean(configForm.extraCredentials?.useOfficialSandbox)}
                          onChange={(e) =>
                            setConfigForm({
                              ...configForm,
                              extraCredentials: {
                                ...(configForm.extraCredentials || {}),
                                useOfficialSandbox: e.target.checked,
                              },
                            })
                          }
                          className="w-4 h-4 accent-amber-600 rounded"
                        />
                        <span>Use Pathao Official Sandbox Server (courier-api-sandbox.pathao.com) instead of Production API</span>
                      </label>
                    </div>
                  )}

                  {activeCourierModal.id === "ecourier" && (
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 mt-3">
                      <div>
                        <label className="block font-bold text-neutral-700 mb-1">eCourier User ID *</label>
                        <input
                          type="text"
                          value={configForm.extraCredentials?.user_id || ""}
                          onChange={(e) => setConfigForm({ ...configForm, extraCredentials: { ...(configForm.extraCredentials || {}), user_id: e.target.value } })}
                          placeholder="Merchant USER-ID"
                          className="w-full px-3 py-2 rounded-xl border border-neutral-300 font-mono text-xs bg-neutral-50/50"
                        />
                      </div>
                      <div>
                        <label className="block font-bold text-neutral-700 mb-1">Package Code</label>
                        <input
                          type="text"
                          value={configForm.extraCredentials?.package_code || ""}
                          onChange={(e) => setConfigForm({ ...configForm, extraCredentials: { ...(configForm.extraCredentials || {}), package_code: e.target.value } })}
                          placeholder="e.g. PKG-01"
                          className="w-full px-3 py-2 rounded-xl border border-neutral-300 font-mono text-xs bg-neutral-50/50"
                        />
                      </div>
                    </div>
                  )}

                  {activeCourierModal.id === "redx" && (
                    <div className="mt-3 max-w-xs">
                      <label className="block font-bold text-neutral-700 mb-1">Default RedX Area ID (Optional)</label>
                      <input
                        type="text"
                        value={configForm.extraCredentials?.delivery_area_id || ""}
                        onChange={(e) => setConfigForm({ ...configForm, extraCredentials: { ...(configForm.extraCredentials || {}), delivery_area_id: e.target.value } })}
                        placeholder="e.g. 1"
                        className="w-full px-3 py-2 rounded-xl border border-neutral-300 font-mono text-xs bg-neutral-50/50"
                      />
                    </div>
                  )}
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                  <div>
                    <label className="block font-bold text-neutral-700 mb-1">
                      {"Inside Dhaka (৳):"}
                    </label>
                    <input
                      type="number"
                      value={configForm.insideDhakaRate}
                      onChange={(e) => setConfigForm({ ...configForm, insideDhakaRate: parseInt(e.target.value) || 0 })}
                      className="w-full px-3 py-2 rounded-xl border border-neutral-300 text-xs focus:border-emerald-600 outline-none"
                    />
                  </div>

                  <div>
                    <label className="block font-bold text-neutral-700 mb-1">
                      {"Outside Dhaka (৳):"}
                    </label>
                    <input
                      type="number"
                      value={configForm.outsideDhakaRate}
                      onChange={(e) => setConfigForm({ ...configForm, outsideDhakaRate: parseInt(e.target.value) || 0 })}
                      className="w-full px-3 py-2 rounded-xl border border-neutral-300 text-xs focus:border-emerald-600 outline-none"
                    />
                  </div>

                  <div>
                    <label className="block font-bold text-neutral-700 mb-1">
                      {"COD Fee (%):"}
                    </label>
                    <input
                      type="number"
                      step="0.1"
                      value={configForm.codFeePercent}
                      onChange={(e) => setConfigForm({ ...configForm, codFeePercent: parseFloat(e.target.value) || 0 })}
                      className="w-full px-3 py-2 rounded-xl border border-neutral-300 text-xs focus:border-emerald-600 outline-none"
                    />
                  </div>
                </div>

                <div className="pt-4 border-t border-neutral-200 flex justify-between items-center">
                  <a
                    href={meta.portalUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-neutral-500 hover:text-emerald-700 text-xs font-bold flex items-center gap-1"
                  >
                    <span>{meta.portalName}</span>
                    <ExternalLink className="w-3.5 h-3.5" />
                  </a>

                  <div className="flex gap-2">
                    <button
                      type="button"
                      onClick={() => setActiveCourierModal(null)}
                      className="px-4 py-2.5 rounded-xl border border-neutral-300 text-neutral-600 font-bold text-xs hover:bg-neutral-50 cursor-pointer"
                    >
                      {"Close"}
                    </button>
                    <button
                      type="submit"
                      disabled={isSavingConfig}
                      className="px-5 py-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs shadow-xs disabled:opacity-50 cursor-pointer"
                    >
                      {isSavingConfig ? ("Saving...") : ("Save Settings")}
                    </button>
                  </div>
                </div>
              </form>
            </div>
          </div>
        );
      })()}
    </div>
  );
};

export { AdminCouriers };
