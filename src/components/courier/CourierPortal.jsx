import { useState, useEffect, useCallback } from "react";
import {
  Truck,
  Package,
  PhoneCall,
  MapPin,
  CheckCircle2,
  Clock,
  AlertCircle,
  RefreshCw,
  Search,
  ArrowLeft,
  UserCheck,
  RotateCcw,
  Navigation,
  LogOut
} from "lucide-react";
import { formatBDT, formatBDTDateTime } from "../../utils/bangladesh";
import { formatOrderStatusLabel } from "../../utils/orderStatus";
import { apiClient } from "../../services/api";
import { realtimeService } from "../../services/realtime";
import { CustomModal } from "../common/CustomModal";
import { useLanguage } from "../../Context/LanguageContext";
import { useThemeConfig } from "../frontPanel/FrontPanelContext";
import { Courier_Header } from "../Header";

const CourierPortal = ({
  orders,
  onRefresh,
  onBackToStore
}) => {
  const { themeConfig } = useThemeConfig();
  const shopName = themeConfig?.shop?.name || "AmarDokan";
  const { isEnglish, t } = useLanguage();
  const [activeTab, setActiveTab] = useState("ALL");
  const [selectedProviderFilter, setSelectedProviderFilter] = useState("ALL");
  const [isRiderAuthenticated, setIsRiderAuthenticated] = useState(false);
  const [isVerifyingSession, setIsVerifyingSession] = useState(true);
  const [ridersList, setRidersList] = useState([]);
  const [isLoadingRiders, setIsLoadingRiders] = useState(true);
  const [selectedRiderId, setSelectedRiderId] = useState("");
  const [manualUsername, setManualUsername] = useState("");
  const [riderPin, setRiderPin] = useState("");
  const [isLoggingIn, setIsLoggingIn] = useState(false);
  const [authError, setAuthError] = useState("");
  const [authenticatedRider, setAuthenticatedRider] = useState(null);
  const [riderName, setRiderName] = useState("");
  const [updatingOrderId, setUpdatingOrderId] = useState(null);
  const [actionSuccessMsg, setActionSuccessMsg] = useState("");
  const [searchQuery, setSearchQuery] = useState("");
  const [statusErrorModal, setStatusErrorModal] = useState(null);

  const loadRiders = useCallback(async () => {
    setIsLoadingRiders(true);
    try {
      const res = await apiClient.getCourierRiders();
      const list = Array.isArray(res?.riders) ? res.riders : [];
      setRidersList(list);
      if (list.length > 0) {
        setSelectedRiderId((prev) => (prev && list.some((r) => r.id === prev) ? prev : list[0].id));
      }
    } catch {
      setRidersList([]);
    } finally {
      setIsLoadingRiders(false);
    }
  }, []);

  useEffect(() => {
    loadRiders();
  }, [loadRiders]);

  useEffect(() => {
    let active = true;
    const verifyExistingSession = async () => {
      try {
        const riderToken = sessionStorage.getItem("amardokan_rider_token");
        if (!riderToken) {
          if (active) {
            setIsRiderAuthenticated(false);
            setIsVerifyingSession(false);
          }
          return;
        }
        const res = await apiClient.verifyStaffToken(riderToken, "rider");
        if (active) {
          if (res?.success && res?.valid && res?.user) {
            const label = res.user.notes ? `${res.user.name} (${res.user.notes})` : res.user.name;
            setAuthenticatedRider(res.user);
            setRiderName(label);
            sessionStorage.setItem("amardokan_rider_auth", "true");
            sessionStorage.setItem("amardokan_rider_user", JSON.stringify(res.user));
            setIsRiderAuthenticated(true);
          } else {
            sessionStorage.removeItem("amardokan_rider_auth");
            sessionStorage.removeItem("amardokan_rider_token");
            sessionStorage.removeItem("amardokan_rider_user");
            setIsRiderAuthenticated(false);
          }
          setIsVerifyingSession(false);
        }
      } catch {
        if (active) {
          setIsRiderAuthenticated(false);
          setIsVerifyingSession(false);
        }
      }
    };
    verifyExistingSession();
    return () => { active = false; };
  }, []);

  const handleRiderLogin = async (e) => {
    e.preventDefault();
    setAuthError("");
    setIsLoggingIn(true);
    try {
      const useManual = selectedRiderId === "__manual__" || ridersList.length === 0;
      const res = await apiClient.courierRiderLogin({
        riderId: useManual ? "" : selectedRiderId,
        username: useManual ? manualUsername.trim().toLowerCase() : "",
        pin: riderPin.trim(),
      });
      if (res?.success && res?.rider) {
        const r = res.rider;
        const displayLabel = r.notes ? `${r.name} (${r.notes})` : r.name;
        setAuthenticatedRider(r);
        setRiderName(displayLabel);
        setRiderPin("");
        setIsRiderAuthenticated(true);
      } else {
        setAuthError(res?.message || "Invalid Rider credentials or PIN. Please check with Admin.");
      }
    } catch {
      setAuthError("Unable to reach authentication server. Please check connection.");
    } finally {
      setIsLoggingIn(false);
    }
  };

  const handleRiderLogout = () => {
    try {
      sessionStorage.removeItem("amardokan_rider_auth");
      sessionStorage.removeItem("amardokan_rider_token");
      sessionStorage.removeItem("amardokan_rider_user");
    } catch {}
    setAuthenticatedRider(null);
    setRiderName("");
    setIsRiderAuthenticated(false);
  };
  const courierOrders = orders.filter((o) => o.courier || ["PENDING", "CONFIRMED", "COURIER_CREATED", "PICKED_UP", "IN_TRANSIT", "OUT_FOR_DELIVERY", "DELIVERED"].includes(o.status));
  const filteredOrders = courierOrders.filter((order) => {
    if (activeTab === "READY_PICKUP" && order.status !== "COURIER_CREATED" && order.status !== "CONFIRMED") return false;
    if (activeTab === "IN_HAND" && order.status !== "PICKED_UP" && order.status !== "IN_TRANSIT") return false;
    if (activeTab === "OUT_FOR_DELIVERY" && order.status !== "OUT_FOR_DELIVERY") return false;
    if (activeTab === "DELIVERED" && order.status !== "DELIVERED") return false;
    if (selectedProviderFilter !== "ALL") {
      const p = (order.courier?.provider || "").toLowerCase();
      if (!p.includes(selectedProviderFilter.toLowerCase())) return false;
    }
    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase();
      const matchId = order.id.toLowerCase().includes(q);
      const matchCustomer = order.address?.customerName?.toLowerCase().includes(q);
      const matchPhone = order.address?.phone?.includes(q);
      const matchTracking = order.courier?.trackingId?.toLowerCase().includes(q);
      const matchConsignment = order.courier?.consignmentId?.toLowerCase().includes(q);
      return matchId || matchCustomer || matchPhone || matchTracking || matchConsignment;
    }
    return true;
  });
  const handleUpdateStatus = async (orderId, newStatus, customNote) => {
    setUpdatingOrderId(orderId);
    setActionSuccessMsg("");
    try {
      const res = await apiClient.updateOrderStatus(
        orderId,
        newStatus,
        customNote,
        riderName,
        "COURIER"
      );
      if (res && res.success) {
        setActionSuccessMsg(`\u0985\u09B0\u09CD\u09A1\u09BE\u09B0 #${orderId} \u098F\u09B0 \u09B8\u09CD\u099F\u09CD\u09AF\u09BE\u099F\u09BE\u09B8 \u09B8\u09AB\u09B2\u09AD\u09BE\u09AC\u09C7 "${newStatus}" \u0995\u09B0\u09BE \u09B9\u09DF\u09C7\u099B\u09C7!`);
        setTimeout(() => setActionSuccessMsg(""), 4e3);
        realtimeService.broadcast("ORDER_UPDATED", res.order);
        onRefresh();
      }
    } catch (err) {
      setStatusErrorModal({
        title: "Status Update Error",
        message: ("Failed to update status: ") + (err.message || ("Network Error"))
      });
    } finally {
      setUpdatingOrderId(null);
    }
  };
  const readyPickupCount = courierOrders.filter((o) => o.status === "COURIER_CREATED" || o.status === "CONFIRMED").length;
  const inHandCount = courierOrders.filter((o) => o.status === "PICKED_UP" || o.status === "IN_TRANSIT").length;
  const outForDeliveryCount = courierOrders.filter((o) => o.status === "OUT_FOR_DELIVERY").length;
  const deliveredCount = courierOrders.filter((o) => o.status === "DELIVERED").length;
  if (isVerifyingSession) {
    return (
      <div className="min-h-screen bg-neutral-950 flex flex-col justify-center items-center p-4 text-neutral-300 text-xs">
        <div className="flex items-center gap-2.5">
          <span className="inline-block w-4 h-4 border-2 border-emerald-500 border-t-transparent rounded-full animate-spin" />
          <span>Verifying rider portal session...</span>
        </div>
      </div>
    );
  }

  if (!isRiderAuthenticated) {
    const showManualInput = selectedRiderId === "__manual__" || (!isLoadingRiders && ridersList.length === 0);
    return <div className="min-h-screen bg-neutral-950 flex flex-col justify-center items-center p-4 text-neutral-100 relative">
        <div className="max-w-md w-full bg-neutral-900 border border-neutral-800 rounded-3xl p-8 shadow-2xl space-y-6">
          <div className="flex items-center justify-between">
            <button
              onClick={onBackToStore}
              className="inline-flex items-center gap-1.5 text-xs text-neutral-400 hover:text-white transition-colors cursor-pointer"
            >
              <ArrowLeft className="w-4 h-4" />
              <span>{"Back to Store"}</span>
            </button>
            <button
              type="button"
              onClick={loadRiders}
              className="inline-flex items-center gap-1 text-[11px] text-neutral-400 hover:text-emerald-400 transition-colors cursor-pointer"
              title="Refresh active riders from Admin Panel"
            >
              <RefreshCw className={`w-3.5 h-3.5 ${isLoadingRiders ? "animate-spin" : ""}`} />
              <span>Refresh List</span>
            </button>
          </div>

          <div className="w-14 h-14 rounded-2xl bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 flex items-center justify-center">
            <Truck className="w-8 h-8" />
          </div>

          <div>
            <h2 className="text-2xl font-black text-white tracking-tight">
              {"Rider & Delivery Hub Login"}
            </h2>
            <p className="text-xs text-neutral-400 mt-1.5">
              {"Sign in with the Delivery Rider account & PIN configured by your Admin."}
            </p>
          </div>

          {authError && <div className="p-3 bg-red-950/40 border border-red-800/60 rounded-xl text-red-300 text-xs flex items-center gap-2">
              <AlertCircle className="w-4 h-4 shrink-0 text-red-400" />
              <span>{authError}</span>
            </div>}

          <form onSubmit={handleRiderLogin} className="space-y-4 text-xs">
            {ridersList.length > 0 && (
              <div>
                <label className="block font-semibold text-neutral-300 mb-1.5">
                  {"Select Rider / Logistics Staff"}
                </label>
                <select
                  value={selectedRiderId}
                  onChange={(e) => {
                    setSelectedRiderId(e.target.value);
                    setAuthError("");
                  }}
                  className="w-full bg-neutral-800 border border-neutral-700 rounded-xl px-3.5 py-2.5 text-xs text-white focus:border-emerald-500 focus:outline-hidden"
                >
                  {ridersList.map((r) => (
                    <option key={r.id} value={r.id}>
                      {r.name} (@{r.username} • {r.role}){r.notes ? ` — ${r.notes}` : ""}
                    </option>
                  ))}
                  <option value="__manual__">Enter Username / Phone Manually...</option>
                </select>
              </div>
            )}

            {showManualInput && (
              <div>
                <label className="block font-semibold text-neutral-300 mb-1.5">
                  {"Rider Username or Phone"}
                </label>
                <input
                  type="text"
                  required
                  value={manualUsername}
                  onChange={(e) => setManualUsername(e.target.value)}
                  placeholder="Enter staff username or phone"
                  className="w-full bg-neutral-800 border border-neutral-700 rounded-xl px-3.5 py-2.5 text-xs text-white focus:border-emerald-500 focus:outline-hidden"
                />
                {!isLoadingRiders && ridersList.length === 0 && (
                  <p className="text-[11px] text-amber-300/90 mt-1.5">
                    No active riders found. Admin can add Delivery Riders in Staff &amp; Access Control.
                  </p>
                )}
              </div>
            )}

            <div>
              <label className="block font-semibold text-neutral-300 mb-1.5">
                {"Rider PIN / Password"}
              </label>
              <input
                type="password"
                required
                value={riderPin}
                onChange={(e) => setRiderPin(e.target.value)}
                placeholder={"Enter your assigned PIN / Password"}
                className="w-full bg-neutral-800 border border-neutral-700 rounded-xl px-3.5 py-2.5 text-sm text-white focus:border-emerald-500 focus:outline-hidden font-mono"
              />
            </div>

            <button
              type="submit"
              disabled={isLoggingIn}
              className="w-full py-3 bg-emerald-600 hover:bg-emerald-500 font-bold text-sm text-white rounded-xl transition-colors shadow-lg shadow-emerald-900/30 cursor-pointer disabled:opacity-60"
            >
              {isLoggingIn ? "Verifying Credentials..." : "Enter Rider Hub"}
            </button>
          </form>
        </div>
      </div>;
  }
  return <div className="min-h-screen bg-neutral-900 text-neutral-100 font-sans pb-16">
      {/* Top Courier / Rider Header Component */}
      <Courier_Header
        onBackToStore={onBackToStore}
        riderName={riderName}
        setRiderName={setRiderName}
        riders={ridersList}
        canSwitchRider={authenticatedRider?.role === "ADMIN" || authenticatedRider?.role === "MANAGER"}
        onRefresh={onRefresh}
        handleRiderLogout={handleRiderLogout}
      />

      {/* Main Container */}
      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6 space-y-6">
        {/* Success Alert Banner */}
        {actionSuccessMsg && <div className="p-3.5 bg-emerald-500/15 border border-emerald-500/30 rounded-2xl text-emerald-300 text-xs font-semibold flex items-center justify-between animate-in fade-in duration-200">
            <div className="flex items-center gap-2">
              <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
              <span>{actionSuccessMsg}</span>
            </div>
            <span className="text-[10px] text-emerald-400/80 font-mono">
              {"Database & Tracking Synced"}
            </span>
          </div>}

        {/* Metric Counters Grid */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 text-xs">
          <button
            onClick={() => setActiveTab("READY_PICKUP")}
            className={`p-4 rounded-2xl border text-left transition-all cursor-pointer ${activeTab === "READY_PICKUP" ? "bg-amber-950/40 border-amber-500 text-amber-300 shadow-lg shadow-amber-950/30" : "bg-neutral-950/60 border-neutral-800 text-neutral-300 hover:border-neutral-700"}`}
          >
            <div className="flex items-center justify-between mb-1">
              <span className="font-semibold text-neutral-400">{"Ready for Pickup"}</span>
              <Package className="w-4 h-4 text-amber-400" />
            </div>
            <div className="text-2xl font-black text-amber-400">{readyPickupCount}</div>
            <div className="text-[11px] text-neutral-400 mt-1">
              {"Collect from merchant hub"}
            </div>
          </button>

          <button
            onClick={() => setActiveTab("IN_HAND")}
            className={`p-4 rounded-2xl border text-left transition-all cursor-pointer ${activeTab === "IN_HAND" ? "bg-indigo-950/40 border-indigo-500 text-indigo-300 shadow-lg shadow-indigo-950/30" : "bg-neutral-950/60 border-neutral-800 text-neutral-300 hover:border-neutral-700"}`}
          >
            <div className="flex items-center justify-between mb-1">
              <span className="font-semibold text-neutral-400">{"In Transit"}</span>
              <Navigation className="w-4 h-4 text-indigo-400" />
            </div>
            <div className="text-2xl font-black text-indigo-400">{inHandCount}</div>
            <div className="text-[11px] text-neutral-400 mt-1">
              {"On way to destination hub"}
            </div>
          </button>

          <button
            onClick={() => setActiveTab("OUT_FOR_DELIVERY")}
            className={`p-4 rounded-2xl border text-left transition-all cursor-pointer ${activeTab === "OUT_FOR_DELIVERY" ? "bg-purple-950/40 border-purple-500 text-purple-300 shadow-lg shadow-purple-950/30" : "bg-neutral-950/60 border-neutral-800 text-neutral-300 hover:border-neutral-700"}`}
          >
            <div className="flex items-center justify-between mb-1">
              <span className="font-semibold text-neutral-400">{"Out for Delivery"}</span>
              <Truck className="w-4 h-4 text-purple-400" />
            </div>
            <div className="text-2xl font-black text-purple-400">{outForDeliveryCount}</div>
            <div className="text-[11px] text-neutral-400 mt-1">
              {"En route to customer address"}
            </div>
          </button>

          <button
            onClick={() => setActiveTab("DELIVERED")}
            className={`p-4 rounded-2xl border text-left transition-all cursor-pointer ${activeTab === "DELIVERED" ? "bg-emerald-950/40 border-emerald-500 text-emerald-300 shadow-lg shadow-emerald-950/30" : "bg-neutral-950/60 border-neutral-800 text-neutral-300 hover:border-neutral-700"}`}
          >
            <div className="flex items-center justify-between mb-1">
              <span className="font-semibold text-neutral-400">{"Delivered"}</span>
              <CheckCircle2 className="w-4 h-4 text-emerald-400" />
            </div>
            <div className="text-2xl font-black text-emerald-400">{deliveredCount}</div>
            <div className="text-[11px] text-neutral-400 mt-1">
              {"Cash collected & completed"}
            </div>
          </button>
        </div>

        {/* Filter and Search Bar */}
        <div className="bg-neutral-950 border border-neutral-800 rounded-2xl p-3 sm:p-4 flex flex-col sm:flex-row items-center justify-between gap-3 text-xs">
          {/* Tab Filter Pills */}
          <div className="flex items-center gap-1.5 overflow-x-auto w-full sm:w-auto pb-1 sm:pb-0">
            <button
              onClick={() => setActiveTab("ALL")}
              className={`px-3 py-1.5 rounded-xl font-bold transition-colors whitespace-nowrap cursor-pointer ${activeTab === "ALL" ? "bg-emerald-600 text-white shadow-xs" : "bg-neutral-900 text-neutral-400 hover:text-white"}`}
            >
              {`All Parcels (${courierOrders.length})`}
            </button>
            <button
              onClick={() => setActiveTab("READY_PICKUP")}
              className={`px-3 py-1.5 rounded-xl font-bold transition-colors whitespace-nowrap cursor-pointer ${activeTab === "READY_PICKUP" ? "bg-amber-600 text-white shadow-xs" : "bg-neutral-900 text-neutral-400 hover:text-white"}`}
            >
              {`Ready Pickup (${readyPickupCount})`}
            </button>
            <button
              onClick={() => setActiveTab("IN_HAND")}
              className={`px-3 py-1.5 rounded-xl font-bold transition-colors whitespace-nowrap cursor-pointer ${activeTab === "IN_HAND" ? "bg-indigo-600 text-white shadow-xs" : "bg-neutral-900 text-neutral-400 hover:text-white"}`}
            >
              {`In Transit (${inHandCount})`}
            </button>
            <button
              onClick={() => setActiveTab("OUT_FOR_DELIVERY")}
              className={`px-3 py-1.5 rounded-xl font-bold transition-colors whitespace-nowrap cursor-pointer ${activeTab === "OUT_FOR_DELIVERY" ? "bg-purple-600 text-white shadow-xs" : "bg-neutral-900 text-neutral-400 hover:text-white"}`}
            >
              {`Out for Delivery (${outForDeliveryCount})`}
            </button>
            <button
              onClick={() => setActiveTab("DELIVERED")}
              className={`px-3 py-1.5 rounded-xl font-bold transition-colors whitespace-nowrap cursor-pointer ${activeTab === "DELIVERED" ? "bg-emerald-600 text-white shadow-xs" : "bg-neutral-900 text-neutral-400 hover:text-white"}`}
            >
              {`Delivered (${deliveredCount})`}
            </button>
          </div>

          {/* Search Input */}
          <div className="relative w-full sm:w-64">
            <Search className="w-3.5 h-3.5 text-neutral-400 absolute left-3 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              placeholder={"Order #, phone, name or tracking..."}
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-9 pr-3 py-1.5 bg-neutral-900 text-white rounded-xl border border-neutral-800 text-xs focus:border-emerald-500 focus:outline-hidden"
            />
          </div>
        </div>

        {
    /* Parcels List */
  }
        {/* Parcels List */}
        <div className="space-y-4">
          {filteredOrders.length === 0 ? <div className="p-12 text-center bg-neutral-950/60 border border-neutral-800 rounded-3xl space-y-2">
              <Package className="w-10 h-10 text-neutral-600 mx-auto" />
              <h3 className="text-sm font-bold text-neutral-300">
                {"No parcels found"}
              </h3>
              <p className="text-xs text-neutral-500 max-w-sm mx-auto">
                {"There are currently no active parcels in this tab. Select another filter or click refresh."}
              </p>
            </div> : filteredOrders.map((order) => {
            const isUpdating = updatingOrderId === order.id;
            return <div
              key={order.id}
              className="bg-neutral-950 border border-neutral-800 rounded-3xl p-5 sm:p-6 transition-all hover:border-neutral-700 space-y-4"
            >
              {/* Top Bar of Card */}
              <div className="flex flex-wrap items-center justify-between gap-3 pb-3 border-b border-neutral-800">
                <div className="flex items-center gap-2.5">
                  <span className="font-mono text-sm font-bold text-emerald-400 bg-emerald-500/10 border border-emerald-500/20 px-2.5 py-1 rounded-xl">
                    #{order.id}
                  </span>
                  <span className="text-xs font-semibold px-2.5 py-1 rounded-full uppercase tracking-wider bg-neutral-800 text-neutral-300">
                    {order.status}
                  </span>
                  {order.courier?.provider && <span className="text-xs font-semibold px-2.5 py-1 rounded-full bg-indigo-500/10 border border-indigo-500/20 text-indigo-400 capitalize">
                      {order.courier.provider} Logistics
                    </span>}
                </div>

                <div className="flex items-center gap-3">
                  {order.courier?.consignmentId && <span className="text-xs font-mono text-neutral-400 bg-neutral-900 px-2.5 py-1 rounded-lg border border-neutral-800">
                      {"Consignment:"} <strong className="text-neutral-200">{order.courier.consignmentId}</strong>
                    </span>}
                  <span className="text-xs font-mono text-neutral-400">
                    {formatBDTDateTime(order.createdAt, isEnglish)}
                  </span>
                </div>
              </div>

              {/* Middle Content Grid */}
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-xs">
                {/* Customer & Destination */}
                <div className="space-y-1.5 bg-neutral-900/60 p-3.5 rounded-2xl border border-neutral-850">
                  <div className="text-[11px] font-bold text-neutral-400 uppercase tracking-wider">
                    {"Recipient & Delivery Address"}
                  </div>
                  <div className="text-sm font-bold text-white">
                    {order.address?.customerName || ("Customer Name")}
                  </div>
                  <div className="text-neutral-300 flex items-start gap-1.5 pt-0.5 leading-relaxed">
                    <MapPin className="w-3.5 h-3.5 text-emerald-400 shrink-0 mt-0.5" />
                    <span>
                      {order.address?.fullAddress}, {order.address?.thana}, {order.address?.district}
                    </span>
                  </div>

                  <div className="pt-2">
                    <a
                      href={`tel:${order.address?.phone}`}
                      className="inline-flex items-center gap-2 px-3 py-1.5 rounded-xl bg-emerald-600/20 hover:bg-emerald-600/30 border border-emerald-500/30 text-emerald-300 font-bold transition-colors"
                    >
                      <PhoneCall className="w-3.5 h-3.5" />
                      <span>{`Call ${order.address?.phone}`}</span>
                    </a>
                  </div>
                </div>

                {/* Items & Instructions */}
                <div className="space-y-2 bg-neutral-900/60 p-3.5 rounded-2xl border border-neutral-850">
                  <div className="text-[11px] font-bold text-neutral-400 uppercase tracking-wider">
                    {"Parcel Items"}
                  </div>
                  <div className="space-y-1">
                    {order.items?.map((it, idx) => <div key={idx} className="flex justify-between items-center text-neutral-300">
                        <span className="truncate max-w-[200px]">• {it.name} {it.variant ? `(${it.variant})` : ""}</span>
                        <span className="font-mono text-neutral-400">×{it.quantity}</span>
                      </div>)}
                  </div>

                  {order.address?.orderNote && <div className="pt-2 border-t border-neutral-800 text-amber-300/90 text-[11px]">
                      <strong>{"Note:"}</strong> {order.address.orderNote}
                    </div>}
                </div>

                {/* Financials & COD Collection */}
                <div className="space-y-2 bg-neutral-900/60 p-3.5 rounded-2xl border border-neutral-850 flex flex-col justify-between">
                  <div>
                    <div className="text-[11px] font-bold text-neutral-400 uppercase tracking-wider">
                      {"Payment & COD Amount"}
                    </div>
                    <div className="mt-1 flex items-baseline gap-2">
                      <span className="text-xl font-black text-amber-400 font-mono">
                        {formatBDT(order.total)}
                      </span>
                      <span className={`text-[10px] font-bold px-1.5 py-0.5 rounded ${order.paymentStatus === "PAID" ? "bg-emerald-500/20 text-emerald-300 border border-emerald-500/30" : "bg-amber-500/20 text-amber-300 border border-amber-500/30"}`}>
                        {order.paymentMethod === "COD" && order.paymentStatus === "UNPAID"
                          ? ("Collect Cash on Delivery")
                          : ("Paid Online (Tk 0)")}
                      </span>
                    </div>
                  </div>

                  <div className="text-[11px] text-neutral-400 border-t border-neutral-800 pt-2">
                    {order.paymentStatus === "PAID" ? <span className="text-emerald-400 font-bold flex items-center gap-1">
                        <CheckCircle2 className="w-3.5 h-3.5" />
                        {"Payment Verified (No cash needed)"}
                      </span> : <span>{"Collect exact total during parcel handover."}</span>}
                  </div>
                </div>
              </div>

              {/* Rider Action Bar */}
              <div className="pt-3 border-t border-neutral-800 flex flex-wrap items-center justify-between gap-3">
                <div className="text-xs text-neutral-400 flex items-center gap-2">
                  <Clock className="w-3.5 h-3.5 text-neutral-400" />
                  <span>{"Current Status:"} <strong className="text-white">{formatOrderStatusLabel(order.status)}</strong></span>
                </div>

                <div className="flex flex-wrap items-center gap-2">
                  {(order.status === "COURIER_CREATED" || order.status === "CONFIRMED") && <button
                    onClick={() => handleUpdateStatus(order.id, "PICKED_UP", `Rider ${riderName} picked up parcel from merchant`)}
                    disabled={isUpdating}
                    className="px-4 py-2 bg-amber-600 hover:bg-amber-500 text-white rounded-xl text-xs font-bold flex items-center gap-1.5 transition-colors shadow-xs disabled:opacity-50 cursor-pointer"
                  >
                    <Package className="w-4 h-4" />
                    <span>{isUpdating ? ("Updating...") : ("📦 Mark Picked Up")}</span>
                  </button>}

                  {order.status === "PICKED_UP" && <button
                    onClick={() => handleUpdateStatus(order.id, "IN_TRANSIT", "Parcel is in transit to destination hub")}
                    disabled={isUpdating}
                    className="px-4 py-2 bg-indigo-600 hover:bg-indigo-500 text-white rounded-xl text-xs font-bold flex items-center gap-1.5 transition-colors shadow-xs disabled:opacity-50 cursor-pointer"
                  >
                    <Navigation className="w-4 h-4" />
                    <span>{isUpdating ? ("Updating...") : ("🚚 Send to Transit")}</span>
                  </button>}

                  {order.status === "IN_TRANSIT" && <button
                    onClick={() => handleUpdateStatus(order.id, "OUT_FOR_DELIVERY", `Rider ${riderName} is en route for delivery`)}
                    disabled={isUpdating}
                    className="px-4 py-2 bg-purple-600 hover:bg-purple-500 text-white rounded-xl text-xs font-bold flex items-center gap-1.5 transition-colors shadow-xs disabled:opacity-50 cursor-pointer"
                  >
                    <Truck className="w-4 h-4" />
                    <span>{isUpdating ? ("Updating...") : ("🛵 Out for Delivery")}</span>
                  </button>}

                  {order.status === "OUT_FOR_DELIVERY" && <>
                    <button
                      onClick={() => handleUpdateStatus(order.id, "DELIVERED", `Successfully delivered to recipient and cash collected`)}
                      disabled={isUpdating}
                      className="px-4 py-2 bg-emerald-600 hover:bg-emerald-500 text-white rounded-xl text-xs font-bold flex items-center gap-1.5 transition-colors shadow-xs disabled:opacity-50 cursor-pointer"
                    >
                      <CheckCircle2 className="w-4 h-4" />
                      <span>{isUpdating ? ("Updating...") : ("✅ Delivered & Collected")}</span>
                    </button>

                    <button
                      onClick={() => handleUpdateStatus(order.id, "RETURNED", "Customer unreachable or requested reschedule")}
                      disabled={isUpdating}
                      className="px-3 py-2 bg-rose-950 hover:bg-rose-900 border border-rose-800 text-rose-300 rounded-xl text-xs font-semibold flex items-center gap-1.5 transition-colors disabled:opacity-50 cursor-pointer"
                    >
                      <RotateCcw className="w-3.5 h-3.5" />
                      <span>{"Unreachable / Return"}</span>
                    </button>
                  </>}

                  {order.status === "DELIVERED" && <div className="px-3.5 py-1.5 bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 rounded-xl text-xs font-bold flex items-center gap-1.5">
                    <CheckCircle2 className="w-4 h-4 text-emerald-400" />
                    <span>{"Delivered & Cash Collected (PAID)"}</span>
                  </div>}
                </div>
              </div>
            </div>;
          })}
        </div>
      </main>

      <CustomModal
        isOpen={Boolean(statusErrorModal)}
        type="error"
        title={statusErrorModal?.title || ""}
        message={statusErrorModal?.message || ""}
        confirmText={"OK"}
        onClose={() => setStatusErrorModal(null)}
      />
    </div>;
};

export {
  CourierPortal
};
