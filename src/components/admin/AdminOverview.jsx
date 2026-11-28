import { useState, useMemo, useEffect, useCallback } from "react";
import {
  ShoppingBag,
  Clock,
  Truck,
  DollarSign,
  ArrowUpRight,
  Eye,
  CreditCard,
  Smartphone,
  Banknote
} from "lucide-react";
import { formatBDT } from "../../utils/bangladesh";
import { formatOrderStatusLabel } from "../../utils/orderStatus";
import { getOrderNetEarning, isSettledOrderEarning } from "../../utils/analyticsRange";
import { useLanguage } from "../../Context/LanguageContext";
import { apiClient } from "../../services/api";
import { realtimeService } from "../../services/realtime";
import { Graph } from "./Graph";
import { PopupGraph } from "./PopupGraph";

const formatCourierLabel = (rawName) => {
  const clean = String(rawName || "").trim();
  if (!clean) return "";
  const lower = clean.toLowerCase();
  if (lower.includes("steadfast")) return "Steadfast";
  if (lower.includes("pathao")) return "Pathao";
  if (lower.includes("redx")) return "RedX";
  if (lower.includes("ecourier")) return "eCourier";
  if (lower.includes("paperfly")) return "Paperfly";
  return clean;
};

const formatCourierJoin = (names = []) => {
  const unique = Array.from(new Set(names.filter(Boolean)));
  if (unique.length === 0) return "";
  if (unique.length === 1) return unique[0];
  if (unique.length === 2) return `${unique[0]} & ${unique[1]}`;
  return `${unique.slice(0, -1).join(", ")} & ${unique[unique.length - 1]}`;
};

