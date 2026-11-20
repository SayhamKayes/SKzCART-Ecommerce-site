import { useState, useEffect } from "react";
import {
  CreditCard,
  CheckCircle2,
  RefreshCw,
  Sliders,
  Check,
  X,
  Play,
  Save
} from "lucide-react";
import { useThemeConfig } from "../frontPanel/FrontPanelContext";
import { apiClient } from "../../services/api";
import { DEFAULT_PAYMENT_METHODS } from "../../utils/paymentConfig";
import { realtimeService } from "../../services/realtime";
import bkashImg from "../../assets/bkash.png";
import nagadImg from "../../assets/nagad2.png";
import rocketImg from "../../assets/rocket2.png";
import codImg from "../../assets/COD.png";

const AdminPayments = ({ orders = [] }) => {
  const { themeConfig } = useThemeConfig();
  const idPrefixes = themeConfig?.shop?.idPrefixes || {};
  const orderIdPrefix = idPrefixes.orderIdPrefix || "BD";

  // Dynamic Payment Methods State (bKash, Nagad, Rocket, COD, SSLCommerz)
  const [paymentMethods, setPaymentMethods] = useState(DEFAULT_PAYMENT_METHODS);
  const [isSavingMethods, setIsSavingMethods] = useState(false);
  const [methodsSuccessMsg, setMethodsSuccessMsg] = useState("");
  const [isRefreshing, setIsRefreshing] = useState(false);

  // Gateway Config & Popup Modal state
  const [isConfigModalOpen, setIsConfigModalOpen] = useState(false);
  const [gatewayConfig, setGatewayConfig] = useState({
    gateway_id: "sslcommerz",
    name: "SSLCOMMERZ Multi-Card Gateway",
    store_id: "testbox",
    store_password: "qwerty",
    is_sandbox: true,
    is_active: true,
    fee_percent: 2.0,
  });
  const [isSavingConfig, setIsSavingConfig] = useState(false);
  const [configSuccessMsg, setConfigSuccessMsg] = useState("");

  // Quick sandbox test state
  const [isInitiatingTest, setIsInitiatingTest] = useState(false);

  const fetchConfig = async () => {
    try {
      const cfg = await apiClient.getPaymentConfig();
      if (cfg) {
        setGatewayConfig(cfg);
      }
    } catch (err) {
      console.warn("Failed to fetch gateway config:", err);
    }
  };

  const fetchMethods = async () => {
    try {
      const data = await apiClient.getPaymentMethods();
      if (Array.isArray(data) && data.length > 0) {
        setPaymentMethods(data);
      }
    } catch (err) {
      console.warn("Failed to fetch payment methods:", err);
    }
  };

  const handleRefreshAll = async () => {
    setIsRefreshing(true);
    try {
      await Promise.all([fetchConfig(), fetchMethods()]);
    } finally {
      setIsRefreshing(false);
    }
  };

  useEffect(() => {
    fetchConfig();
    fetchMethods();
  }, []);

  useEffect(() => {
    const unsubscribe = realtimeService.subscribe((msg) => {
      const type = typeof msg === "string" ? msg : msg?.type;
      if (type === "PAYMENT_CONFIG_UPDATED" || type === "PAYMENT_RECEIVED") {
        fetchConfig();
        fetchMethods();
      }
    });
    return () => unsubscribe();
  }, []);

  useEffect(() => {
    if (!isConfigModalOpen) return;
    const handleKeyDown = (e) => {
      if (e.key === "Escape") {
        setIsConfigModalOpen(false);
      }
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [isConfigModalOpen]);

  const handleToggleMethod = (methodId) => {
    setPaymentMethods((prev) =>
      prev.map((m) => {
        if (m.method_id === methodId) {
          return { ...m, is_active: !m.is_active };
        }
        return m;
      })
    );
  };

  const handleUpdateMethodField = (methodId, field, value) => {
    setPaymentMethods((prev) =>
      prev.map((m) => {
        if (m.method_id === methodId) {
          return { ...m, [field]: value };
        }
        return m;
      })
    );
  };

  const handleSaveMethods = async () => {
    setIsSavingMethods(true);
    setMethodsSuccessMsg("");
    try {
      const res = await apiClient.updatePaymentMethods(paymentMethods);
      if (res && res.success) {
        setMethodsSuccessMsg(
          "Payment channels & numbers updated successfully!"
        );
        if (Array.isArray(res.methods)) {
          setPaymentMethods(res.methods);
        }
        try {
          realtimeService.broadcast("PAYMENT_METHODS_UPDATED", res.methods || paymentMethods);
        } catch {}
        setTimeout(() => setMethodsSuccessMsg(""), 4000);
      } else {
        alert(res?.message || "Failed to update payment channels");
      }
    } catch (err) {
      console.error("Save methods error:", err);
      alert("Error saving payment channels: " + err.message);
    } finally {
      setIsSavingMethods(false);
    }
  };

  const handleSaveConfig = async (e) => {
    e.preventDefault();
    setIsSavingConfig(true);
    setConfigSuccessMsg("");
    try {
      const res = await apiClient.updatePaymentConfig(gatewayConfig);
      if (res && res.success) {
        setConfigSuccessMsg(
          "SSLCommerz configuration saved successfully!"
        );
        try {
          realtimeService.broadcast("PAYMENT_CONFIG_UPDATED", gatewayConfig);
        } catch {}
        setTimeout(() => setConfigSuccessMsg(""), 4000);
      }
    } catch (err) {
      console.error("Save config error:", err);
    } finally {
      setIsSavingConfig(false);
    }
  };

  const handleTriggerSandboxTest = async () => {
    if (!gatewayConfig.is_sandbox) {
      const ok = window.confirm(
        "Gateway is currently in LIVE PRODUCTION mode. Launching a test payment session will connect to live SSLCommerz checkout. Continue?"
      );
      if (!ok) return;
    }
    setIsInitiatingTest(true);
    try {
      const testOrderId = orders[0]?.id || `${orderIdPrefix}-${Math.floor(100000 + Math.random() * 900000)}`;
      const res = await apiClient.initiatePayment({
        orderId: testOrderId,
        amount: 1250,
        customerData: {
          customerName: "Admin Test Customer",
          phone: "01712345678",
          email: "admin_test@customer.amardokan.com",
          district: "Dhaka",
          fullAddress: "AmarDokan Head Office, Dhanmondi 27",
        },
      });

      if (res && res.success && res.gatewayUrl) {
        window.open(res.gatewayUrl, "_blank");
      } else {
        alert(res?.message || "Failed to initiate test session");
      }
    } catch (err) {
      alert("Error: " + err.message);
    } finally {
      setIsInitiatingTest(false);
    }
  };

  return (
    <div className="space-y-6 max-w-full overflow-x-hidden">
      {/* Payment Methods & MFS Channels Configuration */}
      <div className="space-y-6">
          {/* Top Info & Action Bar */}
          <div className="bg-white rounded-3xl p-6 border border-neutral-200 shadow-xs flex flex-wrap items-center justify-between gap-4">
            <div>
              <div className="flex flex-wrap items-center gap-2">
                <span className="text-xs font-bold uppercase tracking-wider text-neutral-600 bg-neutral-100 px-2.5 py-1 rounded-full border border-neutral-200">
                  {paymentMethods.filter((m) => m.is_active).length} of {paymentMethods.length} Channels Active
                </span>
                <span
                  className={`text-xs font-bold uppercase tracking-wider px-2.5 py-1 rounded-full border ${
                    gatewayConfig.is_sandbox
                      ? "text-amber-700 bg-amber-50 border-amber-200"
                      : "text-emerald-700 bg-emerald-50 border-emerald-200"
                  }`}
                >
                  {gatewayConfig.is_sandbox ? "SSLCommerz Sandbox Active" : "SSLCommerz Live Active"}
                </span>
              </div>
              <h2 className="text-xl font-black text-neutral-900 mt-2">
                {"Payment Methods & MFS Number Manager"}
              </h2>
              <p className="text-xs text-neutral-500 mt-0.5 max-w-2xl leading-relaxed">
                {"Enable or disable any payment method on the checkout page instantly. Update your merchant/personal wallet numbers and payment instructions. Changes synchronize across both the Guest Checkout Modal and the Product Details page."}
              </p>
            </div>

            <div className="flex items-center gap-2.5">
              <button
                type="button"
                onClick={handleRefreshAll}
                className="p-2.5 rounded-xl border border-neutral-200 hover:bg-neutral-100 text-neutral-700 transition-colors cursor-pointer"
                title="Refresh Payment Methods & Gateway Config"
              >
                <RefreshCw className={`w-4 h-4 ${isRefreshing ? "animate-spin" : ""}`} />
              </button>

              <button
                type="button"
                onClick={handleSaveMethods}
                disabled={isSavingMethods}
                className="px-6 py-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs shadow-md transition-all cursor-pointer flex items-center gap-2 disabled:opacity-50"
              >
                <Save className="w-4 h-4" />
                <span>{isSavingMethods ? ("Saving...") : ("Save All Changes")}</span>
              </button>
            </div>
          </div>

          {/* Success Message Banner */}
          {methodsSuccessMsg && (
            <div className="p-4 rounded-2xl bg-emerald-50 border border-emerald-200 text-emerald-900 text-xs font-bold flex items-center gap-2.5 animate-in fade-in">
              <CheckCircle2 className="w-5 h-5 text-emerald-600 shrink-0" />
              <span>{methodsSuccessMsg}</span>
            </div>
          )}

          {/* Channel Cards Grid */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
            {paymentMethods.map((method) => {
              const isSSL = method.method_id === "sslcommerz";
              const isCOD = method.method_id === "cod";
              const isBkash = method.method_id === "bkash";
              const isNagad = method.method_id === "nagad";
              const isRocket = method.method_id === "rocket";

              const brandBorder = isSSL
                ? "border-blue-200"
                : isCOD
                  ? "border-emerald-200"
                  : isBkash
                    ? "border-pink-200"
                    : isNagad
                      ? "border-amber-200"
                      : "border-purple-200";

              const brandBg = isSSL
                ? "bg-blue-50/30"
                : isCOD
                  ? "bg-emerald-50/30"
                  : isBkash
                    ? "bg-pink-50/30"
                    : isNagad
                      ? "bg-amber-50/30"
                      : "bg-purple-50/30";

              return (
                <div
                  key={method.method_id}
                  className={`bg-white rounded-3xl border ${brandBorder} p-6 shadow-xs space-y-4 transition-all ${!method.is_active ? "opacity-70 bg-neutral-50/80" : ""
                    }`}
                >
                  {/* Card Header & Active Toggle */}
                  <div className="flex items-center justify-between pb-3 border-b border-neutral-100">
                    <div className="flex items-center gap-3">
                      <div className="h-10 w-fit px-3 py-1 rounded-xl bg-white border border-neutral-200 shadow-2xs flex items-center justify-center">
                        {isSSL && (
                          <div className="flex items-center gap-1.5 text-blue-900 font-extrabold text-xs">
                            <CreditCard className="w-4 h-4 text-blue-600" />
                            <span>SSLCOMMERZ</span>
                          </div>
                        )}
                        {isCOD && <img src={codImg} alt="COD" className="h-6 w-auto object-contain" />}
                        {isBkash && <img src={bkashImg} alt="bKash" className="h-6 w-auto object-contain" />}
                        {isNagad && <img src={nagadImg} alt="Nagad" className="h-6 w-auto object-contain" />}
                        {isRocket && <img src={rocketImg} alt="Rocket" className="h-6 w-auto object-contain" />}
                      </div>

                      <div>
                        <h3 className="font-bold text-sm text-neutral-900">{method.name}</h3>
                        <span className="text-[10px] font-semibold text-neutral-500 uppercase tracking-wider">
                          Key: <code className="font-mono text-neutral-700">{method.method_id}</code>
                        </span>
                      </div>
                    </div>

                    {/* Toggle Button */}
                    <button
                      type="button"
                      onClick={() => handleToggleMethod(method.method_id)}
                      className={`px-3 py-1.5 rounded-full text-xs font-bold flex items-center gap-1.5 transition-all cursor-pointer ${method.is_active
                          ? "bg-emerald-600 text-white shadow-xs"
                          : "bg-neutral-200 text-neutral-600 hover:bg-neutral-300"
                        }`}
                      title={method.is_active ? "Click to disable from checkout" : "Click to enable on checkout"}
                    >
                      {method.is_active ? (
                        <>
                          <Check className="w-3.5 h-3.5" />
                          <span>{"Active on Checkout"}</span>
                        </>
                      ) : (
                        <>
                          <X className="w-3.5 h-3.5" />
                          <span>{"Hidden / Disabled"}</span>
                        </>
                      )}
                    </button>
                  </div>

                  {/* Settings Specific to MFS (bKash, Nagad, Rocket) */}
                  {(isBkash || isNagad || isRocket) && (
                    <div className="space-y-3.5 text-xs">
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                        {/* Account Type */}
                        <div>
                          <label className="block font-bold text-neutral-700 mb-1">
                            {"Account Type"}
                          </label>
                          <select
                            value={method.account_type || "MERCHANT"}
                            onChange={(e) => handleUpdateMethodField(method.method_id, "account_type", e.target.value)}
                            className="w-full px-3 py-2 rounded-xl border border-neutral-300 bg-white font-semibold text-neutral-800 text-xs focus:border-emerald-600 outline-none"
                          >
                            <option value="MERCHANT">Merchant Payment</option>
                            <option value="PERSONAL">Personal (Send Money)</option>
                            <option value="AGENT">Agent (Cash Out)</option>
                          </select>
                        </div>

                        {/* Wallet / Mobile Number */}
                        <div>
                          <label className="block font-bold text-neutral-700 mb-1">
                            {"Account / Mobile Number"} <span className="text-rose-500">*</span>
                          </label>
                          <input
                            type="text"
                            value={method.number || ""}
                            onChange={(e) => handleUpdateMethodField(method.method_id, "number", e.target.value)}
                            placeholder="01XXXXXXXXX"
                            className="w-full px-3 py-2 rounded-xl border border-neutral-300 font-mono font-bold text-neutral-900 text-xs focus:border-emerald-600 outline-none"
                          />
                        </div>
                      </div>

                      {/* Counter Number (for Merchant) */}
                      {method.account_type === "MERCHANT" && (
                        <div>
                          <label className="block font-bold text-neutral-700 mb-1">
                            {"Counter Number (Optional)"}
                          </label>
                          <input
                            type="text"
                            value={method.counter || "1"}
                            onChange={(e) => handleUpdateMethodField(method.method_id, "counter", e.target.value)}
                            placeholder="1"
                            className="w-full max-w-[120px] px-3 py-2 rounded-xl border border-neutral-300 font-mono text-neutral-900 text-xs focus:border-emerald-600 outline-none"
                          />
                        </div>
                      )}

                      {/* Custom Instructions */}
                      <div>
                        <label className="block font-bold text-neutral-700 mb-1">
                          {"Customer Instructions on Checkout"}
                        </label>
                        <textarea
                          rows={2}
                          value={method.instructions || ""}
                          onChange={(e) => handleUpdateMethodField(method.method_id, "instructions", e.target.value)}
                          placeholder="Enter TrxID after completing Payment or Send Money from mobile app..."
                          className="w-full px-3 py-2 rounded-xl border border-neutral-300 text-xs text-neutral-800 focus:border-emerald-600 outline-none resize-none leading-relaxed"
                        />
                      </div>
                    </div>
                  )}

                  {/* Settings for COD */}
                  {isCOD && (
                    <div className="space-y-2 text-xs">
                      <label className="block font-bold text-neutral-700">
                        {"Delivery Note / Instructions"}
                      </label>
                      <textarea
                        rows={2}
                        value={method.instructions || ""}
                        onChange={(e) => handleUpdateMethodField(method.method_id, "instructions", e.target.value)}
                        className="w-full px-3 py-2 rounded-xl border border-neutral-300 text-xs text-neutral-800 focus:border-emerald-600 outline-none resize-none"
                      />
                    </div>
                  )}

                  {/* Settings for SSLCommerz */}
                  {isSSL && (
                    <div className="p-3.5 rounded-2xl bg-blue-50/60 border border-blue-200/80 space-y-2.5 text-xs">
                      <div className="flex flex-wrap items-center justify-between gap-2 text-blue-950 font-bold">
                        <span>SSLCommerz Automated Multi-Card & MFS</span>
                        <button
                          type="button"
                          onClick={() => {
                            setConfigSuccessMsg("");
                            setIsConfigModalOpen(true);
                          }}
                          className="text-[11px] text-blue-700 underline hover:text-blue-800 cursor-pointer font-bold"
                        >
                          Configure API Credentials →
                        </button>
                      </div>
                      <p className="text-[11px] text-blue-800/90 leading-relaxed">
                        Automated online payment gateway (Visa, MasterCard, bKash, Nagad). When enabled, customers can pay directly via secure OTP-verified gateway.
                      </p>
                      <div className="flex items-center justify-between gap-2 pt-1 border-t border-blue-200/60">
                        <span className="text-[10px] font-mono text-blue-900/75">
                          Store: {gatewayConfig.store_id} &bull; Fee: {gatewayConfig.fee_percent}%
                        </span>
                        <button
                          type="button"
                          onClick={handleTriggerSandboxTest}
                          disabled={isInitiatingTest}
                          className="px-3 py-1.5 rounded-lg bg-blue-600 hover:bg-blue-700 text-white font-bold text-[11px] flex items-center gap-1.5 shadow-2xs transition-all cursor-pointer disabled:opacity-50"
                          title="Launch an interactive test transaction to verify payment workflow"
                        >
                          <Play className="w-3 h-3 fill-current" />
                          <span>
                            {isInitiatingTest
                              ? "Launching..."
                              : gatewayConfig.is_sandbox
                              ? "Test Sandbox Flow"
                              : "Test Live Gateway"}
                          </span>
                        </button>
                      </div>
                    </div>
                  )}
                </div>
              );
            })}
          </div>
      </div>

      {/* SSLCommerz API Credentials & Merchant Configuration Popup Modal */}
      {isConfigModalOpen && (
        <div
          className="fixed inset-0 z-50 overflow-y-auto bg-black/60 backdrop-blur-xs flex items-center justify-center p-4"
          onClick={() => setIsConfigModalOpen(false)}
          role="dialog"
          aria-modal="true"
          aria-labelledby="sslcommerz-config-modal-title"
        >
          <div
            className="bg-white rounded-3xl border border-neutral-200 max-w-2xl w-full p-6 sm:p-8 space-y-6 shadow-2xl animate-in fade-in zoom-in-95 duration-200"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-start justify-between gap-4 border-b border-neutral-100 pb-4">
              <div>
                <h3
                  id="sslcommerz-config-modal-title"
                  className="text-lg font-bold text-neutral-900 flex items-center gap-2"
                >
                  <Sliders className="w-5 h-5 text-blue-600" />
                  <span>{"SSLCommerz Merchant Configuration"}</span>
                </h3>
                <p className="text-xs text-neutral-500 mt-1">
                  {"Configure your official SSLCommerz Store ID, Store Password, and toggle between Sandbox test box and Production live environment."}
                </p>
              </div>
              <button
                type="button"
                onClick={() => setIsConfigModalOpen(false)}
                aria-label="Close SSLCommerz configuration modal"
                className="p-1.5 rounded-full hover:bg-neutral-100 text-neutral-400 hover:text-neutral-700 transition-colors cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {configSuccessMsg && (
              <div className="p-3.5 rounded-xl bg-emerald-50 border border-emerald-200 text-emerald-800 font-bold text-xs flex items-center gap-2">
                <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
                <span>{configSuccessMsg}</span>
              </div>
            )}

            <form onSubmit={handleSaveConfig} className="space-y-4 text-xs">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label htmlFor="ssl-store-id" className="block font-bold text-neutral-700 mb-1">
                    Store ID (Merchant ID)
                  </label>
                  <input
                    id="ssl-store-id"
                    type="text"
                    required
                    value={gatewayConfig.store_id}
                    onChange={(e) => setGatewayConfig({ ...gatewayConfig, store_id: e.target.value })}
                    placeholder="e.g. testbox"
                    className="w-full px-3.5 py-2.5 rounded-xl border border-neutral-300 font-mono text-xs outline-none focus:border-blue-600"
                  />
                  <span className="text-[10px] text-neutral-400 mt-1 block">
                    Default sandbox ID is <code>testbox</code>
                  </span>
                </div>

                <div>
                  <label htmlFor="ssl-store-password" className="block font-bold text-neutral-700 mb-1">
                    Store Password (Secret Key)
                  </label>
                  <input
                    id="ssl-store-password"
                    type="password"
                    required
                    value={gatewayConfig.store_password}
                    onChange={(e) => setGatewayConfig({ ...gatewayConfig, store_password: e.target.value })}
                    placeholder="Store secret password"
                    className="w-full px-3.5 py-2.5 rounded-xl border border-neutral-300 font-mono text-xs outline-none focus:border-blue-600"
                  />
                  <span className="text-[10px] text-neutral-400 mt-1 block">
                    Default sandbox password is <code>qwerty</code>
                  </span>
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 pt-2">
                <div>
                  <label htmlFor="ssl-fee-percent" className="block font-bold text-neutral-700 mb-1">
                    Gateway Processing Fee (%)
                  </label>
                  <input
                    id="ssl-fee-percent"
                    type="number"
                    step="0.1"
                    value={gatewayConfig.fee_percent}
                    onChange={(e) => setGatewayConfig({ ...gatewayConfig, fee_percent: e.target.value })}
                    className="w-full px-3.5 py-2.5 rounded-xl border border-neutral-300 text-xs outline-none focus:border-blue-600"
                  />
                </div>

                <div>
                  <label htmlFor="ssl-gateway-status" className="block font-bold text-neutral-700 mb-1">
                    Gateway Status
                  </label>
                  <select
                    id="ssl-gateway-status"
                    value={gatewayConfig.is_active ? "active" : "disabled"}
                    onChange={(e) => setGatewayConfig({ ...gatewayConfig, is_active: e.target.value === "active" })}
                    className="w-full px-3.5 py-2.5 rounded-xl border border-neutral-300 text-xs outline-none font-bold bg-white"
                  >
                    <option value="active">Active</option>
                    <option value="disabled">Disabled</option>
                  </select>
                </div>
              </div>

              <div className="p-4 rounded-2xl bg-neutral-50 border border-neutral-200 flex items-center justify-between mt-3">
                <div>
                  <div className="font-bold text-neutral-900 text-xs">
                    {"Sandbox Mode"}
                  </div>
                  <div className="text-[11px] text-neutral-500">
                    {"Turn off only when ready to accept real customer money with official live SSLCommerz credentials."}
                  </div>
                </div>
                <label className="relative inline-flex items-center cursor-pointer">
                  <input
                    type="checkbox"
                    checked={gatewayConfig.is_sandbox}
                    onChange={(e) => setGatewayConfig({ ...gatewayConfig, is_sandbox: e.target.checked })}
                    className="sr-only peer"
                  />
                  <div className="w-11 h-6 bg-neutral-200 peer-focus:outline-hidden rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-neutral-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-blue-600"></div>
                </label>
              </div>

              <div className="pt-4 border-t border-neutral-100 flex items-center justify-end gap-2.5">
                <button
                  type="button"
                  onClick={() => setIsConfigModalOpen(false)}
                  className="px-4 py-2.5 rounded-xl border border-neutral-200 hover:bg-neutral-50 text-neutral-700 font-bold text-xs cursor-pointer"
                >
                  {"Close"}
                </button>
                <button
                  type="submit"
                  disabled={isSavingConfig}
                  className="px-6 py-2.5 rounded-xl bg-blue-600 hover:bg-blue-700 text-white font-bold text-xs shadow-md transition-all cursor-pointer disabled:opacity-50"
                >
                  {isSavingConfig ? "Saving..." : "Save Configuration"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

export { AdminPayments };
