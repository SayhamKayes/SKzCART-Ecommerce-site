import { useState, useEffect, useMemo } from "react";
import {
  Search,
  Eye,
  Printer,
  Truck,
  Phone,
  RefreshCw,
  Plus,
  ChevronLeft,
  ChevronRight,
  FileText,
  Download,
  Calendar,
  X,
  Loader2,
  AlertCircle,
  Trash2,
  Check,
  AlertTriangle
} from "lucide-react";
import { formatBDT, formatBDTDateTime } from "../../utils/bangladesh";
import { apiClient } from "../../services/api";
import { realtimeService } from "../../services/realtime";
import { useLanguage } from "../../Context/LanguageContext";
import { useThemeConfig } from "../frontPanel/FrontPanelContext";

const AdminOrders = ({
  orders,
  onRefresh,
  onSelectOrder,
  onPrintInvoice,
  onOpenAssignCourier,
  currentRole,
  initialStatusFilter = "ALL"
}) => {
  const { isEnglish, t } = useLanguage();
  const { themeConfig } = useThemeConfig();
  const orderSymbol = themeConfig?.shop?.idPrefixes?.orderSymbol ?? "#";
  const [selectedStatusFilter, setSelectedStatusFilter] = useState(initialStatusFilter || "ALL");
  const [searchQuery, setSearchQuery] = useState("");
  const [isUpdating, setIsUpdating] = useState(null);
  const [currentPage, setCurrentPage] = useState(1);
  const ordersPerPage = 10;
  const [selectedOrderIds, setSelectedOrderIds] = useState([]);
  const [orderDeleteConfirm, setOrderDeleteConfirm] = useState(null); // { mode: 'single' | 'bulk', order?: object }
  const [isDeletingOrders, setIsDeletingOrders] = useState(false);

  // Statement PDF modal state
  const getTodayBDT = () => {
    const now = new Date();
    const utcMs = now.getTime() + now.getTimezoneOffset() * 60000;
    const bdt = new Date(utcMs + 6 * 3600000);
    return bdt.toISOString().slice(0, 10);
  };
  const shiftDateStr = (dateStr, deltaDays) => {
    const d = new Date(`${dateStr}T00:00:00Z`);
    d.setUTCDate(d.getUTCDate() + deltaDays);
    return d.toISOString().slice(0, 10);
  };

  const [isStatementModalOpen, setIsStatementModalOpen] = useState(false);
  const [statementPeriod, setStatementPeriod] = useState("weekly");
  const [statementStartDate, setStatementStartDate] = useState(() => shiftDateStr(getTodayBDT(), -6));
  const [statementEndDate, setStatementEndDate] = useState(() => getTodayBDT());
  const [statementStatusFilter, setStatementStatusFilter] = useState("ALL");
  const [isDownloadingStatement, setIsDownloadingStatement] = useState(false);
  const [statementError, setStatementError] = useState("");

  const activeDateWindow = useMemo(() => {
    const today = getTodayBDT();
    if (statementPeriod === "weekly") {
      return { start: shiftDateStr(today, -6), end: today, label: "Weekly (Last 7 Days)" };
    }
    if (statementPeriod === "15days") {
      return { start: shiftDateStr(today, -14), end: today, label: "15 Days Statement" };
    }
    if (statementPeriod === "monthly") {
      return { start: shiftDateStr(today, -29), end: today, label: "Monthly (Last 30 Days)" };
    }
    const s = statementStartDate || shiftDateStr(today, -6);
    const e = statementEndDate || today;
    return s <= e
      ? { start: s, end: e, label: "Custom Date Range" }
      : { start: e, end: s, label: "Custom Date Range" };
  }, [statementPeriod, statementStartDate, statementEndDate]);

  const statementPreview = useMemo(() => {
    const list = Array.isArray(orders) ? orders : [];
    const { start, end } = activeDateWindow;
    let count = 0;
    let totalRevenue = 0;
    for (const o of list) {
      if (statementStatusFilter !== "ALL" && o.status !== statementStatusFilter) continue;
      const rawDate = String(o.createdAt || "").slice(0, 10);
      if (!rawDate || rawDate.length < 10) continue;
      if (rawDate >= start && rawDate <= end) {
        count += 1;
        totalRevenue += Number(o.total || 0);
      }
    }
    return { count, totalRevenue };
  }, [orders, activeDateWindow, statementStatusFilter]);

  const handleDownloadStatement = async (e) => {
    if (e) e.preventDefault();
    setStatementError("");
    if (statementPeriod === "custom" && (!statementStartDate || !statementEndDate)) {
      setStatementError("Please select both Start Date and End Date.");
      return;
    }
    setIsDownloadingStatement(true);
    try {
      await apiClient.downloadOrderStatementPdf({
        period: statementPeriod,
        startDate: activeDateWindow.start,
        endDate: activeDateWindow.end,
        status: statementStatusFilter,
      });
    } catch (err) {
      setStatementError(err?.message || "Failed to download PDF statement.");
    } finally {
      setIsDownloadingStatement(false);
    }
  };

  useEffect(() => {
    if (initialStatusFilter) {
      setSelectedStatusFilter(initialStatusFilter);
    }
  }, [initialStatusFilter]);

  useEffect(() => {
    setCurrentPage(1);
  }, [selectedStatusFilter, searchQuery]);


  const statuses = [
    { key: "ALL", label: "All Orders" },
    { key: "PENDING", label: "Pending" },
    { key: "CONFIRMED", label: "Confirmed" },
    { key: "COURIER_CREATED", label: "Courier Booked" },
    { key: "IN_TRANSIT", label: "In Transit" },
    { key: "DELIVERED", label: "Delivered" },
    { key: "CANCELLED", label: "Cancelled" }
  ];

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

  const filteredOrders = orders.filter((o) => {
    const matchStatus = selectedStatusFilter === "ALL" || o.status === selectedStatusFilter;
    const q = searchQuery.toLowerCase();
    const matchQuery =
      !q ||
      o.id.toLowerCase().includes(q) ||
      o.address?.customerName?.toLowerCase().includes(q) ||
      o.address?.phone?.includes(q) ||
      (o.courier && o.courier.trackingId && o.courier.trackingId.toLowerCase().includes(q));
    return matchStatus && matchQuery;
  });

  const totalOrders = filteredOrders.length;
  const totalPages = Math.ceil(totalOrders / ordersPerPage) || 1;
  const startIndex = (currentPage - 1) * ordersPerPage;
  const endIndex = Math.min(startIndex + ordersPerPage, totalOrders);
  const paginatedOrders = filteredOrders.slice(startIndex, endIndex);

  useEffect(() => {
    const unsubscribe = realtimeService.subscribe((msg) => {
      if (
        msg &&
        (msg.type === "ORDER_CREATED" ||
          msg.type === "COURIER_ASSIGNED" ||
          msg.type === "ORDER_STATUS_CHANGED")
      ) {
        if (typeof onRefresh === "function") onRefresh();
      }
    });
    return () => {
      if (typeof unsubscribe === "function") unsubscribe();
    };
  }, [onRefresh]);

  const handleQuickConfirm = async (order) => {
    setIsUpdating(order.id);
    try {
      const res = await apiClient.updateOrderStatus(
        order.id,
        "CONFIRMED",
        "Operations team confirmed order via phone call.",
        "Staff Operator",
        currentRole
      );
      onRefresh();
      realtimeService.broadcast("ORDER_STATUS_CHANGED", res?.order || order);
      if (res && res.order) {
        onOpenAssignCourier(res.order);
      } else {
        onOpenAssignCourier({ ...order, status: "CONFIRMED" });
      }
    } catch (err) {
      console.error(err);
    } finally {
      setIsUpdating(null);
    }
  };

  const toggleSelectOrder = (id) => {
    setSelectedOrderIds((prev) =>
      prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id]
    );
  };

  const allVisibleSelected =
    paginatedOrders.length > 0 &&
    paginatedOrders.every((o) => selectedOrderIds.includes(o.id));

  const toggleSelectAllVisible = () => {
    if (allVisibleSelected) {
      const visibleSet = new Set(paginatedOrders.map((o) => o.id));
      setSelectedOrderIds((prev) => prev.filter((id) => !visibleSet.has(id)));
    } else {
      const merged = new Set([...selectedOrderIds, ...paginatedOrders.map((o) => o.id)]);
      setSelectedOrderIds(Array.from(merged));
    }
  };

  const handleConfirmDeleteOrders = async () => {
    if (!orderDeleteConfirm) return;
    const target = orderDeleteConfirm;
    setOrderDeleteConfirm(null);
    setIsDeletingOrders(true);
    try {
      if (target.mode === "single" && target.order) {
        const res = await apiClient.deleteOrder(target.order.id);
        if (res && res.success) {
          setSelectedOrderIds((prev) => prev.filter((id) => id !== target.order.id));
          if (typeof onRefresh === "function") await onRefresh();
          realtimeService.broadcast("ORDER_DELETED", { orderId: target.order.id });
          realtimeService.broadcast("RECYCLE_BIN_UPDATED", { itemType: "ORDER" });
        }
      } else if (target.mode === "bulk" && selectedOrderIds.length > 0) {
        const res = await apiClient.bulkDeleteOrders(selectedOrderIds);
        if (res && res.success) {
          setSelectedOrderIds([]);
          if (typeof onRefresh === "function") await onRefresh();
          realtimeService.broadcast("ORDER_DELETED", { bulk: true });
          realtimeService.broadcast("RECYCLE_BIN_UPDATED", { itemType: "ORDER" });
        }
      }
    } catch (err) {
      console.error("Failed to move order(s) to Recycle Bin:", err);
    } finally {
      setIsDeletingOrders(false);
    }
  };

  return (
    <div className="space-y-6">
      {/* Top Header */}
      <div className="bg-white rounded-3xl p-6 border border-neutral-200 shadow-xs flex flex-wrap items-center justify-between gap-4">
        <div>
          <span className="text-xs font-bold uppercase tracking-wider text-emerald-700 bg-emerald-50 px-2.5 py-1 rounded-full">
            {"Order Processing & Fulfillment"}
          </span>
          <h1 className="text-2xl font-black text-neutral-900 mt-2">
            {"Order Management"}
          </h1>
          <p className="text-xs text-neutral-500">
            {"Customer phone confirmation, courier booking (Pathao/Steadfast), invoice printing and delivery tracking."}
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2.5">
          <button
            type="button"
            onClick={() => {
              setStatementError("");
              setIsStatementModalOpen(true);
            }}
            className="px-3.5 py-2.5 rounded-xl bg-emerald-700 hover:bg-emerald-800 text-white transition-colors flex items-center gap-1.5 text-xs font-bold shadow-xs cursor-pointer"
          >
            <FileText className="w-3.5 h-3.5" />
            <span>{"Download Statement (PDF)"}</span>
          </button>

          <button
            onClick={onRefresh}
            className="p-2.5 rounded-xl border border-neutral-200 hover:bg-neutral-50 text-neutral-600 transition-colors flex items-center gap-1.5 text-xs font-semibold cursor-pointer"
          >
            <RefreshCw className="w-3.5 h-3.5" />
            <span>{"Refresh"}</span>
          </button>
        </div>
      </div>

      {/* Filter and Search Bar */}
      <div className="bg-white rounded-2xl p-4 border border-neutral-200 shadow-xs space-y-3">
        {/* Status Filter Tabs & Top Pagination Controls (Matches red box in Screenshot 1) */}
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div className="flex items-center gap-2 overflow-x-auto pb-1 no-scrollbar text-xs">
            {statuses.map((st) => {
              const count = st.key === "ALL" ? orders.length : orders.filter((o) => o.status === st.key).length;
              const isSelected = selectedStatusFilter === st.key;
              return (
                <button
                  key={st.key}
                  onClick={() => setSelectedStatusFilter(st.key)}
                  className={`px-3 py-1.5 rounded-xl font-semibold whitespace-nowrap transition-all flex items-center gap-1.5 cursor-pointer ${
                    isSelected
                      ? "bg-neutral-900 text-white shadow-xs"
                      : "bg-neutral-100 text-neutral-600 hover:bg-neutral-200"
                  }`}
                >
                  <span>{st.label}</span>
                  <span
                    className={`text-[10px] px-1.5 py-0.2 rounded-full ${
                      isSelected ? "bg-neutral-800 text-emerald-300" : "bg-neutral-200 text-neutral-700"
                    }`}
                  >
                    {count}
                  </span>
                </button>
              );
            })}
          </div>

          {/* Top Pagination Controls */}
          {totalPages > 1 && (
            <div className="flex items-center gap-1.5 text-xs ml-auto">
              <span className="text-[11px] font-semibold text-neutral-500 mr-1 hidden sm:inline">
                {`Page ${currentPage} of ${totalPages}`}
              </span>
              <button
                type="button"
                disabled={currentPage === 1}
                onClick={() => setCurrentPage((p) => Math.max(1, p - 1))}
                className="p-1.5 rounded-lg border border-neutral-200 hover:bg-neutral-100 disabled:opacity-40 disabled:hover:bg-transparent text-neutral-600 transition-colors cursor-pointer"
                title={"Previous Page"}
              >
                <ChevronLeft className="w-3.5 h-3.5" />
              </button>
              <span className="text-xs font-bold text-neutral-800 px-2 py-0.5 bg-neutral-100 rounded-md">
                {currentPage} / {totalPages}
              </span>
              <button
                type="button"
                disabled={currentPage === totalPages}
                onClick={() => setCurrentPage((p) => Math.min(totalPages, p + 1))}
                className="p-1.5 rounded-lg border border-neutral-200 hover:bg-neutral-100 disabled:opacity-40 disabled:hover:bg-transparent text-neutral-600 transition-colors cursor-pointer"
                title={"Next Page"}
              >
                <ChevronRight className="w-3.5 h-3.5" />
              </button>
            </div>
          )}
        </div>

        {/* Search Input & Bulk Delete */}
        <div className="flex flex-wrap items-center gap-3">
          <div className="relative flex-1 min-w-[240px]">
            <Search className="w-4 h-4 text-neutral-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              placeholder={
                "Search by Order ID (BD-...), customer name, phone or courier tracking code..."
              }
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-10 pr-4 py-2.5 bg-neutral-50 rounded-xl border border-neutral-200 text-xs focus:bg-white focus:border-emerald-600 focus:outline-hidden"
            />
          </div>

          {selectedOrderIds.length > 0 && (
            <div className="flex items-center gap-2">
              <span className="text-xs font-bold text-neutral-700 bg-neutral-100 px-3 py-2 rounded-xl">
                {selectedOrderIds.length} selected
              </span>
              <button
                type="button"
                disabled={isDeletingOrders}
                onClick={() => setOrderDeleteConfirm({ mode: "bulk" })}
                className="px-3.5 py-2 rounded-xl bg-rose-600 hover:bg-rose-700 disabled:opacity-50 text-white text-xs font-bold flex items-center gap-1.5 cursor-pointer shadow-xs"
              >
                <Trash2 className="w-3.5 h-3.5" />
                <span>{"Delete Selected"}</span>
              </button>
            </div>
          )}
        </div>
      </div>

      {/* Orders Table */}
      <div className="bg-white rounded-3xl border border-neutral-200 shadow-xs overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead className="bg-neutral-50 text-neutral-500 font-bold border-b border-neutral-200">
              <tr>
                <th className="py-3 px-4 w-10">
                  <button
                    type="button"
                    onClick={toggleSelectAllVisible}
                    className={`w-4 h-4 rounded border flex items-center justify-center transition-colors cursor-pointer ${
                      allVisibleSelected
                        ? "bg-emerald-600 border-emerald-600 text-white"
                        : "border-neutral-300 bg-white"
                    }`}
                    title="Select All on Page"
                  >
                    {allVisibleSelected && <Check className="w-3 h-3" />}
                  </button>
                </th>
                <th className="py-3 px-4">{"Order ID & Date"}</th>
                <th className="py-3 px-4">{"Customer Details"}</th>
                <th className="py-3 px-4">{"District / Address"}</th>
                <th className="py-3 px-4">{"Items & Total"}</th>
                <th className="py-3 px-4">{"Payment"}</th>
                <th className="py-3 px-4">{"Risk Score"}</th>
                <th className="py-3 px-4">{"Courier Info"}</th>
                <th className="py-3 px-4">{"Order Status"}</th>
                <th className="py-3 px-4 text-right">{"Actions"}</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-neutral-100">
              {paginatedOrders.length === 0 ? (
                <tr>
                  <td colSpan={10} className="py-12 text-center text-neutral-400">
                    {"No orders found matching your search."}
                  </td>
                </tr>
              ) : (
                paginatedOrders.map((order) => (
                  <tr
                    key={order.id}
                    className={`transition-colors ${
                      selectedOrderIds.includes(order.id)
                        ? "bg-rose-50/30"
                        : "hover:bg-neutral-50/80"
                    }`}
                  >
                    <td className="py-3.5 px-4">
                      <button
                        type="button"
                        onClick={() => toggleSelectOrder(order.id)}
                        className={`w-4 h-4 rounded border flex items-center justify-center transition-colors cursor-pointer ${
                          selectedOrderIds.includes(order.id)
                            ? "bg-emerald-600 border-emerald-600 text-white"
                            : "border-neutral-300 bg-white"
                        }`}
                      >
                        {selectedOrderIds.includes(order.id) && <Check className="w-3 h-3" />}
                      </button>
                    </td>
                    {/* ID & Date */}
                    <td className="py-3.5 px-4">
                      <span className="font-mono font-bold text-neutral-900 block">
                        {orderSymbol}{order.id}
                      </span>
                      <span className="text-[10px] text-neutral-500 block font-mono">
                        {formatBDTDateTime(order.createdAt, isEnglish)}
                      </span>
                    </td>

                    {/* Customer */}
                    <td className="py-3.5 px-4">
                      <span className="font-bold text-neutral-900 block">
                        {order.address?.customerName}
                      </span>
                      <a
                        href={`tel:${order.address?.phone}`}
                        className="text-[11px] text-emerald-700 hover:underline font-mono block mt-0.5 flex items-center gap-1"
                      >
                        <Phone className="w-3 h-3" />
                        <span>{order.address?.phone}</span>
                      </a>
                    </td>

                    {/* District */}
                    <td className="py-3.5 px-4 max-w-xs">
                      <span className="font-semibold text-neutral-800 block">
                        {order.address?.district}
                      </span>
                      <span className="text-[11px] text-neutral-500 line-clamp-1">
                        {order.address?.thana}, {order.address?.fullAddress}
                      </span>
                    </td>

                    {/* Items & Total */}
                    <td className="py-3.5 px-4">
                      <span className="font-extrabold text-neutral-900 block">
                        {formatBDT(order.total)}
                      </span>
                      <span className="text-[10px] text-neutral-400 block">
                        {order.items?.length} {"items"}
                      </span>
                    </td>

                    {/* Payment */}
                    <td className="py-3.5 px-4">
                      <span className="text-[10px] font-bold px-1.5 py-0.5 rounded bg-neutral-100 text-neutral-800">
                        {order.paymentMethod}
                      </span>
                      <span
                        className={`text-[10px] font-semibold block mt-1 ${
                          order.paymentStatus === "PAID" ? "text-emerald-700" : "text-amber-700"
                        }`}
                      >
                        {order.paymentStatus}
                      </span>
                    </td>

                    {/* Fraud Risk */}
                    <td className="py-3.5 px-4">
                      <span
                        className={`text-[10px] font-bold px-2 py-0.5 rounded-full inline-block ${
                          order.riskScore < 20
                            ? "bg-emerald-100 text-emerald-800"
                            : order.riskScore < 50
                            ? "bg-amber-100 text-amber-800"
                            : "bg-rose-100 text-rose-800"
                        }`}
                        title={order.riskFactors?.join(", ")}
                      >
                        {order.riskScore < 20
                          ? ("Safe")
                          : order.riskScore < 50
                          ? ("Moderate")
                          : ("High Risk")}{" "}
                        ({order.riskScore})
                      </span>
                    </td>

                    {/* Courier Info */}
                    <td className="py-3.5 px-4">
                      {order.courier ? (
                        <div>
                          <span className="font-bold text-[11px] text-neutral-800 capitalize flex items-center gap-1">
                            <Truck className="w-3 h-3 text-emerald-600" />
                            <span>{order.courier.provider}</span>
                          </span>
                          <span className="font-mono text-[10px] text-neutral-400 block">
                            {order.courier.trackingId}
                          </span>
                        </div>
                      ) : (
                        <button
                          onClick={() => onOpenAssignCourier(order)}
                          className="text-[11px] font-bold text-emerald-700 hover:text-emerald-800 hover:underline flex items-center gap-1 cursor-pointer"
                        >
                          <Plus className="w-3 h-3" />
                          <span>{"Assign Courier"}</span>
                        </button>
                      )}
                    </td>

                    {/* Status Pill */}
                    <td className="py-3.5 px-4">
                      <span
                        className={`text-[10px] font-bold px-2.5 py-1 rounded-full uppercase tracking-wider ${
                          order.status === "DELIVERED"
                            ? "bg-emerald-100 text-emerald-800"
                            : order.status === "PENDING"
                            ? "bg-amber-100 text-amber-800"
                            : order.status === "IN_TRANSIT"
                            ? "bg-indigo-100 text-indigo-800"
                            : order.status === "CONFIRMED"
                            ? "bg-blue-100 text-blue-800"
                            : "bg-neutral-100 text-neutral-800"
                        }`}
                      >
                        {getStatusBadge(order.status)}
                      </span>
                    </td>

                    {/* Actions */}
                    <td className="py-3.5 px-4 text-right">
                      <div className="flex items-center justify-end gap-1.5">
                        {order.status === "PENDING" && (
                          <button
                            onClick={() => handleQuickConfirm(order)}
                            disabled={isUpdating === order.id}
                            className="px-2.5 py-1 bg-emerald-600 hover:bg-emerald-700 text-white rounded-lg text-[11px] font-bold transition-colors shadow-xs cursor-pointer"
                            title={"Confirm Order"}
                          >
                            {"Confirm Order"}
                          </button>
                        )}

                        {order.status === "CONFIRMED" && (
                          <button
                            onClick={() => onOpenAssignCourier(order)}
                            className="px-2.5 py-1 bg-indigo-600 hover:bg-indigo-700 text-white rounded-lg text-[11px] font-bold transition-colors shadow-xs flex items-center gap-1 cursor-pointer"
                            title={"Assign Courier"}
                          >
                            <Truck className="w-3 h-3" />
                            <span>{"Assign Courier"}</span>
                          </button>
                        )}

                        <button
                          onClick={() => onPrintInvoice(order)}
                          className="p-1.5 rounded-lg border border-neutral-200 hover:bg-neutral-100 text-neutral-600 transition-colors cursor-pointer"
                          title={"Print Invoice"}
                        >
                          <Printer className="w-3.5 h-3.5" />
                        </button>

                        <button
                          onClick={() => onSelectOrder(order)}
                          className="p-1.5 rounded-lg bg-neutral-900 hover:bg-neutral-800 text-white transition-colors cursor-pointer"
                          title={"View Details"}
                        >
                          <Eye className="w-4 h-4" />
                        </button>

                        <button
                          type="button"
                          disabled={isDeletingOrders}
                          onClick={() => setOrderDeleteConfirm({ mode: "single", order })}
                          className="p-1.5 rounded-lg border border-rose-200 bg-rose-50 hover:bg-rose-100 text-rose-600 transition-colors cursor-pointer disabled:opacity-50"
                          title={"Delete Order (Move to Recycle Bin)"}
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>

        {/* Bottom Pagination Bar */}
        {totalPages > 1 && (
          <div className="p-4 border-t border-neutral-200 bg-white flex flex-wrap items-center justify-between gap-3 text-xs">
            <div className="text-neutral-500 font-medium">
              {`Showing ${totalOrders > 0 ? startIndex + 1 : 0}-${endIndex} of ${totalOrders} orders`}
            </div>

            <div className="flex items-center gap-1">
              <button
                type="button"
                disabled={currentPage === 1}
                onClick={() => setCurrentPage((p) => Math.max(1, p - 1))}
                className="px-2.5 py-1.5 rounded-lg border border-neutral-200 hover:bg-neutral-100 disabled:opacity-40 disabled:hover:bg-transparent text-neutral-700 font-semibold transition-colors flex items-center gap-1 cursor-pointer"
              >
                <ChevronLeft className="w-3.5 h-3.5" />
                <span className="hidden sm:inline">{"Previous"}</span>
              </button>

              {Array.from({ length: totalPages }, (_, i) => i + 1)
                .filter(
                  (num) =>
                    num === 1 ||
                    num === totalPages ||
                    (num >= currentPage - 1 && num <= currentPage + 1)
                )
                .reduce((acc, num, idx, arr) => {
                  if (idx > 0 && num - arr[idx - 1] > 1) {
                    acc.push("...");
                  }
                  acc.push(num);
                  return acc;
                }, [])
                .map((item, idx) =>
                  item === "..." ? (
                    <span key={`dots-${idx}`} className="px-2 text-neutral-400 font-bold">
                      ...
                    </span>
                  ) : (
                    <button
                      key={`page-${item}`}
                      onClick={() => setCurrentPage(item)}
                      className={`w-8 h-8 rounded-lg font-bold text-xs transition-colors cursor-pointer ${
                        currentPage === item
                          ? "bg-neutral-900 text-white shadow-xs"
                          : "hover:bg-neutral-100 text-neutral-700 border border-neutral-200"
                      }`}
                    >
                      {item}
                    </button>
                  )
                )}

              <button
                type="button"
                disabled={currentPage === totalPages}
                onClick={() => setCurrentPage((p) => Math.min(totalPages, p + 1))}
                className="px-2.5 py-1.5 rounded-lg border border-neutral-200 hover:bg-neutral-100 disabled:opacity-40 disabled:hover:bg-transparent text-neutral-700 font-semibold transition-colors flex items-center gap-1 cursor-pointer"
              >
                <span className="hidden sm:inline">{"Next"}</span>
                <ChevronRight className="w-3.5 h-3.5" />
              </button>
            </div>
          </div>
        )}
      </div>

      {/* Order Statement PDF Download Modal */}
      {isStatementModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-xs">
          <div className="bg-white rounded-3xl border border-neutral-200 shadow-2xl w-full max-w-lg overflow-hidden">
            <div className="px-6 py-4 bg-neutral-900 text-white flex items-center justify-between">
              <div className="flex items-center gap-2.5">
                <div className="w-9 h-9 rounded-xl bg-emerald-500/20 text-emerald-300 flex items-center justify-center">
                  <FileText className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="text-sm font-black tracking-tight">{"Order Statement Export (PDF)"}</h3>
                  <p className="text-[11px] text-neutral-300">{"Live database statement with summary totals & order ledger"}</p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setIsStatementModalOpen(false)}
                className="p-1.5 rounded-lg hover:bg-white/10 text-neutral-300 hover:text-white transition-colors cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <form onSubmit={handleDownloadStatement} className="p-6 space-y-5 text-xs">
              <div>
                <label className="block font-bold text-neutral-800 mb-2">
                  {"Select Statement Period"}
                </label>
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
                  {[
                    { id: "weekly", title: "Weekly", sub: "Last 7 Days" },
                    { id: "15days", title: "15 Days", sub: "Last 15 Days" },
                    { id: "monthly", title: "Monthly", sub: "Last 30 Days" },
                    { id: "custom", title: "Custom", sub: "Date Range" },
                  ].map((opt) => {
                    const active = statementPeriod === opt.id;
                    return (
                      <button
                        key={opt.id}
                        type="button"
                        onClick={() => {
                          setStatementPeriod(opt.id);
                          setStatementError("");
                        }}
                        className={`p-3 rounded-2xl border text-left transition-all cursor-pointer ${
                          active
                            ? "bg-emerald-50 border-emerald-600 ring-2 ring-emerald-500/20 text-emerald-950"
                            : "bg-neutral-50 border-neutral-200 hover:border-neutral-300 text-neutral-700"
                        }`}
                      >
                        <div className="font-black text-xs">{opt.title}</div>
                        <div className={`text-[10px] mt-0.5 ${active ? "text-emerald-700 font-semibold" : "text-neutral-500"}`}>
                          {opt.sub}
                        </div>
                      </button>
                    );
                  })}
                </div>
              </div>

              {statementPeriod === "custom" && (
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 p-3.5 rounded-2xl bg-neutral-50 border border-neutral-200">
                  <div>
                    <label className="block font-bold text-neutral-700 mb-1 flex items-center gap-1">
                      <Calendar className="w-3.5 h-3.5 text-emerald-600" />
                      <span>{"From Date"}</span>
                    </label>
                    <input
                      type="date"
                      value={statementStartDate}
                      onChange={(e) => setStatementStartDate(e.target.value)}
                      required
                      className="w-full bg-white border border-neutral-300 rounded-xl px-3 py-2 text-xs font-semibold text-neutral-800 focus:outline-none focus:border-emerald-600"
                    />
                  </div>
                  <div>
                    <label className="block font-bold text-neutral-700 mb-1 flex items-center gap-1">
                      <Calendar className="w-3.5 h-3.5 text-emerald-600" />
                      <span>{"To Date"}</span>
                    </label>
                    <input
                      type="date"
                      value={statementEndDate}
                      onChange={(e) => setStatementEndDate(e.target.value)}
                      required
                      className="w-full bg-white border border-neutral-300 rounded-xl px-3 py-2 text-xs font-semibold text-neutral-800 focus:outline-none focus:border-emerald-600"
                    />
                  </div>
                </div>
              )}

              <div>
                <label className="block font-bold text-neutral-800 mb-1.5">
                  {"Filter by Order Status"}
                </label>
                <select
                  value={statementStatusFilter}
                  onChange={(e) => setStatementStatusFilter(e.target.value)}
                  className="w-full bg-neutral-50 border border-neutral-200 rounded-xl px-3.5 py-2.5 text-xs font-semibold text-neutral-800 focus:outline-none focus:border-emerald-600"
                >
                  {statuses.map((st) => (
                    <option key={st.key} value={st.key}>
                      {st.label}
                    </option>
                  ))}
                </select>
              </div>

              <div className="p-4 rounded-2xl bg-emerald-50/70 border border-emerald-200 flex items-center justify-between gap-4">
                <div>
                  <span className="text-[10px] font-bold uppercase tracking-wider text-emerald-700 block">
                    {activeDateWindow.label}
                  </span>
                  <span className="text-xs font-mono font-bold text-neutral-800">
                    {activeDateWindow.start} {"→"} {activeDateWindow.end}
                  </span>
                </div>
                <div className="text-right">
                  <span className="text-xs font-black text-emerald-900 block">
                    {statementPreview.count} {statementPreview.count === 1 ? "Order" : "Orders"}
                  </span>
                  <span className="text-[11px] font-bold text-emerald-700">
                    {formatBDT(statementPreview.totalRevenue, isEnglish)}
                  </span>
                </div>
              </div>

              {statementError && (
                <div className="p-3 rounded-xl bg-rose-50 border border-rose-200 text-rose-700 text-xs font-semibold flex items-center gap-2">
                  <AlertCircle className="w-4 h-4 shrink-0" />
                  <span>{statementError}</span>
                </div>
              )}

              <div className="flex items-center justify-end gap-2.5 pt-2 border-t border-neutral-100">
                <button
                  type="button"
                  onClick={() => setIsStatementModalOpen(false)}
                  className="px-4 py-2.5 rounded-xl border border-neutral-200 hover:bg-neutral-50 text-neutral-700 font-bold text-xs cursor-pointer"
                >
                  {"Cancel"}
                </button>
                <button
                  type="submit"
                  disabled={isDownloadingStatement}
                  className="px-5 py-2.5 rounded-xl bg-emerald-700 hover:bg-emerald-800 disabled:opacity-60 text-white font-bold text-xs shadow-sm flex items-center gap-2 cursor-pointer"
                >
                  {isDownloadingStatement ? (
                    <>
                      <Loader2 className="w-4 h-4 animate-spin" />
                      <span>{"Generating PDF..."}</span>
                    </>
                  ) : (
                    <>
                      <Download className="w-4 h-4" />
                      <span>{"Download PDF Statement"}</span>
                    </>
                  )}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Move Order to Recycle Bin Confirmation Modal */}
      {orderDeleteConfirm && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-xs">
          <div className="bg-white rounded-3xl border border-neutral-200 shadow-2xl w-full max-w-md p-6 space-y-4">
            <div className="flex items-start gap-3">
              <div className="w-11 h-11 rounded-2xl bg-rose-100 text-rose-600 flex items-center justify-center shrink-0">
                <AlertTriangle className="w-6 h-6" />
              </div>
              <div>
                <h3 className="text-base font-black text-neutral-900">
                  {orderDeleteConfirm.mode === "bulk"
                    ? `Delete ${selectedOrderIds.length} Selected Orders?`
                    : `Delete Order #${orderDeleteConfirm.order?.id}?`}
                </h3>
                <p className="text-xs text-neutral-600 mt-1">
                  {"Deleted orders will be moved to the "}
                  <strong className="text-neutral-900">{"Recycle Bin"}</strong>
                  {". You can restore them anytime or permanently delete them from the database later."}
                </p>
              </div>
            </div>

            <div className="flex items-center justify-end gap-2.5 pt-2">
              <button
                type="button"
                onClick={() => setOrderDeleteConfirm(null)}
                className="px-4 py-2 rounded-xl border border-neutral-200 hover:bg-neutral-50 text-neutral-700 font-bold text-xs cursor-pointer"
              >
                {"Cancel"}
              </button>
              <button
                type="button"
                disabled={isDeletingOrders}
                onClick={handleConfirmDeleteOrders}
                className="px-4 py-2 rounded-xl bg-rose-600 hover:bg-rose-700 disabled:opacity-50 text-white font-bold text-xs shadow-sm cursor-pointer flex items-center gap-1.5"
              >
                <Trash2 className="w-3.5 h-3.5" />
                <span>{"Move to Recycle Bin"}</span>
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export { AdminOrders };