const AdminOverview = ({
  orders = [],
  products = [],
  onViewOrders,
  onSelectOrder,
  onSelectOrderStatusFilter,
  onNavigateTab
}) => {
  const { isEnglish } = useLanguage();
  const [isAnalyticsModalOpen, setIsAnalyticsModalOpen] = useState(false);
  const [courierConfigs, setCourierConfigs] = useState([]);
  const [paymentConfigs, setPaymentConfigs] = useState([]);

  const loadLiveChannels = useCallback(async () => {
    try {
      const [couriersRes, paymentsRes] = await Promise.all([
        apiClient.getCouriers().catch(() => []),
        apiClient.getPaymentMethods().catch(() => []),
      ]);
      if (Array.isArray(couriersRes)) setCourierConfigs(couriersRes);
      if (Array.isArray(paymentsRes)) setPaymentConfigs(paymentsRes);
    } catch {}
  }, []);

  useEffect(() => {
    loadLiveChannels();
    const unsub = realtimeService.subscribe((event) => {
      if (
        event?.type === "SETTINGS_UPDATED" ||
        event?.type === "COURIER_UPDATED" ||
        event?.type === "PAYMENT_UPDATED" ||
        event?.type === "ORDER_UPDATED"
      ) {
        loadLiveChannels();
      }
    });
    return () => {
      if (typeof unsub === "function") unsub();
    };
  }, [loadLiveChannels]);

  // Exclude uncompleted/failed SSLCommerz orders from Overview metrics & tables
  const activeOrders = useMemo(
    () =>
      orders.filter(
        (o) =>
          !(
            String(o.paymentMethod || "").toUpperCase() === "SSLCOMMERZ" &&
            (String(o.paymentStatus || "").toUpperCase() === "FAILED" ||
              String(o.status || "").toUpperCase() === "FAILED")
          )
      ),
    [orders]
  );

  // Financial & Operational Metrics (Earnings always exclude delivery charges)
  const totalRevenue = activeOrders.reduce(
    (acc, o) => acc + (isSettledOrderEarning(o) ? getOrderNetEarning(o) : 0),
    0
  );
  const pendingOrders = activeOrders.filter((o) => o.status === "PENDING");
  const confirmedOrders = activeOrders.filter((o) => o.status === "CONFIRMED");
  const inTransitOrders = activeOrders.filter(
    (o) =>
      o.status === "IN_TRANSIT" ||
      o.status === "COURIER_CREATED" ||
      o.status === "OUT_FOR_DELIVERY"
  );
  const avgOrderValue =
    activeOrders.length > 0
      ? Math.round(
          activeOrders.reduce((acc, o) => acc + (Number(o.total) || 0), 0) /
            activeOrders.length
        )
      : 0;
  const codPendingOrders = activeOrders.filter(
    (o) =>
      String(o.paymentMethod || "").toUpperCase() === "COD" &&
      o.status !== "DELIVERED" &&
      o.status !== "CANCELLED" &&
      o.status !== "RETURNED"
  );
  const codPendingTotal = codPendingOrders.reduce(
    (acc, o) => acc + (Number(o.total) || 0),
    0
  );

  // Dynamic Live Gateway summary (SSLCommerz, MFS: bKash/Nagad/Rocket, COD)
  const gatewaySummary = useMemo(() => {
    let ssl = 0;
    let mfs = 0;
    let cod = 0;
    for (const o of activeOrders) {
      const orderStatus = String(o.status || "").toUpperCase();
      if (orderStatus === "CANCELLED" || orderStatus === "RETURNED") continue;
      const method = String(o.paymentMethod || "").toUpperCase();
      const amount = Number(o.total) || 0;
      if (method === "SSLCOMMERZ") ssl += amount;
      else if (method === "BKASH" || method === "NAGAD" || method === "ROCKET") mfs += amount;
      else if (method === "COD") cod += amount;
    }
    return { ssl, mfs, cod, total: ssl + mfs + cod };
  }, [activeOrders]);

  // Marketing attribution breakdown (excluding delivery charges & cancelled orders)
  const sourceStats = {};
  activeOrders.forEach((o) => {
    const st = String(o.status || "").toUpperCase();
    if (st === "CANCELLED" || st === "RETURNED") return;
    const src = o.utm?.source || "direct";
    sourceStats[src] = (sourceStats[src] || 0) + getOrderNetEarning(o);
  });

  // Safe navigation helper that applies the status & optional payment method filter in the Orders tab
  const handleFilterClick = (status = "ALL", paymentMethod = "ALL") => {
    if (onSelectOrderStatusFilter) {
      onSelectOrderStatusFilter(status, paymentMethod);
    } else if (onViewOrders) {
      onViewOrders(status, paymentMethod);
    }
  };

  // Status Badge Label (Normal readable text, zero underscores/hyphens)
  const getStatusBadge = (status) => formatOrderStatusLabel(status);

  return (
    <div className="space-y-6">
      {/* 1. Top Section: 4 Compact Cards (Today's Sales Summary, Total Earnings, Total Orders, Live Gateway) */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 items-stretch">
        {/* Box 1: Today's Sales Summary (Short & Compact) */}
        <div className="bg-white rounded-2xl p-4 sm:p-5 border border-neutral-200 shadow-xs flex flex-col justify-between gap-3">
          <div>
            <span className="text-[10px] font-bold uppercase tracking-wider text-emerald-700 bg-emerald-50 px-2.5 py-0.5 rounded-full">
              {"Daily Operational Summary"}
            </span>
            <h1 className="text-lg font-black text-neutral-900 mt-1.5 leading-snug">
              {"Today's Sales Summary"}
            </h1>
          </div>

          <button
            type="button"
            onClick={() => handleFilterClick("ALL")}
            className="w-full px-4 py-2 bg-emerald-600 hover:bg-emerald-700 active:scale-95 text-white rounded-xl text-xs font-bold transition-all shadow-xs flex items-center justify-center gap-2 cursor-pointer"
          >
            <ShoppingBag className="w-3.5 h-3.5" />
            <span>{`Manage All Orders (${activeOrders.length})`}</span>
          </button>
        </div>

        {/* Box 2: Total Earnings KPI Card (Compact) */}
        <div
          onClick={() =>
            typeof onNavigateTab === "function"
              ? onNavigateTab("analytics")
              : handleFilterClick("ALL")
          }
          className="bg-white rounded-2xl p-4 sm:p-5 border border-neutral-200 hover:border-emerald-400 hover:shadow-md transition-all cursor-pointer group shadow-xs flex flex-col justify-between"
          title={"Click to view Analytics"}
        >
          <div className="flex justify-between items-start text-neutral-500">
            <span className="text-xs font-bold uppercase tracking-wider group-hover:text-emerald-700 transition-colors">
              {"Total Earnings"}
            </span>
            <div className="p-1.5 rounded-xl bg-emerald-50 text-emerald-600 group-hover:bg-emerald-100 transition-colors">
              <DollarSign className="w-4 h-4" />
            </div>
          </div>
          <div className="pt-2">
            <div className="text-2xl font-black text-neutral-900 group-hover:text-emerald-700 transition-colors">
              {formatBDT(totalRevenue)}
            </div>
            <div className="text-[11px] text-emerald-600 mt-1 font-semibold flex items-center justify-between">
              <span>{"Paid & Delivered"}</span>
              <span className="text-xs font-bold opacity-0 group-hover:opacity-100 transition-opacity">→</span>
            </div>
          </div>
        </div>

        {/* Box 3: Total Orders KPI Card (Compact) */}
        <div
          onClick={() => handleFilterClick("ALL")}
          className="bg-white rounded-2xl p-4 sm:p-5 border border-neutral-200 hover:border-blue-400 hover:shadow-md transition-all cursor-pointer group shadow-xs flex flex-col justify-between"
          title={"Click to view all orders"}
        >
          <div className="flex justify-between items-start text-neutral-500">
            <span className="text-xs font-bold uppercase tracking-wider group-hover:text-blue-700 transition-colors">
              {"Total Orders"}
            </span>
            <div className="p-1.5 rounded-xl bg-blue-50 text-blue-600 group-hover:bg-blue-100 transition-colors">
              <ShoppingBag className="w-4 h-4" />
            </div>
          </div>
          <div className="pt-2">
            <div className="text-2xl font-black text-neutral-900 group-hover:text-blue-700 transition-colors">
              {activeOrders.length} {"Orders"}
            </div>
            <div className="text-[11px] text-blue-600 mt-1 font-semibold flex items-center justify-between">
              <span>
                {"Avg:"} {formatBDT(avgOrderValue)}
              </span>
              <span className="text-xs font-bold opacity-0 group-hover:opacity-100 transition-opacity">→</span>
            </div>
          </div>
        </div>

        {/* Box 4: Live Gateway Summary Card (Links to Order Management -> Order Payment Reconciliation) */}
        <div
          onClick={() => handleFilterClick("RECONCILIATION", "ALL")}
          className="bg-white rounded-2xl p-4 sm:p-5 border border-neutral-200 hover:border-indigo-400 hover:shadow-md transition-all cursor-pointer group shadow-xs flex flex-col justify-between"
          title={"Click to open Order Payment Reconciliation window"}
        >
          <div className="flex justify-between items-start text-neutral-500">
            <span className="text-xs font-bold uppercase tracking-wider group-hover:text-indigo-700 transition-colors">
              {"Live Gateway"}
            </span>
            <div className="p-1.5 rounded-xl bg-indigo-50 text-indigo-600 group-hover:bg-indigo-100 transition-colors">
              <CreditCard className="w-4 h-4" />
            </div>
          </div>
          <div className="pt-2 space-y-1 text-[11px] font-semibold text-neutral-700">
            <div className="flex items-center justify-between">
              <span className="text-blue-700">SSLCommerz</span>
              <span className="font-bold text-neutral-900">{formatBDT(gatewaySummary.ssl)}</span>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-pink-700">MFS (bKash/Nagad/Rocket)</span>
              <span className="font-bold text-neutral-900">{formatBDT(gatewaySummary.mfs)}</span>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-emerald-700">COD</span>
              <span className="font-bold text-neutral-900">{formatBDT(gatewaySummary.cod)}</span>
            </div>
            <div className="text-[11px] text-indigo-600 pt-0.5 flex items-center justify-between border-t border-neutral-100">
              <span>
                {(() => {
                  if (!Array.isArray(paymentConfigs) || paymentConfigs.length === 0) {
                    return "Loading gateways...";
                  }
                  const activeLabels = [];
                  const hasSsl = paymentConfigs.some((p) => p.isActive && String(p.id).toLowerCase() === "sslcommerz");
                  const hasMfs = paymentConfigs.some((p) => p.isActive && ["bkash", "nagad", "rocket"].includes(String(p.id).toLowerCase()));
                  const hasCod = paymentConfigs.some((p) => p.isActive && String(p.id).toLowerCase() === "cod");
                  if (hasSsl) activeLabels.push("SSLCommerz");
                  if (hasMfs) activeLabels.push("MFS");
                  if (hasCod) activeLabels.push("COD");
                  return activeLabels.length > 0 ? activeLabels.join(" • ") : "No active gateway";
                })()}
              </span>
              <span className="text-xs font-bold opacity-0 group-hover:opacity-100 transition-opacity">→</span>
            </div>
          </div>
        </div>
      </div>

      {/* 2. 4 Stat Cards Below Banner (Pending Orders, Pending Confirmation, In Transit, COD Remittance) */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {/* Card 1: Pending Orders */}
        <div
          onClick={() => handleFilterClick("PENDING")}
          className="bg-white rounded-2xl p-5 border border-neutral-200 hover:border-amber-400 hover:shadow-md transition-all cursor-pointer group shadow-xs"
          title={"Click to filter pending orders"}
        >
          <div className="flex justify-between items-start text-neutral-500 mb-2">
            <span className="text-xs font-semibold group-hover:text-amber-700 transition-colors">
              {"Pending Orders"}
            </span>
            <div className="p-2 rounded-xl bg-amber-50 text-amber-600 group-hover:bg-amber-100 transition-colors">
              <Clock className="w-4 h-4" />
            </div>
          </div>
          <div className="text-2xl font-black text-neutral-900 group-hover:text-amber-700 transition-colors">
            {pendingOrders.length} {"Orders"}
          </div>
          <div className="text-[11px] text-amber-700 mt-1 flex items-center justify-between">
            <span>{"New orders needing review"}</span>
            <span className="text-xs font-bold opacity-0 group-hover:opacity-100 transition-opacity">→</span>
          </div>
        </div>

        {/* Card 2: Pending Confirmation */}
        <div
          onClick={() => handleFilterClick("CONFIRMED")}
          className="bg-white rounded-2xl p-5 border border-neutral-200 hover:border-blue-400 hover:shadow-md transition-all cursor-pointer group shadow-xs"
          title={"Click to filter confirmed orders"}
        >
          <div className="flex justify-between items-start text-neutral-500 mb-2">
            <span className="text-xs font-semibold group-hover:text-blue-700 transition-colors">
              {"Pending Confirmation"}
            </span>
            <div className="p-2 rounded-xl bg-blue-50 text-blue-600 group-hover:bg-blue-100 transition-colors">
              <Clock className="w-4 h-4" />
            </div>
          </div>
          <div className="text-2xl font-black text-neutral-900 group-hover:text-blue-700 transition-colors">
            {confirmedOrders.length} {"Orders"}
          </div>
          <div className="text-[11px] text-blue-700 mt-1 flex items-center justify-between">
            <span>{"Call verified, courier booking needed"}</span>
            <span className="text-xs font-bold opacity-0 group-hover:opacity-100 transition-opacity">→</span>
          </div>
        </div>

        {/* Card 3: In Transit (Courier) */}
        <div
          onClick={() => handleFilterClick("IN_TRANSIT")}
          className="bg-white rounded-2xl p-5 border border-neutral-200 hover:border-indigo-400 hover:shadow-md transition-all cursor-pointer group shadow-xs"
          title={"Click to filter in-transit orders"}
        >
          <div className="flex justify-between items-start text-neutral-500 mb-2">
            <span className="text-xs font-semibold group-hover:text-indigo-700 transition-colors">
              {"In Transit (Courier)"}
            </span>
            <div className="p-2 rounded-xl bg-indigo-50 text-indigo-600 group-hover:bg-indigo-100 transition-colors">
              <Truck className="w-4 h-4" />
            </div>
          </div>
          <div className="text-2xl font-black text-indigo-600 group-hover:text-indigo-700 transition-colors">
            {inTransitOrders.length} {"Orders"}
          </div>
          <div className="text-[11px] text-neutral-400 mt-1 flex items-center justify-between">
            <span>
              {(() => {
                const activeNames = courierConfigs
                  .filter((c) => c && c.isActive)
                  .map((c) => formatCourierLabel(c.name || c.id));
                const orderProviders = inTransitOrders
                  .map((o) => formatCourierLabel(o?.courier?.provider))
                  .filter(Boolean);
                const resolvedNames = activeNames.length > 0 ? activeNames : orderProviders;
                const joined = formatCourierJoin(resolvedNames);
                return joined ? `Processing at ${joined}` : "No active courier configured";
              })()}
            </span>
            <span className="text-xs font-bold opacity-0 group-hover:opacity-100 transition-opacity text-indigo-600">→</span>
          </div>
        </div>

        {/* Card 4: Pending COD */}
        <div
          onClick={() => handleFilterClick("RECONCILIATION", "COD")}
          className="bg-white rounded-2xl p-5 border border-neutral-200 hover:border-emerald-400 hover:shadow-md transition-all cursor-pointer group shadow-xs"
          title={"Click to view Cash on Delivery orders"}
        >
          <div className="flex justify-between items-start text-neutral-500 mb-2">
            <span className="text-xs font-semibold group-hover:text-emerald-700 transition-colors">
              {"Pending COD"}
            </span>
            <div className="p-2 rounded-xl bg-emerald-50 text-emerald-600 group-hover:bg-emerald-100 transition-colors">
              <DollarSign className="w-4 h-4" />
            </div>
          </div>
          <div className="text-2xl font-black text-emerald-700">
            {formatBDT(codPendingTotal)}
          </div>
          <div className="text-[11px] text-emerald-600 mt-1 flex items-center justify-between">
            <span>{`${codPendingOrders.length} Orders • Deposited upon delivery`}</span>
            <span className="text-xs font-bold opacity-0 group-hover:opacity-100 transition-opacity text-emerald-700">→</span>
          </div>
        </div>
      </div>

      {/* 3. Bottom Row: 3 Columns (Recent Orders, Modular Graph Card, Ad Traffic & Sources) */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Column 1: Recent Orders */}
        <div className="bg-white rounded-3xl p-5 border border-neutral-200 shadow-xs flex flex-col space-y-3">
          <div className="flex justify-between items-center">
            <div>
              <h3 className="text-base font-bold text-neutral-900">
                {"Recent Orders"}
              </h3>
              <p className="text-xs text-neutral-400">
                {"Latest received orders and status"}
              </p>
            </div>
            <button
              onClick={() => handleFilterClick("ALL")}
              className="text-xs font-semibold text-emerald-700 hover:underline flex items-center gap-1 cursor-pointer"
            >
              <span>{"View All"}</span>
              <ArrowUpRight className="w-3.5 h-3.5" />
            </button>
          </div>

          <div className="overflow-x-auto flex-1">
            <table className="w-full text-left text-xs">
              <thead className="bg-neutral-50 text-neutral-500 font-semibold border-y border-neutral-200">
                <tr>
                  <th className="py-2.5 px-2.5">{"Order"}</th>
                  <th className="py-2.5 px-2.5">{"Customer"}</th>
                  <th className="py-2.5 px-2.5">{"Amount"}</th>
                  <th className="py-2.5 px-2.5">{"Status"}</th>
                  <th className="py-2.5 px-2 text-right">{"Action"}</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-neutral-100">
                {activeOrders.length === 0 ? (
                  <tr>
                    <td colSpan={5} className="py-10 text-center text-neutral-400">
                      {"No recent orders found."}
                    </td>
                  </tr>
                ) : activeOrders.slice(0, 5).map((order) => (
                  <tr key={order.id} className="hover:bg-neutral-50/80 transition-colors">
                    <td className="py-3 px-2.5 font-mono font-bold text-neutral-900 whitespace-nowrap">
                      #{order.id}
                    </td>
                    <td className="py-3 px-2.5">
                      <div
                        className="font-semibold text-neutral-900 truncate max-w-[110px]"
                        title={order.address?.customerName}
                      >
                        {order.address?.customerName || "Customer"}
                      </div>
                      <div className="text-[10px] text-neutral-400 font-mono">
                        {order.address?.phone || "—"}
                      </div>
                    </td>
                    <td className="py-3 px-2.5 font-bold text-neutral-900 whitespace-nowrap">
                      {formatBDT(order.total)}
                    </td>
                    <td className="py-3 px-2.5 whitespace-nowrap">
                      <span
                        className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${
                          order.status === "DELIVERED"
                            ? "bg-emerald-100 text-emerald-800"
                            : order.status === "PENDING"
                            ? "bg-amber-100 text-amber-800"
                            : order.status === "IN_TRANSIT"
                            ? "bg-indigo-100 text-indigo-800"
                            : "bg-neutral-100 text-neutral-800"
                        }`}
                      >
                        {getStatusBadge(order.status)}
                      </span>
                    </td>
                    <td className="py-3 px-2 text-right">
                      <button
                        onClick={() => onSelectOrder(order)}
                        className="p-1.5 rounded-lg hover:bg-neutral-200 text-neutral-600 transition-colors cursor-pointer"
                        title={"View details"}
                      >
                        <Eye className="w-4 h-4" />
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          <div className="mt-auto pt-2 border-t border-neutral-100 text-[11px] text-neutral-400 flex justify-between items-center">
            <span>
              {`Showing ${Math.min(5, activeOrders.length)} of ${activeOrders.length} orders`}
            </span>
            <button
              onClick={() => handleFilterClick("ALL")}
              className="text-emerald-700 font-semibold hover:underline cursor-pointer"
            >
              {"Manage in Orders tab →"}
            </button>
          </div>
        </div>

        {/* Column 2: Total Earnings Analytics Graph Component with Modal Trigger */}
        <Graph
          orders={activeOrders}
          isEnglish={isEnglish}
          totalRevenue={totalRevenue}
          onOpenModal={() => setIsAnalyticsModalOpen(true)}
        />

        {/* Column 3: Marketing Attribution Breakdown (Ad Traffic & Sources) */}
        <div className="bg-white rounded-3xl p-5 border border-neutral-200 shadow-xs space-y-4">
          <div>
            <h3 className="text-base font-bold text-neutral-900">
              {"Ad Traffic & Sources"}
            </h3>
            <p className="text-xs text-neutral-400">
              {"UTM parameters & campaign sales"}
            </p>
          </div>

          <div className="space-y-3">
            {Object.entries(sourceStats).map(([src, amount]) => {
              const totalAmount =
                Object.values(sourceStats).reduce((a, b) => a + b, 0) || 1;
              const pct = Math.round((amount / totalAmount) * 100);
              return (
                <div
                  key={src}
                  className="p-3 rounded-2xl bg-neutral-50 border border-neutral-200 text-xs"
                >
                  <div className="flex justify-between items-center mb-1">
                    <span className="font-bold text-neutral-900 capitalize flex items-center gap-1.5">
                      <span className="w-2 h-2 rounded-full bg-emerald-600" />
                      {src}
                    </span>
                    <span className="font-extrabold text-neutral-900">
                      {formatBDT(amount)}
                    </span>
                  </div>
                  <div className="w-full bg-neutral-200 rounded-full h-1.5 overflow-hidden">
                    <div
                      className="bg-emerald-600 h-1.5 rounded-full"
                      style={{ width: `${pct}%` }}
                    />
                  </div>
                  <span className="text-[10px] text-neutral-400 mt-1 block">
                    {pct}% {"of total sales"}
                  </span>
                </div>
              );
            })}
          </div>

          <div className="p-3 rounded-2xl bg-emerald-50 border border-emerald-200 text-xs text-emerald-900 space-y-1">
            <span className="font-bold block">
              {"Meta CAPI & GA4 Deduplication Engine"}
            </span>
            <p className="text-[11px] text-emerald-800">
              {"Browser pixel and server conversion API share the same Event ID for 100% precision."}
            </p>
          </div>
        </div>
      </div>

      {/* 4. Full-Featured Analytics Popup Modal (Backdrop Blur, Large View, Timeframe & Product Search) */}
      <PopupGraph
        isOpen={isAnalyticsModalOpen}
        onClose={() => setIsAnalyticsModalOpen(false)}
        orders={activeOrders}
        products={products}
        isEnglish={isEnglish}
      />
    </div>
  );
};

export { AdminOverview };
