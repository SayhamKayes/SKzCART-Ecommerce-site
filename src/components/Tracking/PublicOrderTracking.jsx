import React, { useState, useEffect } from "react";
import {
  Search,
  Truck,
  Clock,
  AlertCircle,
  PhoneCall,
  User,
  Package,
  CheckCircle2,
  ArrowLeft
} from "lucide-react";
import { formatBDT, formatBDTDateTime } from "../../utils/bangladesh";
import { apiClient } from "../../services/api";
import { useLanguage } from "../../Context/LanguageContext";
import { useThemeConfig } from "../frontPanel/FrontPanelContext";
import { RateUsForm } from "../Reviews/RateUsForm";
import { DEFAULT_PRODUCT_PLACEHOLDER, handleProductImageError } from "../../utils/productImage";

const getOrderStages = () => [
  { status: "PENDING", label: "Order Placed", icon: "📝" },
  { status: "CONFIRMED", label: "Confirmed", icon: "✅" },
  { status: "COURIER_CREATED", label: "Courier Booked", icon: "📦" },
  { status: "PICKED_UP", label: "Picked Up", icon: "🛵" },
  { status: "IN_TRANSIT", label: "In Transit", icon: "🚚" },
  { status: "OUT_FOR_DELIVERY", label: "Out for Delivery", icon: "🏃" },
  { status: "DELIVERED", label: "Delivered", icon: "🎉" }
];

const getStatusLabel = (status) => {
  switch (status) {
    case "PENDING":
      return "Pending";
    case "CONFIRMED":
      return "Confirmed";
    case "COURIER_CREATED":
      return "Courier Created";
    case "PICKED_UP":
      return "Picked Up";
    case "IN_TRANSIT":
      return "In Transit";
    case "OUT_FOR_DELIVERY":
      return "Out for Delivery";
    case "DELIVERED":
      return "Delivered";
    case "CANCELLED":
      return "Cancelled";
    case "RETURNED":
      return "Returned";
    default:
      return status || "Processing";
  }
};

