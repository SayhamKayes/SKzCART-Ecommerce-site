import { useState, useEffect } from "react";
import {
  X,
  Truck,
  AlertCircle,
  Package,
  Send,
  Loader2
} from "lucide-react";
import { apiClient } from "../../services/api";
import { realtimeService } from "../../services/realtime";
import { useLanguage } from "../../Context/LanguageContext";
import { formatOrderStatusLabel } from "../../utils/orderStatus";
import { CustomModal } from "../common/CustomModal";

const AssignCourierModal = ({
  order,
  onClose,
  onSuccess
}) => {
  const { isEnglish } = useLanguage();
  if (!order) return null;

  const [provider, setProvider] = useState("pathao");
  const [courierConfigs, setCourierConfigs] = useState([]);
  const [isLoadingCouriers, setIsLoadingCouriers] = useState(true);
  const [weightKg, setWeightKg] = useState(0.8);
  const [successModalData, setSuccessModalData] = useState(null);
  const [codAmount, setCodAmount] = useState(
    order.paymentMethod === "COD" ? order.total : 0
  );
  const [instructions, setInstructions] = useState(
    order.address?.orderNote ||
      ("Please call customer before delivery.")
  );
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isSwitchingMode, setIsSwitchingMode] = useState(false);
  const [errorMsg, setErrorMsg] = useState("");

  const baseProviders = [
    {
      id: "pathao",
      name: "Pathao Courier API",
      tagline: "Fastest 24h delivery inside Dhaka City with auto API webhook updates",
      badge: "Top Rated (Dhaka)",
      color: "border-red-500 bg-red-50/20"
    },
    {
      id: "steadfast",
      name: "Steadfast Courier API",
      tagline: "Highest nationwide COD delivery success rate across all 64 districts",
      badge: "Best Nationwide",
      color: "border-emerald-500 bg-emerald-50/20"
    },
    {
      id: "redx",
      name: "RedX Logistics API",
      tagline: "Extensive rural and remote upazila/thana coverage across Bangladesh",
      badge: "Wide Coverage",
      color: "border-orange-500 bg-orange-50/20"
    },
    {
      id: "ecourier",
      name: "eCourier Express API",
      tagline: "Smart OTP verification and premium live parcel tracking",
      badge: "Smart Delivery",
      color: "border-blue-500 bg-blue-50/20"
    }
  ];

  // Fetch real-time courier statuses on modal open
  useEffect(() => {
    let isMounted = true;
    const fetchLiveCouriers = async () => {
      try {
        setIsLoadingCouriers(true);
        const data = await apiClient.getCouriers();
        if (isMounted && Array.isArray(data)) {
          setCourierConfigs(data);
          // Set initial provider to first active provider
          const activeList = data.filter((c) => c.isActive !== false);
          if (activeList.length > 0) {
            setProvider(activeList[0].id);
          }
        }
      } catch (err) {
        console.error("Failed to fetch live courier list:", err);
      } finally {
        if (isMounted) setIsLoadingCouriers(false);
      }
    };
    fetchLiveCouriers();
    return () => {
      isMounted = false;
    };
  }, [order?.id]);

  // Filter only active couriers enabled in Courier Hub
  const availableProviders = baseProviders.filter((p) => {
    if (courierConfigs.length === 0) return true;
    const cfg = courierConfigs.find(
      (c) => c.id.toLowerCase() === p.id.toLowerCase()
    );
    return cfg ? cfg.isActive !== false : true;
  });

  // Automatically fallback to first available provider if selected provider becomes disabled
  useEffect(() => {
    if (availableProviders.length > 0) {
      const isCurrentActive = availableProviders.some((p) => p.id === provider);
      if (!isCurrentActive) {
        setProvider(availableProviders[0].id);
      }
    }
  }, [courierConfigs, availableProviders, provider]);

  const getProviderCfg = (provId) =>
    courierConfigs.find((c) => c.id.toLowerCase() === String(provId || "").toLowerCase());

  const handleEnableSandboxAndRetry = async () => {
    setIsSwitchingMode(true);
    setErrorMsg("");
    try {
      const modeRes = await apiClient.setCourierMode({ mode: "sandbox", provider });
      if (modeRes?.success && Array.isArray(modeRes.couriers)) {
        setCourierConfigs(modeRes.couriers);
        const dispatchRes = await apiClient.assignCourier({
          orderId: order.id,
          provider,
          weightKg,
          codAmount,
          instructions,
          targetStatus: order._targetStatus || "COURIER_CREATED",
        });
        if (dispatchRes.success) {
          realtimeService.broadcast("COURIER_ASSIGNED", {
            orderId: order.id,
            courier: dispatchRes.shipment,
          });
          realtimeService.broadcast("NOTIFICATION_DISPATCHED", dispatchRes);
          setSuccessModalData({
            title: "Parcel Booked in Testing Mode!",
            message: `Courier: ${provider.toUpperCase()} (Sandbox)\nTracking ID: ${dispatchRes.shipment?.trackingId || ""}\nConsignment ID: ${dispatchRes.shipment?.consignmentId || ""}`
          });
          return;
        }
        setErrorMsg(dispatchRes.message || "Failed to book in Sandbox Mode.");
      } else {
        setErrorMsg(modeRes?.message || "Failed to enable Sandbox Testing Mode.");
      }
    } catch {
      setErrorMsg("Unable to switch courier mode. Please try again.");
    } finally {
      setIsSwitchingMode(false);
    }
  };

  const handleToggleSelectedMode = async () => {
    const cfg = getProviderCfg(provider);
    const currentlySandbox = Boolean(cfg?.extraCredentials?.sandboxMode);
    setIsSwitchingMode(true);
    setErrorMsg("");
    try {
      const res = await apiClient.setCourierMode({
        mode: currentlySandbox ? "live" : "sandbox",
        provider,
      });
      if (res?.success && Array.isArray(res.couriers)) {
        setCourierConfigs(res.couriers);
      }
    } catch {
    } finally {
      setIsSwitchingMode(false);
    }
  };

  const handleDispatch = async (e) => {
    e.preventDefault();
    setIsSubmitting(true);
    setErrorMsg("");
    try {
      const res = await apiClient.assignCourier({
        orderId: order.id,
        provider,
        weightKg,
        codAmount,
        instructions,
        targetStatus: order._targetStatus || "COURIER_CREATED",
      });
      if (res.success) {
        realtimeService.broadcast("COURIER_ASSIGNED", {
          orderId: order.id,
          courier: res.shipment,
        });
        realtimeService.broadcast("NOTIFICATION_DISPATCHED", res);
        setSuccessModalData({
          title: "Parcel Booked with Courier!",
          message: `Courier: ${provider.toUpperCase()}\nTracking ID: ${res.shipment?.trackingId || '-'}\nConsignment ID: ${res.shipment?.consignmentId || '-'}`
        });
      } else {
        setErrorMsg(
          res.message ||
            ("Failed to book with courier.")
        );
      }
    } catch (err) {
      console.error(err);
      setErrorMsg(
        "Connection error. Please try again."
      );
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 overflow-y-auto bg-black/60 backdrop-blur-xs flex items-center justify-center p-3 sm:p-4">
      <div className="relative bg-white rounded-3xl max-w-xl w-full overflow-hidden shadow-2xl p-6 sm:p-8 animate-in fade-in zoom-in-95 duration-200">
        {/* Header */}
        <div className="flex justify-between items-center pb-4 border-b border-neutral-200">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-xl bg-emerald-600 flex items-center justify-center text-white">
              <Truck className="w-4 h-4" />
            </div>
            <div>
              <h2 className="text-base font-bold text-neutral-900">
                {"Courier Booking & Dispatch"}
              </h2>
              <p className="text-xs text-neutral-500">
                {"Order:"} #{order.id} |{" "}
                {"Customer:"} {order.address?.customerName} ({order.address?.district})
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 rounded-full hover:bg-neutral-100 text-neutral-400 hover:text-neutral-700 transition-colors cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <form onSubmit={handleDispatch} className="space-y-4 pt-4 text-xs">
          {/* Provider Selection */}
          <div>
            <div className="flex flex-wrap items-center justify-between gap-2 mb-2">
              <label className="block font-bold text-neutral-700">
                {"Select Courier Provider:"}
              </label>
              {availableProviders.length > 0 && (() => {
                const cfg = getProviderCfg(provider);
                const isSandbox = Boolean(cfg?.extraCredentials?.sandboxMode);
                return (
                  <button
                    type="button"
                    disabled={isSwitchingMode}
                    onClick={handleToggleSelectedMode}
                    className={`px-2.5 py-1 rounded-lg text-[10px] font-bold border transition-colors cursor-pointer disabled:opacity-50 ${
                      isSandbox
                        ? "bg-amber-50 text-amber-800 border-amber-300 hover:bg-amber-100"
                        : "bg-emerald-50 text-emerald-700 border-emerald-200 hover:bg-emerald-100"
                    }`}
                  >
                    {isSwitchingMode
                      ? "Switching..."
                      : isSandbox
                        ? "Testing Mode ON (Switch to Live)"
                        : "Live API Active (Switch to Test Mode)"}
                  </button>
                );
              })()}
            </div>
            {isLoadingCouriers ? (
              <div className="py-6 flex items-center justify-center gap-2 text-neutral-400">
                <Loader2 className="w-4 h-4 animate-spin text-emerald-600" />
                <span className="text-xs">{"Loading active couriers..."}</span>
              </div>
            ) : availableProviders.length === 0 ? (
              <div className="p-4 rounded-2xl bg-amber-50 border border-amber-200 text-amber-800 text-xs flex items-start gap-2.5">
                <AlertCircle className="w-5 h-5 text-amber-600 shrink-0 mt-0.5" />
                <div>
                  <p className="font-bold">
                    {"No Active Couriers Available"}
                  </p>
                  <p className="text-[11px] text-amber-700 mt-0.5">
                    {"All couriers are currently disabled in Courier Hub. Please enable at least one courier to book shipments."}
                  </p>
                </div>
              </div>
            ) : (
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                {availableProviders.map((p) => {
                  const cfg = getProviderCfg(p.id);
                  const isSandbox = Boolean(cfg?.extraCredentials?.sandboxMode);
                  const hasKey = Boolean(cfg?.apiKey && String(cfg.apiKey).trim());
                  return (
                    <div
                      key={p.id}
                      onClick={() => {
                        setProvider(p.id);
                        setErrorMsg("");
                      }}
                      className={`p-3 rounded-2xl border-2 cursor-pointer transition-all ${
                        provider === p.id
                          ? `${p.color} border-current shadow-xs`
                          : "border-neutral-200 hover:border-neutral-300"
                      }`}
                    >
                      <div className="flex justify-between items-center gap-1 mb-1">
                        <span className="font-bold text-neutral-900">{p.name}</span>
                        <span
                          className={`text-[10px] font-bold px-1.5 py-0.5 rounded shrink-0 ${
                            isSandbox
                              ? "bg-amber-100 text-amber-800"
                              : hasKey
                                ? "bg-emerald-100 text-emerald-700"
                                : "bg-neutral-100 text-neutral-600"
                          }`}
                        >
                          {isSandbox ? "Test Mode" : hasKey ? "Live Ready" : p.badge}
                        </span>
                      </div>
                      <p className="text-[11px] text-neutral-500 line-clamp-2 leading-relaxed">
                        {p.tagline}
                      </p>
                    </div>
                  );
                })}
              </div>
            )}
          </div>

          {/* Weight & COD */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label className="block font-bold text-neutral-700 mb-1">
                {"Estimated Parcel Weight (KG)"}
              </label>
              <div className="relative">
                <Package className="w-4 h-4 text-neutral-400 absolute left-3 top-1/2 -translate-y-1/2" />
                <input
                  type="number"
                  step="0.1"
                  min="0.1"
                  value={weightKg}
                  onChange={(e) => setWeightKg(parseFloat(e.target.value) || 0.5)}
                  className="w-full pl-9 pr-3 py-2 bg-neutral-50 rounded-xl border border-neutral-300 focus:bg-white focus:border-emerald-600 focus:outline-hidden"
                />
              </div>
            </div>

            <div>
              <label className="block font-bold text-neutral-700 mb-1">
                {"Cash to Collect (COD)"}
              </label>
              <input
                type="number"
                value={codAmount}
                onChange={(e) => setCodAmount(parseFloat(e.target.value) || 0)}
                className="w-full px-3 py-2 bg-neutral-50 rounded-xl border border-neutral-300 focus:bg-white focus:border-emerald-600 focus:outline-hidden font-bold"
              />
              <span className="text-[10px] text-neutral-400">
                {order.paymentMethod === "COD"
                  ? "Rider will collect this cash upon delivery"
                  : "Prepaid online (৳0 to collect)"}
              </span>
            </div>
          </div>

          {/* Instructions */}
          <div>
            <label className="block font-bold text-neutral-700 mb-1">
              {"Delivery Instructions (for rider)"}
            </label>
            <input
              type="text"
              value={instructions}
              onChange={(e) => setInstructions(e.target.value)}
              className="w-full px-3 py-2 bg-neutral-50 rounded-xl border border-neutral-300 focus:bg-white focus:border-emerald-600 focus:outline-hidden"
            />
          </div>

          {errorMsg && (
            <div className="p-3 bg-rose-50 border border-rose-200 rounded-xl text-xs text-rose-700 space-y-2">
              <div className="flex items-start gap-2">
                <AlertCircle className="w-4 h-4 text-rose-600 shrink-0 mt-0.5" />
                <span>{errorMsg}</span>
              </div>
              {errorMsg.toLowerCase().includes("credentials") && (
                <div className="flex flex-wrap items-center justify-between gap-2 pt-1.5 border-t border-rose-200/70">
                  <span className="text-[11px] text-rose-600">
                    Want to test booking without live merchant API keys right now?
                  </span>
                  <button
                    type="button"
                    disabled={isSwitchingMode}
                    onClick={handleEnableSandboxAndRetry}
                    className="px-3 py-1.5 rounded-lg bg-amber-600 hover:bg-amber-700 text-white text-[11px] font-bold transition-colors cursor-pointer disabled:opacity-50 shrink-0"
                  >
                    {isSwitchingMode ? "Enabling Testing Mode..." : "Enable Testing Mode & Book Now"}
                  </button>
                </div>
              )}
            </div>
          )}

          {/* Bottom CTA */}
          <div className="pt-3 border-t border-neutral-200 flex justify-end gap-2">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2.5 rounded-xl border border-neutral-300 hover:bg-neutral-50 font-semibold text-neutral-700 transition-colors cursor-pointer"
            >
              {"Cancel"}
            </button>
            <button
              type="submit"
              disabled={isSubmitting || isLoadingCouriers || availableProviders.length === 0}
              className="px-6 py-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-700 active:bg-emerald-800 text-white font-bold flex items-center gap-2 transition-colors shadow-md disabled:opacity-50 disabled:cursor-not-allowed cursor-pointer"
            >
              <Send className="w-4 h-4" />
              <span>
                {isSubmitting
                  ? "Booking..."
                  : "Book with Courier"}
              </span>
            </button>
          </div>
        </form>
      </div>

      <CustomModal
        isOpen={Boolean(successModalData)}
        type="success"
        title={successModalData?.title || ""}
        message={successModalData?.message || ""}
        confirmText={"OK"}
        onClose={() => {
          setSuccessModalData(null);
          onSuccess();
          onClose();
        }}
      />
    </div>
  );
};

export { AssignCourierModal };
