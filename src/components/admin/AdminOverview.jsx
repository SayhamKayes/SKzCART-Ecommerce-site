import { useState } from "react";
import {
  ShoppingBag,
  Clock,
  Truck,
  DollarSign,
  ArrowUpRight,
  Eye
} from "lucide-react";
import { formatBDT } from "../../utils/bangladesh";
import { useLanguage } from "../../Context/LanguageContext";
import { Graph } from "./Graph";
import { PopupGraph } from "./PopupGraph";

const AdminOverview = ({
  orders = [],
  products = [],
  onViewOrders,
  onSelectOrder,
  onSelectOrderStatusFilter
}) => {
  const { isEnglish, t } = useLanguage();
  const [isAnalyticsModalOpen, setIsAnalyticsModalOpen] = useState(false);

  // Financial & Operational Metrics
  const totalRevenue = orders.reduce(
    (acc, o) =>
      acc +
      (o.paymentStatus === "PAID" || o.status === "DELIVERED"
        ? Number(o.total) || 0
        : 0),
    0
  );
  const pendingOrders = orders.filter((o) => o.status === "PENDING");
  const confirmedOrders = orders.filter((o) => o.status === "CONFIRMED");
  const inTransitOrders = orders.filter(
    (o) =>
      o.status === "IN_TRANSIT" ||
      o.status === "COURIER_CREATED" ||
      o.status === "OUT_FOR_DELIVERY"
  );
  const avgOrderValue =
    orders.length > 0
      ? Math.round(
          orders.reduce((acc, o) => acc + (Number(o.total) || 0), 0) /
            orders.length
        )
      : 0;
  const codPendingTotal = orders
    .filter(
      (o) =>
        o.paymentMethod === "COD" &&
        o.status !== "DELIVERED" &&
        o.status !== "CANCELLED" &&
        o.status !== "RETURNED"
    )
    .reduce((acc, o) => acc + (Number(o.total) || 0), 0);

  // Marketing attribution breakdown
  const sourceStats = {};
  orders.forEach((o) => {
    const src = o.utm?.source || "direct";
    sourceStats[src] = (sourceStats[src] || 0) + (Number(o.total) || 0);
  });

  // Safe navigation helper that applies the status filter in the Orders tab
  const handleFilterClick = (status = "ALL") => {
    if (onSelectOrderStatusFilter) {
      onSelectOrderStatusFilter(status);
    } else if (onViewOrders) {
      onViewOrders(status);
    }
  };

  // Status Badge Label
  const getStatusBadge = (status) => {
    if (isEnglish) return status;
    switch (status) {
      case "PENDING":
        return "Pending";
      case "CONFIRMED":
        return "Confirmed";
      case "COURIER_CREATED":
        return "Courier Booked";
      case "PICKED_UP":
        return "Picked Up";
      case "IN_TRANSIT":
        return "Processing";
      case "OUT_FOR_DELIVERY":
        return "Out for Delivery";
      case "DELIVERED":
        return "Delivered";
      case "CANCELLED":
        return "Cancelled";
      case "RETURNED":
        return "Returned";
      default:
        return status;
    }
  };

  return (
    <div className="space-y-6">
      {/* 1. Top Section: 3 Distinct Cards (Left Summary + Manage Button, Middle Total Earnings KPI, Right Total Orders KPI) */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-5 items-stretch">
        {/* Box 1 (Left): Today's Sales & Delivery Summary + Manage All Orders Button */}
        <div className="bg-white rounded-3xl p-6 border border-neutral-200 shadow-xs flex flex-col justify-between space-y-4">
          <div>
            <span className="text-xs font-bold uppercase tracking-wider text-emerald-700 bg-emerald-50 px-2.5 py-1 rounded-full">
              {"Daily Operational Summary"}
            </span>
            <h1 className="text-xl sm:text-2xl font-black text-neutral-900 mt-2 leading-tight">
              {"Today's Sales & Delivery Summary"}
            </h1>
            <p className="text-xs text-neutral-500 mt-1 leading-relaxed">
              {"Live overview of revenue, pending verification, and courier dispatches"}
            </p>
          </div>

          <div className="pt-1">
            <button
              onClick={() => handleFilterClick("ALL")}
              className="w-full sm:w-auto px-5 py-2.5 bg-emerald-600 hover:bg-emerald-700 active:scale-95 text-white rounded-xl text-xs font-bold transition-all shadow-xs flex items-center justify-center gap-2 cursor-pointer"
            >
              <ShoppingBag className="w-4 h-4" />
              <span>
                {`Manage All Orders (${orders.length})`}
              </span>
            </button>
          </div>
        </div>

        {/* Box 2 (Middle): Total Earnings KPI Card (Styled like lower operational cards) */}
        <div
          onClick={() => handleFilterClick("ALL")}
          className="bg-white rounded-3xl p-6 border border-neutral-200 hover:border-emerald-400 hover:shadow-md transition-all cursor-pointer group shadow-xs flex flex-col justify-between"
          title={"Click to view all orders"}
        >
          <div className="flex justify-between items-start text-neutral-500 mb-2">
            <span className="text-xs font-bold uppercase tracking-wider group-hover:text-emerald-700 transition-colors">
              {"Total Earnings"}
            </span>
            <div className="p-2 rounded-xl bg-emerald-50 text-emerald-600 group-hover:bg-emerald-100 transition-colors">
              <DollarSign className="w-4 h-4" />
            </div>
          </div>
          <div className="my-auto py-2">
            <div className="text-3xl font-black text-neutral-900 group-hover:text-emerald-700 transition-colors">
              {formatBDT(totalRevenue)}
            </div>
            <div className="text-xs text-emerald-600 mt-1.5 font-semibold flex items-center justify-between">
              <span>{"Paid & Delivered"}</span>
              <span className="text-xs font-bold opacity-0 group-hover:opacity-100 transition-opacity">→</span>
            </div>
          </div>
        </div>

        {/* Box 3 (Right): Total Orders KPI Card (Styled like lower operational cards) */}
        <div
          onClick={() => handleFilterClick("ALL")}
          className="bg-white rounded-3xl p-6 border border-neutral-200 hover:border-blue-400 hover:shadow-md transition-all cursor-pointer group shadow-xs flex flex-col justify-between"
          title={"Click to view all orders"}
        >
          <div className="flex justify-between items-start text-neutral-500 mb-2">
            <span className="text-xs font-bold uppercase tracking-wider group-hover:text-blue-700 transition-colors">
              {"Total Orders"}
            </span>
            <div className="p-2 rounded-xl bg-blue-50 text-blue-600 group-hover:bg-blue-100 transition-colors">
              <ShoppingBag className="w-4 h-4" />
            </div>
          </div>
          <div className="my-auto py-2">
            <div className="text-3xl font-black text-neutral-900 group-hover:text-blue-700 transition-colors">
              {orders.length} {"Orders"}
            </div>
            <div className="text-xs text-blue-600 mt-1.5 font-semibold flex items-center justify-between">
              <span>
                {"Avg:"} {formatBDT(avgOrderValue)}
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
            <span>{"Processing at Pathao & Steadfast"}</span>
            <span className="text-xs font-bold opacity-0 group-hover:opacity-100 transition-opacity text-indigo-600">→</span>
          </div>
        </div>

        {/* Card 4: Pending COD Remittance */}
        <div
          onClick={() => handleFilterClick("ALL")}
          className="bg-white rounded-2xl p-5 border border-neutral-200 hover:border-emerald-400 hover:shadow-md transition-all cursor-pointer group shadow-xs"
          title={"Click to view all COD orders"}
        >
          <div className="flex justify-between items-start text-neutral-500 mb-2">
            <span className="text-xs font-semibold group-hover:text-emerald-700 transition-colors">
              {"Pending COD Remittance"}
            </span>
            <div className="p-2 rounded-xl bg-emerald-50 text-emerald-600 group-hover:bg-emerald-100 transition-colors">
              <DollarSign className="w-4 h-4" />
            </div>
          </div>
          <div className="text-2xl font-black text-emerald-700">
            {formatBDT(codPendingTotal)}
          </div>
          <div className="text-[11px] text-emerald-600 mt-1 flex items-center justify-between">
            <span>{"Deposited upon delivery"}</span>
            <span className="text-xs font-bold opacity-0 group-hover:opacity-100 transition-opacity text-emerald-700">→</span>
          </div>
        </div>
      </div>

      {/* 3. Bottom Row: 3 Columns (Recent Orders, Modular Graph Card, Ad Traffic & Sources) */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Column 1: Recent Orders */}
        <div className="bg-white rounded-3xl p-5 border border-neutral-200 shadow-xs flex flex-col justify-between space-y-4">
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

          <div className="overflow-x-auto">
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
                {orders.slice(0, 5).map((order) => (
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

          <div className="pt-2 border-t border-neutral-100 text-[11px] text-neutral-400 flex justify-between items-center">
            <span>
              {`Showing 5 of ${orders.length} orders`}
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
          orders={orders}
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
        orders={orders}
        products={products}
        isEnglish={isEnglish}
      />
    </div>
  );
};

export { AdminOverview };