const PublicOrderTracking = ({
  initialOrderId = "",
  initialPhone = "",
  autoSearch = false,
  activeOrders = [],
  allUserOrders = [],
  currentUser = null
}) => {
  const { isEnglish, t } = useLanguage();
  const { themeConfig } = useThemeConfig();
  const activeHotline = themeConfig?.shop?.hotline || themeConfig?.header?.hotline || "09612-345678";
  const [orderIdInput, setOrderIdInput] = useState(initialOrderId);
  const [phoneInput, setPhoneInput] = useState(initialPhone);
  const [selectedDropdownOrderId, setSelectedDropdownOrderId] = useState(initialOrderId || "");
  const [isLoading, setIsLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState("");
  const [trackedOrder, setTrackedOrder] = useState(null);

  const stages = getOrderStages(isEnglish);

  // Compute pending/processing orders list
  const pendingOrders =
    activeOrders && activeOrders.length > 0
      ? activeOrders
      : (allUserOrders || []).filter((o) => !["DELIVERED", "CANCELLED", "RETURNED"].includes(o.status));

  const formatOrderForTracking = (local) => {
    if (!local) return null;
    const rawPhone = local.address?.phone || phoneInput || currentUser?.phone || "";
    const maskedPhone =
      rawPhone.length >= 6 ? `${rawPhone.slice(0, 3)}*****${rawPhone.slice(-3)}` : rawPhone || "017*****000";
    const courierObj =
      local.courier && typeof local.courier === "object" && Object.keys(local.courier).length > 0
        ? local.courier
        : null;

    return {
      id: local.id,
      createdAt: local.createdAt || ("Today"),
      status: local.status || "PENDING",
      statusHistory:
        Array.isArray(local.statusHistory) && local.statusHistory.length > 0
          ? local.statusHistory
          : [
            {
              status: local.status || "PENDING",
              timestamp: local.createdAt || ("Today"),
              note: "Order processing & live tracking initiated"
            }
          ],
      total: local.total || 0,
      paymentMethod: local.paymentMethod || "COD",
      paymentStatus: local.paymentStatus || "UNPAID",
      courier: courierObj,
      items: Array.isArray(local.items) ? local.items : [],
      customerName: local.address?.customerName || local.customerName || currentUser?.name || currentUser?.fullName || '',
      phone: rawPhone,
      address: local.address || {},
      addressSummary: {
        customerName: local.address?.customerName || currentUser?.name || ("Customer"),
        maskedPhone,
        district: local.address?.district || currentUser?.district || "Dhaka",
        thana: local.address?.thana || currentUser?.thana || "Mirpur"
      }
    };
  };

  const executeTrack = async (orderId, phone, directOrderObj = null) => {
    const targetOrderId = (orderId || orderIdInput || "").trim();
    const targetPhone = (phone || phoneInput || directOrderObj?.address?.phone || currentUser?.phone || "").trim();

    if (!targetOrderId) return;

    setIsLoading(true);
    setErrorMsg("");

    if (directOrderObj) {
      setTrackedOrder(formatOrderForTracking(directOrderObj));
    }

    try {
      const res = await apiClient.trackOrder(targetOrderId, targetPhone);
      if (res && res.success && res.order) {
        setTrackedOrder(res.order);
        return;
      }

      // Check matched local order
      const matchedLocal =
        directOrderObj ||
        (pendingOrders || []).find((o) => o.id.toLowerCase() === targetOrderId.toLowerCase()) ||
        (allUserOrders || []).find((o) => o.id.toLowerCase() === targetOrderId.toLowerCase());

      if (matchedLocal) {
        setTrackedOrder(formatOrderForTracking(matchedLocal));
      } else {
        setErrorMsg(
          res?.message ||
          ("No order found. Please check your order ID.")
        );
      }
    } catch (err) {
      console.warn("API trackOrder error, using fallback:", err);
      const matchedLocal =
        directOrderObj ||
        (pendingOrders || []).find((o) => o.id.toLowerCase() === targetOrderId.toLowerCase()) ||
        (allUserOrders || []).find((o) => o.id.toLowerCase() === targetOrderId.toLowerCase());

      if (matchedLocal) {
        setTrackedOrder(formatOrderForTracking(matchedLocal));
      } else {
        setErrorMsg(
          "Could not establish server connection. Please try again."
        );
      }
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    const targetId = (initialOrderId || (pendingOrders.length > 0 ? pendingOrders[0].id : "")).trim();
    const targetPhone = (
      initialPhone ||
      (pendingOrders.length > 0 ? pendingOrders[0]?.address?.phone : "") ||
      phoneInput ||
      currentUser?.phone ||
      ""
    ).trim();

    if (targetId) {
      setOrderIdInput(targetId);
      setSelectedDropdownOrderId(targetId);
    }
    if (targetPhone) {
      setPhoneInput(targetPhone);
    }
    if (targetId && (targetPhone || autoSearch || initialOrderId)) {
      const directObj =
        (pendingOrders || []).find((o) => o.id.toLowerCase() === targetId.toLowerCase()) ||
        (allUserOrders || []).find((o) => o.id.toLowerCase() === targetId.toLowerCase());
      executeTrack(targetId, targetPhone, directObj);
    }
  }, [initialOrderId, initialPhone, pendingOrders.length, autoSearch]);

  const handleTrack = async (e) => {
    if (e) e.preventDefault();
    if (!orderIdInput.trim()) {
      setErrorMsg(
        "Please provide your Order ID (e.g. BD-849201)."
      );
      return;
    }
    executeTrack(orderIdInput, phoneInput);
  };

  const getStageIndex = (status) => {
    switch (status) {
      case "PENDING":
        return 0;
      case "CONFIRMED":
        return 1;
      case "COURIER_CREATED":
        return 2;
      case "PICKED_UP":
        return 3;
      case "IN_TRANSIT":
        return 4;
      case "OUT_FOR_DELIVERY":
        return 5;
      case "DELIVERED":
        return 6;
      default:
        return 0;
    }
  };

  const hasCourier = Boolean(
    trackedOrder?.courier &&
    (trackedOrder.courier.trackingId || trackedOrder.courier.consignmentId || trackedOrder.courier.provider)
  );

  return (
    <div className="bg-neutral-50 min-h-screen py-8 px-4 sm:px-6 font-sans">
      <div className="max-w-3xl mx-auto space-y-6">
        {/* Top utility row: Return to shop + Language selector */}
        <div className="flex items-center justify-between pb-2">
          <a
            href="/"
            className="inline-flex items-center gap-1.5 text-xs font-semibold text-neutral-600 hover:text-emerald-700 transition-colors"
          >
            <ArrowLeft className="w-4 h-4" />
            <span>{"Back to Shop"}</span>
          </a>
        </div>

        {/* Header Title */}
        <div className="text-center space-y-2">
          <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-emerald-100 text-emerald-800 text-xs font-bold">
            <Truck className="w-3.5 h-3.5" />
            <span>{"Live Parcel Tracking across 64 Districts"}</span>
          </div>
          <h1 className="text-2xl sm:text-3xl font-black text-neutral-900">
            {"Track Your Order"}
          </h1>
          <p className="text-xs sm:text-sm text-neutral-500 max-w-md mx-auto">
            {"No password needed. Simply enter your Order ID and phone number to view live status."}
          </p>
        </div>

        {/* Input Card */}
        <div className="bg-white rounded-3xl p-6 sm:p-8 border border-neutral-200 shadow-sm">
          <form onSubmit={handleTrack} className="space-y-4">
            {pendingOrders && pendingOrders.length > 0 && (
              <div className="p-4 rounded-2xl bg-gradient-to-r from-emerald-50 via-teal-50 to-emerald-50 border border-emerald-200">
                <div className="flex flex-wrap items-center justify-between gap-1 mb-2">
                  <label className="text-xs font-black text-emerald-950 flex items-center gap-1.5">
                    <Package className="w-4 h-4 text-emerald-600" />
                    <span>
                      {`Active / Pending Orders (${pendingOrders.length} active):`}
                    </span>
                  </label>
                  <span className="text-[11px] text-emerald-700 font-medium">
                    {"Select directly from dropdown"}
                  </span>
                </div>
                <select
                  value={selectedDropdownOrderId}
                  onChange={(e) => {
                    const ordId = e.target.value;
                    setSelectedDropdownOrderId(ordId);
                    if (ordId) {
                      const found =
                        (pendingOrders || []).find((o) => o.id === ordId) ||
                        (allUserOrders || []).find((o) => o.id === ordId);
                      if (found) {
                        setOrderIdInput(found.id);
                        const ph = found.address?.phone || initialPhone || phoneInput || currentUser?.phone || "";
                        setPhoneInput(ph);
                        executeTrack(found.id, ph, found);
                      }
                    }
                  }}
                  className="w-full px-3.5 py-2.5 bg-white rounded-xl border border-emerald-300 text-xs font-semibold text-neutral-800 focus:outline-none focus:ring-2 focus:ring-emerald-500 shadow-xs cursor-pointer"
                >
                  <option value="">
                    {"-- Select your active parcel --"}
                  </option>
                  {pendingOrders.map((ord) => {
                    const itemName =
                      Array.isArray(ord.items) && ord.items[0]?.name ? ` (${ord.items[0].name.slice(0, 24)}...)` : "";
                    return (
                      <option key={ord.id} value={ord.id}>
                        #{ord.id} — {getStatusLabel(ord.status, isEnglish)} — {formatBDT(ord.total)}
                        {itemName}
                      </option>
                    );
                  })}
                </select>
                <p className="text-[11px] text-emerald-700 mt-1.5 flex items-center gap-1">
                  <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600 shrink-0" />
                  <span>
                    {"Selecting an order immediately loads live parcel delivery status below."}
                  </span>
                </p>
              </div>
            )}

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div>
                <label className="block text-xs font-bold text-neutral-700 mb-1">
                  {"Order ID"}
                </label>
                <input
                  type="text"
                  placeholder={"e.g. BD-849201"}
                  value={orderIdInput}
                  onChange={(e) => setOrderIdInput(e.target.value)}
                  className="w-full px-4 py-2.5 bg-neutral-50 rounded-xl border border-neutral-300 focus:bg-white focus:border-emerald-600 focus:outline-hidden text-sm uppercase font-mono"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-neutral-700 mb-1">
                  {"Mobile Number"}
                </label>
                <input
                  type="tel"
                  placeholder="017XXXXXXXX"
                  value={phoneInput}
                  onChange={(e) => setPhoneInput(e.target.value)}
                  className="w-full px-4 py-2.5 bg-neutral-50 rounded-xl border border-neutral-300 focus:bg-white focus:border-emerald-600 focus:outline-hidden text-sm"
                />
              </div>
            </div>

            {errorMsg && (
              <div className="p-3 bg-rose-50 border border-rose-200 rounded-xl text-xs text-rose-700 flex items-center gap-2">
                <AlertCircle className="w-4 h-4 shrink-0 text-rose-500" />
                <span>{errorMsg}</span>
              </div>
            )}

            <button
              type="submit"
              disabled={isLoading}
              className="w-full py-3.5 px-4 rounded-xl bg-neutral-900 hover:bg-neutral-800 text-white font-bold text-xs sm:text-sm flex items-center justify-center gap-2 transition-colors shadow-md disabled:opacity-50 cursor-pointer"
            >
              {isLoading ? (
                <span>{"Searching..."}</span>
              ) : (
                <>
                  <Search className="w-4 h-4 text-emerald-400" />
                  <span>{"Track Parcel Status"}</span>
                </>
              )}
            </button>
          </form>
        </div>

        {/* Tracking Details View */}
        {trackedOrder && (
          <div className="bg-white rounded-3xl p-6 sm:p-8 border border-neutral-200 shadow-md space-y-6 animate-in fade-in slide-in-from-bottom-2 duration-300">
            {/* Top Bar Status */}
            <div className="flex flex-wrap items-center justify-between gap-4 pb-4 border-b border-neutral-200">
              <div>
                <span className="text-xs text-neutral-400 font-mono">
                  {"Order #"}{trackedOrder.id}
                </span>
                <h2 className="text-lg font-bold text-neutral-900 mt-0.5">
                  {"Customer: "}
                  {trackedOrder.addressSummary?.customerName ||
                    trackedOrder.address?.customerName ||
                    ("Customer")}
                </h2>
                <p className="text-xs text-neutral-500">
                  {"Phone: "}
                  {trackedOrder.addressSummary?.maskedPhone || trackedOrder.address?.phone || "N/A"} |{" "}
                  {"Location: "}
                  {trackedOrder.addressSummary?.thana || trackedOrder.address?.thana || ""}
                  {trackedOrder.addressSummary?.district || trackedOrder.address?.district
                    ? `, ${trackedOrder.addressSummary?.district || trackedOrder.address?.district}`
                    : ""}
                </p>
              </div>

              <div className="text-right">
                <span className="text-xs text-neutral-400 block">
                  {"Current Status"}
                </span>
                <span className="inline-block mt-1 px-3 py-1 rounded-full text-xs font-bold uppercase tracking-wider bg-emerald-100 text-emerald-800">
                  {getStatusLabel(trackedOrder.status, isEnglish)}
                </span>
              </div>
            </div>

            {/* 7-Step Progress Timeline */}
            <div>
              <h3 className="text-xs font-bold uppercase tracking-wider text-neutral-400 mb-4">
                {"Delivery Milestones:"}
              </h3>

              <div className="grid grid-cols-2 sm:grid-cols-4 md:grid-cols-7 gap-2">
                {stages.map((stg, idx) => {
                  const currentIdx = getStageIndex(trackedOrder.status);
                  const isDone = idx <= currentIdx;
                  const isCurrent = idx === currentIdx;
                  return (
                    <div
                      key={stg.status}
                      className={`p-2.5 rounded-xl border text-center transition-all ${isCurrent
                          ? "border-emerald-600 bg-emerald-50 text-emerald-950 font-bold shadow-xs"
                          : isDone
                            ? "border-neutral-200 bg-neutral-50 text-neutral-700"
                            : "border-dashed border-neutral-200 text-neutral-400 opacity-60"
                        }`}
                    >
                      <div className="text-xl mb-1">{stg.icon}</div>
                      <div className="text-[11px] leading-tight">{stg.label}</div>
                      {isCurrent && (
                        <span className="inline-block mt-1 w-2 h-2 rounded-full bg-emerald-600 animate-ping" />
                      )}
                    </div>
                  );
                })}
              </div>
            </div>

            {/* Rate Us Review Section: Automatically visible upon DELIVERED status */}
            {(trackedOrder.status === 'DELIVERED' || trackedOrder.status === 'delivered') && (
              <RateUsForm
                order={trackedOrder}
                currentUser={currentUser}
                isEnglish={isEnglish}
              />
            )}

            {/* Courier Consignment Box (If Assigned) */}
            {hasCourier ? (
              <div className="p-4 sm:p-5 rounded-2xl bg-neutral-900 text-white space-y-3">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <Truck className="w-5 h-5 text-emerald-400" />
                    <div>
                      <h4 className="text-sm font-bold capitalize">
                        {trackedOrder.courier?.provider || ("Courier")} Logistics
                      </h4>
                      <p className="text-[11px] text-neutral-400">
                        {"Consignment ID: "}
                        {trackedOrder.courier?.consignmentId || ("Processing")}
                      </p>
                    </div>
                  </div>
                  {trackedOrder.courier?.trackingId && (
                    <span className="text-xs font-mono font-bold bg-neutral-800 text-emerald-300 px-2.5 py-1 rounded-lg border border-neutral-700">
                      {trackedOrder.courier.trackingId}
                    </span>
                  )}
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 pt-3 border-t border-neutral-800 text-xs">
                  <div>
                    <span className="text-neutral-400 block text-[11px]">
                      {"Courier Status"}
                    </span>
                    <span className="font-semibold text-emerald-400">
                      {trackedOrder.courier?.courierStatus || ("Booked")}
                    </span>
                  </div>

                  <div>
                    <span className="text-neutral-400 block text-[11px]">
                      {"Sorting Branch / Hub"}
                    </span>
                    <span className="font-semibold">
                      {trackedOrder.courier?.hubLocation || ("Local Sorting Hub")}
                    </span>
                  </div>

                  <div>
                    <span className="text-neutral-400 block text-[11px]">
                      {"Cash on Delivery (COD)"}
                    </span>
                    <span className="font-bold text-amber-400">
                      {formatBDT(trackedOrder.courier?.codAmount || trackedOrder.total)}
                    </span>
                  </div>
                </div>

                {trackedOrder.courier?.assignedRiderName && (
                  <div className="p-2.5 rounded-xl bg-neutral-800/80 border border-neutral-700 flex items-center justify-between text-xs">
                    <div className="flex items-center gap-2">
                      <User className="w-4 h-4 text-emerald-400" />
                      <span>
                        {"Delivery Rider: "}
                        <strong>{trackedOrder.courier.assignedRiderName}</strong>
                      </span>
                    </div>
                    {trackedOrder.courier.assignedRiderPhone && (
                      <a
                        href={`tel:${trackedOrder.courier.assignedRiderPhone}`}
                        className="flex items-center gap-1 text-emerald-400 hover:underline font-mono"
                      >
                        <PhoneCall className="w-3.5 h-3.5" />
                        <span>{trackedOrder.courier.assignedRiderPhone}</span>
                      </a>
                    )}
                  </div>
                )}
              </div>
            ) : (
              <div className="p-4 rounded-2xl bg-amber-50 border border-amber-200 text-xs text-amber-800 flex items-center gap-2">
                <Clock className="w-4 h-4 text-amber-600 shrink-0" />
                <span>
                  {"Your order is currently at the warehouse packing line. Courier tracking code will appear here once dispatched."}
                </span>
              </div>
            )}

            {/* Status History Timeline */}
            <div>
              <h3 className="text-xs font-bold uppercase tracking-wider text-neutral-400 mb-3">
                {"Order Timeline & History:"}
              </h3>
              <div className="space-y-3 relative before:absolute before:left-3 before:top-2 before:bottom-2 before:w-0.5 before:bg-neutral-200">
                {(Array.isArray(trackedOrder.statusHistory) && trackedOrder.statusHistory.length > 0
                  ? trackedOrder.statusHistory
                  : [
                    {
                      status: trackedOrder.status || "PENDING",
                      timestamp: trackedOrder.createdAt || ("Today"),
                      note: "Order processing and tracking active"
                    }
                  ]
                ).map((item, i) => (
                  <div key={i} className="flex items-start gap-4 relative text-xs">
                    <div className="w-6 h-6 rounded-full bg-emerald-600 text-white flex items-center justify-center font-bold text-[10px] shrink-0 z-10 shadow-xs">
                      ✓
                    </div>
                    <div className="flex-1 p-3 bg-neutral-50 rounded-xl border border-neutral-200">
                      <div className="flex justify-between items-center mb-0.5">
                        <span className="font-bold text-neutral-900">
                          {getStatusLabel(item.status, isEnglish) || item.status}
                        </span>
                        <span className="text-[10px] text-neutral-400 font-mono">{formatBDTDateTime(item.timestamp, isEnglish)}</span>
                      </div>
                      <p className="text-neutral-600">{item.note}</p>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* Ordered Items Summary */}
            <div className="pt-4 border-t border-neutral-200">
              <h3 className="text-xs font-bold uppercase tracking-wider text-neutral-400 mb-3">
                {"Ordered Items:"}
              </h3>
              <div className="space-y-2">
                {(Array.isArray(trackedOrder.items) ? trackedOrder.items : []).map((it, idx) => (
                  <div
                    key={it.id || idx}
                    className="flex items-center justify-between p-2.5 rounded-xl bg-neutral-50 border border-neutral-200 text-xs"
                  >
                    <div className="flex items-center gap-3">
                      <img
                        src={it.image || DEFAULT_PRODUCT_PLACEHOLDER}
                        alt={it.name || "Item"}
                        className="w-10 h-10 rounded-lg object-cover bg-white"
                        referrerPolicy="no-referrer"
                        onError={handleProductImageError}
                      />
                      <div>
                        <span className="font-semibold text-neutral-900 block">{it.name || "Item"}</span>
                        {it.variant && <span className="text-[11px] text-emerald-700">{it.variant}</span>}
                      </div>
                    </div>
                    <div className="text-right">
                      <span className="font-bold text-neutral-900">
                        {formatBDT((it.price || 0) * (it.quantity || 1))}
                      </span>
                      <span className="text-[11px] text-neutral-400 block">
                        {"Qty: "}{it.quantity || 1}
                      </span>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* Helpline Footer */}
            <div className="p-3 bg-emerald-50 rounded-xl border border-emerald-200 flex flex-wrap items-center justify-between gap-2 text-xs text-emerald-900">
              <span>
                {"For any delivery queries or assistance, call our helpline:"}
              </span>
              <a href={`tel:${activeHotline}`} className="font-bold hover:underline flex items-center gap-1 text-emerald-800">
                <PhoneCall className="w-3.5 h-3.5" />
                <span>{activeHotline}</span>
              </a>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export { PublicOrderTracking };
