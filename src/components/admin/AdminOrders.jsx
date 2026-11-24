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
  ChevronDown,
  FileText,
  Download,
  Calendar,
  X,
  Loader2,
  AlertCircle,
  Trash2,
  Check,
  AlertTriangle,
  CreditCard,
  Smartphone,
  Clock,
  ShieldCheck,
  Play,
  CheckCircle2,
  Banknote
} from "lucide-react";
import { formatBDT, formatBDTDateTime } from "../../utils/bangladesh";
import { formatOrderStatusLabel } from "../../utils/orderStatus";
import { apiClient } from "../../services/api";
import { realtimeService } from "../../services/realtime";
import { useLanguage } from "../../Context/LanguageContext";
import { useThemeConfig } from "../frontPanel/FrontPanelContext";

const AdminOrders = ({
  orders = [],
  onRefresh,
  onSelectOrder,
  onPrintInvoice,
  onOpenAssignCourier,
  currentRole,
  initialStatusFilter = "ALL",
  initialPaymentMethodFilter = "ALL"
}) => {
  const { isEnglish, t } = useLanguage();
  const { themeConfig } = useThemeConfig();
  const idPrefixes = themeConfig?.shop?.idPrefixes || {};
  const orderSymbol = idPrefixes.orderSymbol !== undefined ? idPrefixes.orderSymbol : "#";
  const orderIdPrefix = idPrefixes.orderIdPrefix || "BD";
  const reconciliationOrderPrefix = idPrefixes.reconciliationOrderPrefix || "";
  const reconciliationTrxPrefix = idPrefixes.reconciliationTrxPrefix || "";

  const formatReconOrderId = (id) =>
    `${reconciliationOrderPrefix ? `${reconciliationOrderPrefix}-` : ""}${orderSymbol}${id}`;
  const formatReconTrxId = (trxId) =>
    `${reconciliationTrxPrefix ? `${reconciliationTrxPrefix}-` : ""}${trxId}`;

  const normalizedInitialStatus =
    initialStatusFilter === "RECONCILIATION" || initialStatusFilter === "GATEWAY_TXNS"
      ? "ALL"
      : initialStatusFilter || "ALL";
  const [selectedStatusFilter, setSelectedStatusFilter] = useState(normalizedInitialStatus);
  const [searchQuery, setSearchQuery] = useState("");
  const [paymentMethodFilter, setPaymentMethodFilter] = useState("ALL");
  const [paymentStatusFilter, setPaymentStatusFilter] = useState("ALL");
  const [isUpdating, setIsUpdating] = useState(null);
  const [validationDropdown, setValidationDropdown] = useState(null); // { order, top, right }
  const [currentPage, setCurrentPage] = useState(1);
  const ordersPerPage = 10;
  const [selectedOrderIds, setSelectedOrderIds] = useState([]);
  const [orderDeleteConfirm, setOrderDeleteConfirm] = useState(null); // { mode: 'single' | 'bulk', order?: object }
  const [isDeletingOrders, setIsDeletingOrders] = useState(false);

  // Gateway Transactions & Reconciliation Popup Modal state
  const [transactions, setTransactions] = useState([]);
  const [isLoadingTxns, setIsLoadingTxns] = useState(false);
  const [selectedTxn, setSelectedTxn] = useState(null);
  const [isReconModalOpen, setIsReconModalOpen] = useState(initialStatusFilter === "RECONCILIATION");
  const [reconSelectedMethod, setReconSelectedMethod] = useState(initialPaymentMethodFilter || "ALL");
  const [reconCurrentPage, setReconCurrentPage] = useState(1);
  const [selectedReconOrderIds, setSelectedReconOrderIds] = useState([]);
  const [paymentDeleteDialog, setPaymentDeleteDialog] = useState(null); // { scope: 'txn' | 'recon', mode: 'single' | 'bulk', item?: obj }
  const [isDeletingPaymentItems, setIsDeletingPaymentItems] = useState(false);
  const [gatewayConfig, setGatewayConfig] = useState({
    gateway_id: "sslcommerz",
    name: "SSLCOMMERZ Multi-Card Gateway",
    store_id: "testbox",
    is_sandbox: true,
    is_active: true,
    fee_percent: 2.0,
  });

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
    if (initialStatusFilter === "RECONCILIATION") {
      setSelectedStatusFilter("ALL");
      setIsReconModalOpen(true);
    } else if (initialStatusFilter === "GATEWAY_TXNS") {
      setSelectedStatusFilter("ALL");
    } else if (initialStatusFilter) {
      setSelectedStatusFilter(initialStatusFilter);
    }
  }, [initialStatusFilter]);

  useEffect(() => {
    if (initialPaymentMethodFilter) {
      setReconSelectedMethod(initialPaymentMethodFilter);
    }
  }, [initialPaymentMethodFilter]);

  useEffect(() => {
    setCurrentPage(1);
  }, [selectedStatusFilter, searchQuery, paymentMethodFilter, paymentStatusFilter]);

  useEffect(() => {
    setReconCurrentPage(1);
  }, [reconSelectedMethod]);

  const fetchTransactions = async () => {
    setIsLoadingTxns(true);
    try {
      const data = await apiClient.getPaymentTransactions();
      setTransactions(Array.isArray(data) ? data : []);
    } catch (err) {
      console.warn("Failed to fetch transactions:", err);
    } finally {
      setIsLoadingTxns(false);
    }
  };

  const fetchGatewayConfig = async () => {
    try {
      const cfg = await apiClient.getPaymentConfig();
      if (cfg) {
        setGatewayConfig(cfg);
      }
    } catch (err) {
      console.warn("Failed to fetch gateway config:", err);
    }
  };

  useEffect(() => {
    fetchTransactions();
    fetchGatewayConfig();
  }, []);

  useEffect(() => {
    if (!selectedTxn && !isReconModalOpen && !validationDropdown) return;
    const handleKeyDown = (e) => {
      if (e.key === "Escape") {
        if (validationDropdown) setValidationDropdown(null);
        else if (selectedTxn) setSelectedTxn(null);
        else if (isReconModalOpen) setIsReconModalOpen(false);
      }
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [selectedTxn, isReconModalOpen, validationDropdown]);

  const orderStatuses = [
    { key: "ALL", label: "All Orders" },
    { key: "PENDING", label: "Pending" },
    { key: "CONFIRMED", label: "Confirmed" },
    { key: "COURIER_CREATED", label: "Courier Booked" },
    { key: "PICKED_UP", label: "Picked Up" },
    { key: "IN_TRANSIT", label: "In Transit" },
    { key: "OUT_FOR_DELIVERY", label: "Out for Delivery" },
    { key: "DELIVERED", label: "Delivered" },
    { key: "CANCELLED", label: "Cancelled" },
    { key: "RETURNED", label: "Returned" }
  ];

  const tabItems = [
    ...orderStatuses,
    { key: "FAILED", label: "Failed" }
  ];

  const isPaymentTab = selectedStatusFilter === "FAILED";

  const txnByOrderId = useMemo(() => {
    const map = {};
    for (const t of transactions) {
      if (t.order_id && !map[t.order_id]) {
        map[t.order_id] = t;
      }
    }
    return map;
  }, [transactions]);

  const failedRecords = useMemo(() => {
    const seenOrderIds = new Set();
    const list = [];
    for (const t of transactions) {
      if (t.status === "FAILED") {
        if (t.order_id) seenOrderIds.add(t.order_id);
        list.push({
          key: `txn-${t.id || t.tran_id}`,
          kind: "txn",
          txn: t,
          orderId: t.order_id,
          tranId: t.tran_id,
          customerName: t.customer_name || "Guest",
          customerPhone: t.customer_phone || "",
          method: t.payment_method || "SSLCOMMERZ",
          amount: t.amount,
          reason: t.error_reason || "Payment failed or rejected",
          createdAt: t.created_at,
        });
      }
    }
    for (const o of orders) {
      const oStatus = String(o.status || "").toUpperCase();
      const pStatus = String(o.paymentStatus || "").toUpperCase();
      const verStatus = o.address?.verificationStatus;
      if ((oStatus === "FAILED" || pStatus === "FAILED" || verStatus === "NOT_VERIFIED") && !seenOrderIds.has(o.id)) {
        list.push({
          key: `ord-${o.id}`,
          kind: "order",
          order: o,
          orderId: o.id,
          tranId: o.address?.paymentTrxId || txnByOrderId[o.id]?.tran_id || "N/A",
          customerName: o.address?.customerName || "Customer",
          customerPhone: o.address?.phone || "",
          method: o.paymentMethod || "SSLCOMMERZ",
          amount: o.total,
          reason: verStatus === "NOT_VERIFIED" ? "Payment Not Verified by Admin" : "Order / Payment Failed",
          createdAt: o.createdAt,
        });
      }
    }
    return list;
  }, [transactions, orders, txnByOrderId]);

  const paymentSummary = useMemo(() => {
    const channels = {
      SSLCOMMERZ: { activeAmount: 0, activeCount: 0, paidAmount: 0, paidCount: 0, pendingCount: 0 },
      BKASH: { activeAmount: 0, activeCount: 0, paidAmount: 0, paidCount: 0, pendingCount: 0 },
      NAGAD: { activeAmount: 0, activeCount: 0, paidAmount: 0, paidCount: 0, pendingCount: 0 },
      ROCKET: { activeAmount: 0, activeCount: 0, paidAmount: 0, paidCount: 0, pendingCount: 0 },
      COD: { activeAmount: 0, activeCount: 0, paidAmount: 0, paidCount: 0, pendingCount: 0 },
    };
    let cancelledOrdersCount = 0;
    let cancelledOrdersAmount = 0;

    for (const o of orders) {
      const amount = Number(o.total || 0);
      const orderStatus = String(o.status || "").toUpperCase();
      if (orderStatus === "CANCELLED") {
        cancelledOrdersCount += 1;
        cancelledOrdersAmount += amount;
        continue;
      }
      const methodKey = String(o.paymentMethod || "").toUpperCase();
      const bucket = channels[methodKey];
      if (!bucket) continue;
      bucket.activeCount += 1;
      bucket.activeAmount += amount;
      if (String(o.paymentStatus || "").toUpperCase() === "PAID") {
        bucket.paidCount += 1;
        bucket.paidAmount += amount;
      } else {
        bucket.pendingCount += 1;
      }
    }

    const validatedTxns = transactions.filter((t) => t.status === "VALIDATED");
    const validatedTxnAmount = validatedTxns.reduce((acc, t) => acc + parseFloat(t.amount || 0), 0);
    const failedTxns = transactions.filter((t) => t.status === "FAILED" || t.status === "CANCELLED");
    const failedTxnAmount = failedTxns.reduce((acc, t) => acc + parseFloat(t.amount || 0), 0);
    const initiatedTxnCount = transactions.filter((t) => t.status === "INITIATED").length;

    return {
      channels,
      cancelledOrdersCount,
      cancelledOrdersAmount,
      validatedTxnCount: validatedTxns.length,
      validatedTxnAmount,
      failedTxnCount: failedTxns.length,
      failedTxnAmount,
      initiatedTxnCount,
    };
  }, [orders, transactions]);

  const getTxnStatusBadge = (status) => {
    switch (status) {
      case "VALIDATED":
        return (
          <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[10px] font-extrabold bg-emerald-100 text-emerald-800 border border-emerald-200">
            <Check className="w-3 h-3" /> {"VALIDATED"}
          </span>
        );
      case "INITIATED":
        return (
          <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[10px] font-extrabold bg-blue-100 text-blue-800 border border-blue-200">
            <Clock className="w-3 h-3" /> {"INITIATED"}
          </span>
        );
      case "FAILED":
        return (
          <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[10px] font-extrabold bg-rose-100 text-rose-800 border border-rose-200">
            <X className="w-3 h-3" /> {"FAILED"}
          </span>
        );
      case "CANCELLED":
        return (
          <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[10px] font-extrabold bg-neutral-100 text-neutral-600 border border-neutral-300">
            {"CANCELLED"}
          </span>
        );
      default:
        return (
          <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-neutral-100 text-neutral-600">
            {status}
          </span>
        );
    }
  };

  const getStatusBadge = (status) => formatOrderStatusLabel(status);

  const filteredOrders = orders.filter((o) => {
    const matchStatus = selectedStatusFilter === "ALL" || o.status === selectedStatusFilter;
    const method = String(o.paymentMethod || "").toUpperCase();
    const matchMethod = paymentMethodFilter === "ALL" || method === paymentMethodFilter;
    const pStatus = String(o.paymentStatus || "").toUpperCase();
    const verStatus = o.address?.verificationStatus;
    const linkedTxn = txnByOrderId[o.id];
    const txnStatus = String(linkedTxn?.status || "").toUpperCase();
    let matchPayStatus = true;
    if (paymentStatusFilter === "PAID_VALIDATED") {
      matchPayStatus = pStatus === "PAID" || txnStatus === "VALIDATED";
    } else if (paymentStatusFilter === "INITIATED_PENDING") {
      matchPayStatus = pStatus === "PENDING" || txnStatus === "INITIATED";
    } else if (paymentStatusFilter === "UNPAID") {
      matchPayStatus = pStatus === "UNPAID";
    } else if (paymentStatusFilter === "FAILED_CANCELLED") {
      matchPayStatus = pStatus === "FAILED" || txnStatus === "FAILED" || txnStatus === "CANCELLED";
    } else if (paymentStatusFilter === "VERIFIED") {
      matchPayStatus = verStatus === "VERIFIED";
    } else if (paymentStatusFilter === "PENDING_VERIFY") {
      matchPayStatus = verStatus !== "VERIFIED" && verStatus !== "NOT_VERIFIED";
    } else if (paymentStatusFilter === "NOT_VERIFIED") {
      matchPayStatus = verStatus === "NOT_VERIFIED";
    }

    const q = searchQuery.toLowerCase();
    const matchQuery =
      !q ||
      o.id.toLowerCase().includes(q) ||
      o.address?.customerName?.toLowerCase().includes(q) ||
      o.address?.phone?.includes(q) ||
      (o.address?.paymentTrxId && o.address.paymentTrxId.toLowerCase().includes(q)) ||
      (linkedTxn?.tran_id && linkedTxn.tran_id.toLowerCase().includes(q)) ||
      (o.courier && o.courier.trackingId && o.courier.trackingId.toLowerCase().includes(q));
    return matchStatus && matchMethod && matchPayStatus && matchQuery;
  });

  const totalOrders = filteredOrders.length;
  const totalPages = Math.ceil(totalOrders / ordersPerPage) || 1;
  const startIndex = (currentPage - 1) * ordersPerPage;
  const endIndex = Math.min(startIndex + ordersPerPage, totalOrders);
  const paginatedOrders = filteredOrders.slice(startIndex, endIndex);

  const filteredReconOrders = orders.filter((o) => {
    if (reconSelectedMethod === "ALL") return true;
    return String(o.paymentMethod || "").toUpperCase() === reconSelectedMethod;
  });
  const totalReconOrders = filteredReconOrders.length;
  const totalReconPages = Math.ceil(totalReconOrders / 10) || 1;
  const reconStartIndex = (reconCurrentPage - 1) * 10;
  const reconEndIndex = Math.min(reconStartIndex + 10, totalReconOrders);
  const paginatedReconOrders = filteredReconOrders.slice(reconStartIndex, reconEndIndex);

  const toggleSelectReconOrder = (id) => {
    setSelectedReconOrderIds((prev) =>
      prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id]
    );
  };
  const allVisibleReconSelected =
    paginatedReconOrders.length > 0 && paginatedReconOrders.every((o) => selectedReconOrderIds.includes(o.id));
  const toggleSelectAllRecon = () => {
    if (allVisibleReconSelected) {
      const visible = new Set(paginatedReconOrders.map((o) => o.id));
      setSelectedReconOrderIds((prev) => prev.filter((id) => !visible.has(id)));
    } else {
      setSelectedReconOrderIds(
        Array.from(new Set([...selectedReconOrderIds, ...paginatedReconOrders.map((o) => o.id)]))
      );
    }
  };

  const handleVerifyTxn = async (tranId, valId) => {
    try {
      const res = await apiClient.verifyPayment({ tran_id: tranId, val_id: valId });
      if (res && res.success) {
        await fetchTransactions();
        if (typeof onRefresh === "function") await onRefresh();
        if (selectedTxn && selectedTxn.tran_id === tranId) {
          setSelectedTxn(res.transaction);
        }
      } else {
        alert(res?.message || "Verification check failed");
      }
    } catch (err) {
      alert("Verification error: " + err.message);
    }
  };

  const handleConfirmPaymentDeleteDialog = async () => {
    if (!paymentDeleteDialog) return;
    const dlg = paymentDeleteDialog;
    setPaymentDeleteDialog(null);
    setIsDeletingPaymentItems(true);
    try {
      if (dlg.scope === "txn") {
        if (dlg.mode === "single" && dlg.item) {
          await apiClient.deletePaymentTransaction(dlg.item.id);
        }
        await fetchTransactions();
        try {
          realtimeService.broadcast("RECYCLE_BIN_UPDATED", { itemType: "PAYMENT_TRANSACTION" });
        } catch {}
      } else if (dlg.scope === "recon") {
        if (dlg.mode === "single" && dlg.item) {
          const res = await apiClient.deleteOrder(dlg.item.id);
          if (res && res.success) {
            setSelectedReconOrderIds((prev) => prev.filter((id) => id !== dlg.item.id));
          }
        } else if (dlg.mode === "bulk" && selectedReconOrderIds.length > 0) {
          const res = await apiClient.bulkDeleteOrders(selectedReconOrderIds);
          if (res && res.success) setSelectedReconOrderIds([]);
        }
        if (typeof onRefresh === "function") await onRefresh();
        try {
          realtimeService.broadcast("ORDER_DELETED", { from: "reconciliation" });
          realtimeService.broadcast("RECYCLE_BIN_UPDATED", { itemType: "ORDER" });
        } catch {}
      }
    } finally {
      setIsDeletingPaymentItems(false);
    }
  };

  useEffect(() => {
    const unsubscribe = realtimeService.subscribe((msg) => {
      const type = typeof msg === "string" ? msg : msg?.type;
      if (
        type === "ORDER_CREATED" ||
        type === "ORDER_UPDATED" ||
        type === "COURIER_ASSIGNED" ||
        type === "ORDER_STATUS_CHANGED" ||
        type === "ORDER_DELETED" ||
        type === "PAYMENT_RECEIVED" ||
        type === "PAYMENT_CONFIG_UPDATED" ||
        type === "RECYCLE_BIN_UPDATED"
      ) {
        if (typeof onRefresh === "function") onRefresh();
        fetchTransactions();
        if (type === "PAYMENT_CONFIG_UPDATED") {
          fetchGatewayConfig();
        }
      }
    });
    return () => {
      if (typeof unsubscribe === "function") unsubscribe();
    };
  }, [onRefresh]);

  const renderPageNumbers = (current, total, onPageChange, keyPrefix, compact = false) =>
    Array.from({ length: total }, (_, i) => i + 1)
      .filter((num) => num === 1 || num === total || (num >= current - 1 && num <= current + 1))
      .reduce((acc, num, idx, arr) => {
        if (idx > 0 && num - arr[idx - 1] > 1) {
          acc.push("...");
        }
        acc.push(num);
        return acc;
      }, [])
      .map((item, idx) =>
        item === "..." ? (
          <span
            key={`${keyPrefix}-dots-${idx}`}
            className={`${compact ? "px-1 text-xs" : "px-2"} text-neutral-400 font-bold`}
          >
            ...
          </span>
        ) : (
          <button
            key={`${keyPrefix}-page-${item}`}
            type="button"
            onClick={() => onPageChange(item)}
            className={`${compact ? "w-7 h-7" : "w-8 h-8"} rounded-lg font-bold text-xs transition-colors cursor-pointer ${
              current === item
                ? "bg-neutral-900 text-white shadow-xs"
                : `hover:bg-neutral-100 text-neutral-700 border border-neutral-200 ${compact ? "bg-white" : ""}`
            }`}
          >
            {item}
          </button>
        )
      );

  const channelCards = [
    {
      key: "SSLCOMMERZ",
      title: "SSLCommerz",
      subtitle: gatewayConfig.is_sandbox ? "SANDBOX" : "LIVE",
      accent: "border-blue-200",
      badgeClass: "bg-blue-50 text-blue-700 border-blue-200",
      icon: <CreditCard className="w-4 h-4 text-blue-600" />,
      stats: paymentSummary.channels.SSLCOMMERZ,
      extraNote: `${paymentSummary.validatedTxnCount} Validated (${formatBDT(paymentSummary.validatedTxnAmount)})`,
    },
    {
      key: "BKASH",
      title: "bKash",
      subtitle: "MFS",
      accent: "border-pink-200",
      badgeClass: "bg-pink-50 text-pink-700 border-pink-200",
      icon: <Smartphone className="w-4 h-4 text-pink-600" />,
      stats: paymentSummary.channels.BKASH,
      extraNote: `Paid: ${formatBDT(paymentSummary.channels.BKASH.paidAmount)} (${paymentSummary.channels.BKASH.paidCount})`,
    },
    {
      key: "NAGAD",
      title: "Nagad",
      subtitle: "MFS",
      accent: "border-amber-200",
      badgeClass: "bg-amber-50 text-amber-700 border-amber-200",
      icon: <Smartphone className="w-4 h-4 text-amber-600" />,
      stats: paymentSummary.channels.NAGAD,
      extraNote: `Paid: ${formatBDT(paymentSummary.channels.NAGAD.paidAmount)} (${paymentSummary.channels.NAGAD.paidCount})`,
    },
    {
      key: "ROCKET",
      title: "Rocket",
      subtitle: "MFS",
      accent: "border-purple-200",
      badgeClass: "bg-purple-50 text-purple-700 border-purple-200",
      icon: <Smartphone className="w-4 h-4 text-purple-600" />,
      stats: paymentSummary.channels.ROCKET,
      extraNote: `Paid: ${formatBDT(paymentSummary.channels.ROCKET.paidAmount)} (${paymentSummary.channels.ROCKET.paidCount})`,
    },
    {
      key: "COD",
      title: "Cash on Delivery",
      subtitle: "COD",
      accent: "border-emerald-200",
      badgeClass: "bg-emerald-50 text-emerald-700 border-emerald-200",
      icon: <Banknote className="w-4 h-4 text-emerald-600" />,
      stats: paymentSummary.channels.COD,
      extraNote: `Collected: ${formatBDT(paymentSummary.channels.COD.paidAmount)} (${paymentSummary.channels.COD.paidCount})`,
    },
  ];

  const handleVerifyOrderPayment = async (order, action = "verify") => {
    setIsUpdating(order.id);
    try {
      const matchedTxn = txnByOrderId[order.id];
      const payload = {
        orderId: order.id,
        tran_id: order.address?.paymentTrxId || matchedTxn?.tran_id || undefined,
        val_id: order.address?.valId || matchedTxn?.val_id || undefined,
        action,
      };
      const res = await apiClient.verifyPayment(payload);
      if (res && res.success) {
        if (typeof onRefresh === "function") await onRefresh();
        await fetchTransactions();
        realtimeService.broadcast("ORDER_UPDATED", res.order || order);
      } else {
        alert(res?.message || "Payment verification failed.");
      }
    } catch (err) {
      console.error("Order verification error:", err);
      alert("Verification error: " + (err?.message || "Unknown error"));
    } finally {
      setIsUpdating(null);
    }
  };

  const handleQuickConfirm = async (order) => {
    const isCod = String(order.paymentMethod || "").toUpperCase() === "COD";
    const verificationStatus = order.address?.verificationStatus;
    const isFailed = String(order.paymentStatus || "").toUpperCase() === "FAILED";
    const isBlocked = isCod
      ? verificationStatus === "NOT_VERIFIED" || isFailed
      : verificationStatus !== "VERIFIED" || isFailed;
    if (isBlocked) {
      alert(
        isCod
          ? "This COD order is marked Not Verified and cannot be confirmed."
          : "Please verify this order/payment first before confirming."
      );
      return;
    }
    setIsUpdating(order.id);
    try {
      const res = await apiClient.updateOrderStatus(
        order.id,
        "CONFIRMED",
        "Operations team verified payment and confirmed order.",
        "Staff Operator",
        currentRole
      );
      if (res && res.success === false) {
        alert(res.message || "Cannot confirm order before verification.");
        return;
      }
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
            onClick={() => setIsReconModalOpen(true)}
            className="px-3.5 py-2.5 rounded-xl bg-blue-600 hover:bg-blue-700 text-white transition-colors flex items-center gap-1.5 text-xs font-bold shadow-xs cursor-pointer"
          >
            <Smartphone className="w-3.5 h-3.5" />
            <span>{"Order Payment Reconciliation"}</span>
          </button>

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
            type="button"
            onClick={() => {
              if (typeof onRefresh === "function") onRefresh();
              fetchTransactions();
              fetchGatewayConfig();
            }}
            className="p-2.5 rounded-xl border border-neutral-200 hover:bg-neutral-50 text-neutral-600 transition-colors flex items-center gap-1.5 text-xs font-semibold cursor-pointer"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${isLoadingTxns ? "animate-spin" : ""}`} />
            <span>{"Refresh"}</span>
          </button>
        </div>
      </div>

      {/* Payment Channel & Order Breakdown KPI Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-6 gap-3.5">
        {channelCards.map((card) => (
          <div
            key={card.key}
            className={`bg-white rounded-2xl p-4 border ${card.accent} shadow-xs space-y-1.5`}
          >
            <div className="flex items-center justify-between gap-2">
              <span className="text-[11px] font-bold text-neutral-600 uppercase tracking-wider flex items-center gap-1.5">
                {card.icon}
                <span>{card.title}</span>
              </span>
              <span className={`text-[9px] font-extrabold px-1.5 py-0.5 rounded-full border ${card.badgeClass}`}>
                {card.subtitle}
              </span>
            </div>
            <div className="text-xl font-black text-neutral-950">
              {formatBDT(card.stats.activeAmount, isEnglish)}
            </div>
            <div className="text-[11px] text-neutral-600 font-semibold">
              {card.stats.activeCount} {card.stats.activeCount === 1 ? "Order" : "Orders"}
              {card.stats.pendingCount > 0 ? ` • ${card.stats.pendingCount} Unpaid` : ""}
            </div>
            <p className="text-[10px] text-neutral-500 font-medium truncate" title={card.extraNote}>
              {card.extraNote}
            </p>
          </div>
        ))}

        {/* Failed & Cancelled Breakdown Card */}
        <div className="bg-white rounded-2xl p-4 border border-rose-200 shadow-xs space-y-1.5">
          <div className="flex items-center justify-between gap-2">
            <span className="text-[11px] font-bold text-rose-700 uppercase tracking-wider flex items-center gap-1.5">
              <AlertCircle className="w-4 h-4 text-rose-600" />
              <span>{"Failed / Cancelled"}</span>
            </span>
            <span className="text-[9px] font-extrabold px-1.5 py-0.5 rounded-full border bg-rose-50 text-rose-700 border-rose-200">
              {"ALERT"}
            </span>
          </div>
          <div className="text-xl font-black text-rose-600">
            {formatBDT(paymentSummary.cancelledOrdersAmount, isEnglish)}
          </div>
          <div className="text-[11px] text-neutral-600 font-semibold">
            {paymentSummary.cancelledOrdersCount} {"Cancelled Orders"}
          </div>
          <p className="text-[10px] text-neutral-500 font-medium truncate">
            {`Gateway: ${paymentSummary.failedTxnCount} Failed • ${paymentSummary.initiatedTxnCount} Initiated`}
          </p>
        </div>
      </div>

      {/* Filter and Search Bar */}
      <div className="bg-white rounded-2xl p-4 border border-neutral-200 shadow-xs space-y-3">
        {/* Status & Payment Tabs + Top Pagination Controls */}
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div className="flex items-center gap-2 overflow-x-auto pb-1 no-scrollbar text-xs">
            {tabItems.map((st) => {
              const count =
                st.key === "ALL"
                  ? orders.length
                  : st.key === "FAILED"
                  ? failedRecords.length
                  : orders.filter((o) => o.status === st.key).length;
              const isSelected = selectedStatusFilter === st.key;
              const isFailedTab = st.key === "FAILED";
              return (
                <button
                  key={st.key}
                  type="button"
                  onClick={() => setSelectedStatusFilter(st.key)}
                  className={`px-3 py-1.5 rounded-xl font-semibold whitespace-nowrap transition-all flex items-center gap-1.5 cursor-pointer ${
                    isSelected
                      ? isFailedTab
                        ? "bg-rose-600 text-white shadow-xs"
                        : "bg-neutral-900 text-white shadow-xs"
                      : "bg-neutral-100 text-neutral-600 hover:bg-neutral-200"
                  }`}
                >
                  <span>{st.label}</span>
                  <span
                    className={`text-[10px] px-1.5 py-0.2 rounded-full ${
                      isSelected
                        ? isFailedTab
                          ? "bg-rose-700 text-white"
                          : "bg-neutral-800 text-emerald-300"
                        : "bg-neutral-200 text-neutral-700"
                    }`}
                  >
                    {count}
                  </span>
                </button>
              );
            })}
          </div>

          {/* Top Pagination Controls for Standard Orders */}
          {!isPaymentTab && totalPages > 1 && (
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

        {/* Search Input, Gateway Filters & Bulk Delete (Unified Single-Panel Orders View) */}
        {!isPaymentTab && (
          <div className="flex flex-wrap items-center gap-2.5">
            <div className="relative flex-1 min-w-[220px]">
              <Search className="w-4 h-4 text-neutral-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
              <input
                type="text"
                placeholder={
                  "Search Order ID, TrxID, customer name, phone or courier tracking..."
                }
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full pl-10 pr-4 py-2 bg-neutral-50 rounded-xl border border-neutral-200 text-xs focus:bg-white focus:border-emerald-600 focus:outline-hidden"
              />
            </div>

            <select
              value={paymentMethodFilter}
              onChange={(e) => setPaymentMethodFilter(e.target.value)}
              className="px-3 py-2 bg-neutral-50 border border-neutral-200 rounded-xl text-xs font-semibold text-neutral-700 focus:border-emerald-600 focus:outline-hidden"
              aria-label="Filter by payment method"
            >
              <option value="ALL">All Gateways</option>
              <option value="SSLCOMMERZ">SSLCommerz</option>
              <option value="BKASH">bKash</option>
              <option value="NAGAD">Nagad</option>
              <option value="ROCKET">Rocket</option>
              <option value="COD">COD</option>
            </select>

            <select
              value={paymentStatusFilter}
              onChange={(e) => setPaymentStatusFilter(e.target.value)}
              className="px-3 py-2 bg-neutral-50 border border-neutral-200 rounded-xl text-xs font-semibold text-neutral-700 focus:border-emerald-600 focus:outline-hidden"
              aria-label="Filter by payment and validation status"
            >
              <option value="ALL">All Payment Status</option>
              <option value="PAID_VALIDATED">Validated / Paid</option>
              <option value="INITIATED_PENDING">Initiated / Pending</option>
              <option value="UNPAID">Unpaid (COD)</option>
              <option value="FAILED_CANCELLED">Failed / Cancelled</option>
              <option value="VERIFIED">Verified Orders</option>
              <option value="PENDING_VERIFY">Needs Validation</option>
              <option value="NOT_VERIFIED">Payment Not Verified</option>
            </select>

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
        )}
      </div>

      {/* Orders Table */}
      {!isPaymentTab && (
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
                <th className="py-3 px-3.5 whitespace-nowrap">{"Order ID & Date"}</th>
                <th className="py-3 px-3.5 whitespace-nowrap">{"Product Name"}</th>
                <th className="py-3 px-3.5 whitespace-nowrap">{"Customer Details"}</th>
                <th className="py-3 px-3.5 whitespace-nowrap">{"District / Address"}</th>
                <th className="py-3 px-3.5 whitespace-nowrap">{"Items & Total"}</th>
                <th className="py-3 px-3.5 whitespace-nowrap">{"Payment"}</th>
                <th className="py-3 px-3.5 whitespace-nowrap">{"Courier Info"}</th>
                <th className="py-3 px-3.5 whitespace-nowrap">{"Order Status"}</th>
                <th className="py-3 px-3.5 whitespace-nowrap text-right">{"Actions"}</th>
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
                    className={`align-top transition-colors ${
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
                    <td className="py-3.5 px-3.5 whitespace-nowrap">
                      <span className="font-mono font-bold text-neutral-900 block">
                        {orderSymbol}{order.id}
                      </span>
                      <span className="text-[10px] text-neutral-500 block font-mono">
                        {formatBDTDateTime(order.createdAt, isEnglish)}
                      </span>
                    </td>

                    {/* Product Name */}
                    <td className="py-3.5 px-3.5 min-w-[170px] max-w-[230px]">
                      {Array.isArray(order.items) && order.items.length > 0 ? (
                        <div className="space-y-1">
                          {order.items.slice(0, 2).map((item, idx) => (
                            <div key={item.id || idx} className="leading-tight">
                              <span
                                className="font-bold text-neutral-900 text-xs block truncate"
                                title={item.name || item.productName || "Product"}
                              >
                                {item.name || item.productName || "Product"}
                              </span>
                              <span className="text-[10px] text-neutral-500 block">
                                {`Qty: ${item.quantity || 1}${item.variant ? ` • ${item.variant}` : ""}`}
                              </span>
                            </div>
                          ))}
                          {order.items.length > 2 && (
                            <span className="inline-block text-[10px] font-semibold text-emerald-700 bg-emerald-50 px-1.5 py-0.5 rounded">
                              {`+${order.items.length - 2} more product(s)`}
                            </span>
                          )}
                        </div>
                      ) : (
                        <span className="text-[11px] text-neutral-400">—</span>
                      )}
                    </td>

                    {/* Customer */}
                    <td className="py-3.5 px-3.5">
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

                    {/* Payment & TrxID & Verification */}
                    <td className="py-3.5 px-4">
                      {(() => {
                        const matchedTxn = txnByOrderId[order.id];
                        const displayTrx =
                          order.address?.paymentTrxId || matchedTxn?.tran_id || "";
                        const isCod = String(order.paymentMethod || "").toUpperCase() === "COD";
                        const verStatus = order.address?.verificationStatus;
                        const isVerified = verStatus === "VERIFIED";
                        const isNotVerified =
                          verStatus === "NOT_VERIFIED" ||
                          String(order.paymentStatus || "").toUpperCase() === "FAILED";
                        return (
                          <div className="space-y-1">
                            <div className="flex items-center gap-1.5">
                              <span className="text-[10px] font-bold px-1.5 py-0.5 rounded bg-neutral-100 text-neutral-800">
                                {order.paymentMethod}
                              </span>
                              <span
                                className={`text-[10px] font-bold ${
                                  order.paymentStatus === "PAID"
                                    ? "text-emerald-700"
                                    : order.paymentStatus === "FAILED"
                                    ? "text-rose-600"
                                    : "text-amber-700"
                                }`}
                              >
                                {order.paymentStatus}
                              </span>
                            </div>
                            {displayTrx && (
                              <button
                                type="button"
                                onClick={() =>
                                  setSelectedTxn(
                                    matchedTxn || {
                                      tran_id: displayTrx,
                                      order_id: order.id,
                                      amount: order.total,
                                      payment_method: order.paymentMethod || "COD",
                                      status: isVerified
                                        ? "VALIDATED"
                                        : isNotVerified
                                        ? "FAILED"
                                        : "INITIATED",
                                      card_type: isCod
                                        ? "Cash on Delivery"
                                        : `${order.paymentMethod} Manual`,
                                      card_issuer: order.address?.senderWallet || "MFS Wallet",
                                      customer_name: order.address?.customerName || "Customer",
                                      customer_phone: order.address?.phone || "",
                                    }
                                  )
                                }
                                className="block font-mono text-[10px] text-blue-700 bg-blue-50 hover:bg-blue-100 border border-blue-200 px-1.5 py-0.5 rounded w-fit cursor-pointer"
                                title={isCod ? "Click to view COD order payment reference" : "Click to inspect Payment Transaction details"}
                              >
                                {isCod ? "Ref:" : "Trx:"} {displayTrx}
                              </button>
                            )}
                            {(!isCod || isVerified || isNotVerified) && (
                              <span
                                className={`inline-flex items-center gap-1 text-[10px] font-bold px-1.5 py-0.5 rounded-full ${
                                  isVerified
                                    ? "bg-emerald-100 text-emerald-800"
                                    : isNotVerified
                                    ? "bg-rose-100 text-rose-700"
                                    : "bg-amber-100 text-amber-800"
                                }`}
                              >
                                {isVerified
                                  ? (order.address?.autoVerified ? "Auto-Validated ✓" : "Validated ✓")
                                  : isNotVerified
                                  ? (isCod ? "Not Verified" : "Payment Not Verified")
                                  : "Pending Validate"}
                              </span>
                            )}
                          </div>
                        );
                      })()}
                    </td>

                    {/* Courier Info */}
                    <td className="py-3.5 px-4">
                      {order.courier ? (
                        <div className="space-y-0.5">
                          <span className="font-bold text-[11px] text-neutral-800 capitalize flex items-center gap-1">
                            <Truck className="w-3 h-3 text-emerald-600" />
                            <span>{order.courier.provider}</span>
                          </span>
                          <span className="font-mono text-[10px] text-neutral-400 block">
                            {order.courier.trackingId}
                          </span>
                          {!["DELIVERED", "CANCELLED", "RETURNED"].includes(order.status) && (
                            <button
                              type="button"
                              onClick={async () => {
                                setIsUpdating(order.id);
                                try {
                                  const res = await apiClient.syncCourierStatus(order.id);
                                  if (res?.success) {
                                    if (typeof onRefresh === "function") await onRefresh();
                                    if (res.isDemo && res.message) alert(res.message);
                                  } else {
                                    alert(res?.message || "Failed to sync live courier status.");
                                  }
                                } finally {
                                  setIsUpdating(null);
                                }
                              }}
                              disabled={isUpdating === order.id}
                              className="inline-flex items-center gap-1 text-[10px] font-bold text-indigo-600 hover:text-indigo-800 cursor-pointer disabled:opacity-50"
                              title="Pull live status & rider update from courier API"
                            >
                              <RefreshCw className={`w-2.5 h-2.5 ${isUpdating === order.id ? "animate-spin" : ""}`} />
                              <span>{"Sync Live"}</span>
                            </button>
                          )}
                        </div>
                      ) : (
                        <span className="inline-flex items-center px-2 py-0.5 rounded-md bg-neutral-100 text-neutral-500 text-[11px] font-semibold">
                          {"Not Set Yet"}
                        </span>
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
                      <div className="flex items-center justify-end gap-1.5 flex-wrap">
                        {order.status === "PENDING" && (() => {
                          const isCod = String(order.paymentMethod || "").toUpperCase() === "COD";
                          const verStatus = order.address?.verificationStatus;
                          const isVerified = verStatus === "VERIFIED";
                          const isNotVerified =
                            verStatus === "NOT_VERIFIED" ||
                            String(order.paymentStatus || "").toUpperCase() === "FAILED";
                          const canConfirm = isCod ? !isNotVerified : isVerified && !isNotVerified;
                          const isValMenuOpen = validationDropdown?.order?.id === order.id;

                          return (
                            <>
                              <button
                                type="button"
                                onClick={(e) => {
                                  if (isValMenuOpen) {
                                    setValidationDropdown(null);
                                  } else {
                                    const rect = e.currentTarget.getBoundingClientRect();
                                    const openUp = rect.bottom + 90 > window.innerHeight;
                                    setValidationDropdown({
                                      order,
                                      top: openUp ? rect.top - 84 : rect.bottom + 6,
                                      right: Math.max(12, window.innerWidth - rect.right),
                                    });
                                  }
                                }}
                                disabled={isUpdating === order.id}
                                aria-expanded={isValMenuOpen}
                                aria-haspopup="menu"
                                className="px-2.5 py-1 rounded-lg text-[11px] font-bold transition-colors shadow-xs bg-blue-600 hover:bg-blue-700 disabled:opacity-50 text-white inline-flex items-center gap-1 cursor-pointer"
                                title="Select validation status"
                              >
                                <span>{"Validation"}</span>
                                <ChevronDown
                                  className={`w-3 h-3 transition-transform ${isValMenuOpen ? "rotate-180" : ""}`}
                                />
                              </button>
                              <button
                                type="button"
                                onClick={() => handleQuickConfirm(order)}
                                disabled={!canConfirm || isUpdating === order.id}
                                className={`px-2.5 py-1 rounded-lg text-[11px] font-bold transition-colors shadow-xs ${
                                  canConfirm
                                    ? "bg-emerald-600 hover:bg-emerald-700 text-white cursor-pointer"
                                    : "bg-neutral-200 text-neutral-400 cursor-not-allowed"
                                }`}
                                title={
                                  canConfirm
                                    ? "Confirm Order"
                                    : isCod
                                    ? "Marked as Not Verified"
                                    : "Verify payment/order first before confirming"
                                }
                              >
                                {"Confirm Order"}
                              </button>
                            </>
                          );
                        })()}

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
      )}

      {/* Failed Payments & Failed Orders Tab Content */}
      {selectedStatusFilter === "FAILED" && (
        <div className="bg-white rounded-3xl border border-neutral-200 shadow-xs p-6 space-y-4">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div>
              <h3 className="text-base font-bold text-rose-700 flex items-center gap-2">
                <AlertCircle className="w-4 h-4" />
                <span>{"Failed Gateway Payments & Unverified Orders"}</span>
              </h3>
              <p className="text-xs text-neutral-500">
                {"Failed SSLCommerz sessions and unverified/declined attempts are isolated here so they do not pollute active Dashboard Orders."}
              </p>
            </div>
            <span className="text-xs font-bold px-3 py-1 rounded-full bg-rose-50 text-rose-700 border border-rose-200">
              {failedRecords.length} Failed
            </span>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="bg-neutral-50 text-neutral-500 font-bold border-y border-neutral-200">
                <tr>
                  <th className="py-2.5 px-3">{"Order / Ref ID"}</th>
                  <th className="py-2.5 px-3">{"Transaction ID"}</th>
                  <th className="py-2.5 px-3">{"Customer & Contact"}</th>
                  <th className="py-2.5 px-3">{"Method"}</th>
                  <th className="py-2.5 px-3">{"Amount"}</th>
                  <th className="py-2.5 px-3">{"Failure Reason"}</th>
                  <th className="py-2.5 px-3 text-right">{"Action"}</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-neutral-100">
                {failedRecords.length === 0 ? (
                  <tr>
                    <td colSpan={7} className="py-12 text-center text-neutral-400">
                      {"No failed payments or unverified orders found."}
                    </td>
                  </tr>
                ) : (
                  failedRecords.map((rec) => (
                    <tr key={rec.key} className="hover:bg-rose-50/30">
                      <td className="py-3 px-3 font-mono font-bold text-neutral-900">
                        {orderSymbol}{rec.orderId}
                      </td>
                      <td className="py-3 px-3 font-mono text-neutral-700">
                        {rec.tranId}
                      </td>
                      <td className="py-3 px-3">
                        <span className="font-bold text-neutral-900 block">{rec.customerName}</span>
                        <span className="text-[11px] text-neutral-400 font-mono">{rec.customerPhone}</span>
                      </td>
                      <td className="py-3 px-3">
                        <span className="px-2 py-0.5 rounded bg-neutral-100 text-neutral-800 font-bold text-[10px]">
                          {rec.method}
                        </span>
                      </td>
                      <td className="py-3 px-3 font-extrabold text-rose-700">
                        {formatBDT(rec.amount, isEnglish)}
                      </td>
                      <td className="py-3 px-3 text-[11px] text-rose-700 max-w-xs">
                        {rec.reason}
                      </td>
                      <td className="py-3 px-3 text-right">
                        <div className="flex items-center justify-end gap-1.5">
                          {rec.txn && (
                            <button
                              type="button"
                              onClick={() => setSelectedTxn(rec.txn)}
                              className="p-1.5 rounded-lg hover:bg-neutral-100 text-neutral-600 cursor-pointer"
                              title="View Transaction Details"
                            >
                              <Eye className="w-4 h-4" />
                            </button>
                          )}
                          {rec.order && (
                            <button
                              type="button"
                              onClick={() => onSelectOrder(rec.order)}
                              className="p-1.5 rounded-lg bg-neutral-900 text-white cursor-pointer"
                              title="View Order Details"
                            >
                              <Eye className="w-4 h-4" />
                            </button>
                          )}
                          <button
                            type="button"
                            disabled={isDeletingPaymentItems || isDeletingOrders}
                            onClick={() =>
                              rec.kind === "txn"
                                ? setPaymentDeleteDialog({ scope: "txn", mode: "single", item: rec.txn })
                                : setOrderDeleteConfirm({ mode: "single", order: rec.order })
                            }
                            className="p-1.5 rounded-lg border border-rose-200 bg-rose-50 hover:bg-rose-100 text-rose-600 cursor-pointer"
                            title="Move to Recycle Bin"
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
        </div>
      )}

      {/* Order Payment Reconciliation Popup Window Modal */}
      {isReconModalOpen && (
        <div
          className="fixed inset-0 z-50 overflow-y-auto bg-black/60 backdrop-blur-xs flex items-center justify-center p-4"
          onClick={() => setIsReconModalOpen(false)}
          role="dialog"
          aria-modal="true"
          aria-labelledby="recon-modal-title"
        >
          <div
            className="bg-white rounded-3xl border border-neutral-200 shadow-2xl w-full max-w-6xl max-h-[90vh] overflow-y-auto p-6 space-y-4"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex flex-wrap items-center justify-between gap-3 border-b border-neutral-100 pb-4">
              <div>
                <h3 id="recon-modal-title" className="text-lg font-black text-neutral-900 flex items-center gap-2">
                  <Smartphone className="w-5 h-5 text-blue-600" />
                  <span>{"Order Payment Reconciliation"}</span>
                </h3>
                <p className="text-xs text-neutral-500">
                  {"Sync status across SSLCommerz, MFS (bKash/Nagad/Rocket), and COD orders."}
                </p>
              </div>

              <div className="flex items-center gap-2">
                <div className="flex items-center gap-1.5 overflow-x-auto no-scrollbar max-w-full py-1">
                  {totalReconPages > 1 && (
                    <div className="flex items-center gap-1 shrink-0 mr-1">
                      <button
                        type="button"
                        disabled={reconCurrentPage === 1}
                        onClick={() => setReconCurrentPage((p) => Math.max(1, p - 1))}
                        className="p-1.5 rounded-lg border border-neutral-200 hover:bg-neutral-100 disabled:opacity-40 text-neutral-700 cursor-pointer text-xs"
                        title={"Previous page"}
                      >
                        <ChevronLeft className="w-3.5 h-3.5" />
                      </button>

                      {renderPageNumbers(reconCurrentPage, totalReconPages, setReconCurrentPage, "rc-top", true)}

                      <button
                        type="button"
                        disabled={reconCurrentPage === totalReconPages}
                        onClick={() => setReconCurrentPage((p) => Math.min(totalReconPages, p + 1))}
                        className="p-1.5 rounded-lg border border-neutral-200 hover:bg-neutral-100 disabled:opacity-40 text-neutral-700 cursor-pointer text-xs"
                        title={"Next page"}
                      >
                        <ChevronRight className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  )}

                  {["ALL", "SSLCOMMERZ", "COD", "BKASH", "NAGAD", "ROCKET"].map((m) => (
                    <button
                      key={m}
                      type="button"
                      onClick={() => setReconSelectedMethod(m)}
                      className={`px-2.5 py-1.5 rounded-xl text-xs font-semibold transition-all cursor-pointer whitespace-nowrap shrink-0 ${
                        reconSelectedMethod === m
                          ? "bg-neutral-900 text-white font-bold"
                          : "bg-neutral-100 text-neutral-600 hover:bg-neutral-200"
                      }`}
                    >
                      {m}
                    </button>
                  ))}
                </div>

                <button
                  type="button"
                  onClick={() => setIsReconModalOpen(false)}
                  aria-label="Close Order Payment Reconciliation modal"
                  className="p-1.5 rounded-full hover:bg-neutral-100 text-neutral-400 hover:text-neutral-700 cursor-pointer"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>
            </div>

            {selectedReconOrderIds.length > 0 && (
              <div className="p-3 rounded-2xl bg-rose-50/70 border border-rose-200 flex items-center justify-between gap-3 text-xs">
                <span className="font-bold text-neutral-800">
                  {selectedReconOrderIds.length} order(s) selected
                </span>
                <button
                  type="button"
                  disabled={isDeletingPaymentItems}
                  onClick={() => setPaymentDeleteDialog({ scope: "recon", mode: "bulk" })}
                  className="px-3.5 py-1.5 rounded-xl bg-rose-600 hover:bg-rose-700 text-white font-bold text-xs flex items-center gap-1.5 cursor-pointer disabled:opacity-50"
                >
                  <Trash2 className="w-3.5 h-3.5" />
                  <span>{"Delete Selected"}</span>
                </button>
              </div>
            )}

            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs">
                <thead className="bg-neutral-50 text-neutral-500 font-bold border-y border-neutral-200">
                  <tr>
                    <th className="py-2.5 px-3 w-9">
                      <button
                        type="button"
                        onClick={toggleSelectAllRecon}
                        className={`w-4 h-4 rounded border flex items-center justify-center transition-colors cursor-pointer ${
                          allVisibleReconSelected
                            ? "bg-blue-600 border-blue-600 text-white"
                            : "border-neutral-300 bg-white"
                        }`}
                        title="Select All on Page"
                      >
                        {allVisibleReconSelected && <Check className="w-3 h-3" />}
                      </button>
                    </th>
                    <th className="py-2.5 px-3">{"Order ID"}</th>
                    <th className="py-2.5 px-3">{"Customer & Phone"}</th>
                    <th className="py-2.5 px-3">{"Method"}</th>
                    <th className="py-2.5 px-3">{"Pay Status"}</th>
                    <th className="py-2.5 px-3">{"Order Status"}</th>
                    <th className="py-2.5 px-3">{"Total"}</th>
                    <th className="py-2.5 px-3">{"TrxID / Info"}</th>
                    <th className="py-2.5 px-3 text-right">{"Actions"}</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-neutral-100">
                  {totalReconOrders === 0 ? (
                    <tr>
                      <td colSpan={9} className="py-12 text-center text-neutral-400">
                        <p>{"No matching orders found."}</p>
                      </td>
                    </tr>
                  ) : (
                    paginatedReconOrders.map((ord) => (
                      <tr
                        key={ord.id}
                        className={
                          selectedReconOrderIds.includes(ord.id)
                            ? "bg-rose-50/30"
                            : "hover:bg-neutral-50/80"
                        }
                      >
                        <td className="py-3 px-3">
                          <button
                            type="button"
                            onClick={() => toggleSelectReconOrder(ord.id)}
                            className={`w-4 h-4 rounded border flex items-center justify-center transition-colors cursor-pointer ${
                              selectedReconOrderIds.includes(ord.id)
                                ? "bg-blue-600 border-blue-600 text-white"
                                : "border-neutral-300 bg-white"
                            }`}
                          >
                            {selectedReconOrderIds.includes(ord.id) && <Check className="w-3 h-3" />}
                          </button>
                        </td>
                        <td className="py-3 px-3 font-mono font-bold text-neutral-900">
                          {formatReconOrderId(ord.id)}
                        </td>
                        <td className="py-3 px-3">
                          <span className="font-bold text-neutral-900 block">{ord.address?.customerName}</span>
                          <span className="text-[11px] text-neutral-400 font-mono">{ord.address?.phone}</span>
                        </td>
                        <td className="py-3 px-3">
                          <span
                            className={`px-2 py-0.5 rounded font-bold text-[10px] ${
                              ord.paymentMethod === "SSLCOMMERZ"
                                ? "bg-blue-100 text-blue-900 border border-blue-200"
                                : ord.paymentMethod === "COD"
                                ? "bg-emerald-50 text-emerald-800"
                                : "bg-pink-50 text-pink-800"
                            }`}
                          >
                            {ord.paymentMethod}
                          </span>
                        </td>
                        <td className="py-3 px-3">
                          <span
                            className={`px-2 py-0.5 rounded-full text-[10px] font-bold ${
                              ord.paymentStatus === "PAID"
                                ? "bg-emerald-100 text-emerald-800"
                                : ord.paymentStatus === "FAILED"
                                ? "bg-rose-100 text-rose-800"
                                : "bg-amber-100 text-amber-800"
                            }`}
                          >
                            {ord.paymentStatus}
                          </span>
                        </td>
                        <td className="py-3 px-3 font-bold text-neutral-700">
                          {ord.status}
                        </td>
                        <td className="py-3 px-3 font-extrabold text-neutral-900">
                          {formatBDT(ord.total, isEnglish)}
                        </td>
                        <td className="py-3 px-3 text-neutral-500 font-mono text-[11px]">
                          {ord.address?.paymentTrxId ? (
                            <span className="text-emerald-700 font-bold bg-emerald-50 px-1.5 py-0.5 rounded">
                              {formatReconTrxId(ord.address.paymentTrxId)}
                            </span>
                          ) : (
                            <span className="text-neutral-400">N/A</span>
                          )}
                        </td>
                        <td className="py-3 px-3 text-right">
                          <button
                            type="button"
                            disabled={isDeletingPaymentItems}
                            onClick={() => setPaymentDeleteDialog({ scope: "recon", mode: "single", item: ord })}
                            className="p-1.5 rounded-lg border border-rose-200 bg-rose-50 hover:bg-rose-100 text-rose-600 transition-colors cursor-pointer disabled:opacity-50"
                            title="Delete Order Record (Move to Recycle Bin)"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>

            {totalReconPages > 1 && (
              <div className="p-4 border-t border-neutral-200 bg-white flex flex-wrap items-center justify-between gap-3 text-xs">
                <div className="text-neutral-500 font-medium">
                  {`Showing ${totalReconOrders > 0 ? reconStartIndex + 1 : 0}-${reconEndIndex} of ${totalReconOrders} orders`}
                </div>

                <div className="flex items-center gap-1">
                  <button
                    type="button"
                    disabled={reconCurrentPage === 1}
                    onClick={() => setReconCurrentPage((p) => Math.max(1, p - 1))}
                    className="px-2.5 py-1.5 rounded-lg border border-neutral-200 hover:bg-neutral-100 disabled:opacity-40 text-neutral-700 font-semibold transition-colors flex items-center gap-1 cursor-pointer"
                  >
                    <ChevronLeft className="w-3.5 h-3.5" />
                    <span className="hidden sm:inline">{"Previous"}</span>
                  </button>

                  {renderPageNumbers(reconCurrentPage, totalReconPages, setReconCurrentPage, "rc")}

                  <button
                    type="button"
                    disabled={reconCurrentPage === totalReconPages}
                    onClick={() => setReconCurrentPage((p) => Math.min(totalReconPages, p + 1))}
                    className="px-2.5 py-1.5 rounded-lg border border-neutral-200 hover:bg-neutral-100 disabled:opacity-40 text-neutral-700 font-semibold transition-colors flex items-center gap-1 cursor-pointer"
                  >
                    <span className="hidden sm:inline">{"Next"}</span>
                    <ChevronRight className="w-3.5 h-3.5" />
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>
      )}

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
                  {orderStatuses.map((st) => (
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

      {/* Unified Payment / Order Validation Floating Dropdown Menu */}
      {validationDropdown && (
        <>
          <div
            className="fixed inset-0 z-40"
            onClick={() => setValidationDropdown(null)}
          />
          <div
            role="menu"
            style={{ top: `${validationDropdown.top}px`, right: `${validationDropdown.right}px` }}
            className="fixed z-50 w-40 bg-white rounded-xl border border-neutral-200 shadow-xl py-1.5 text-left animate-in fade-in zoom-in-95 duration-150"
          >
            <button
              type="button"
              role="menuitem"
              onClick={() => {
                const targetOrder = validationDropdown.order;
                setValidationDropdown(null);
                handleVerifyOrderPayment(targetOrder, "verify");
              }}
              className="w-full px-3 py-2 text-xs font-bold text-emerald-700 hover:bg-emerald-50 flex items-center justify-between gap-2 cursor-pointer transition-colors"
            >
              <span className="flex items-center gap-1.5">
                <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" />
                <span>{"Validated"}</span>
              </span>
              {validationDropdown.order?.address?.verificationStatus === "VERIFIED" && (
                <Check className="w-3.5 h-3.5 text-emerald-600" />
              )}
            </button>
            <button
              type="button"
              role="menuitem"
              onClick={() => {
                const targetOrder = validationDropdown.order;
                setValidationDropdown(null);
                handleVerifyOrderPayment(targetOrder, "not_verified");
              }}
              className="w-full px-3 py-2 text-xs font-bold text-rose-700 hover:bg-rose-50 flex items-center justify-between gap-2 cursor-pointer transition-colors"
            >
              <span className="flex items-center gap-1.5">
                <X className="w-3.5 h-3.5 text-rose-600" />
                <span>{"Not Verified"}</span>
              </span>
              {validationDropdown.order?.address?.verificationStatus === "NOT_VERIFIED" && (
                <Check className="w-3.5 h-3.5 text-rose-600" />
              )}
            </button>
          </div>
        </>
      )}

      {/* Gateway Transaction Details Modal */}
      {selectedTxn && (() => {
        const txnMethod = String(selectedTxn.payment_method || "SSLCOMMERZ").toUpperCase();
        const isSsl = txnMethod === "SSLCOMMERZ";
        const isCodTxn = txnMethod === "COD";
        const isMfsTxn = txnMethod === "BKASH" || txnMethod === "NAGAD" || txnMethod === "ROCKET";

        return (
          <div
            className="fixed inset-0 z-50 overflow-y-auto bg-black/60 backdrop-blur-xs flex items-center justify-center p-4"
            onClick={() => setSelectedTxn(null)}
            role="dialog"
            aria-modal="true"
            aria-labelledby="txn-details-modal-title"
          >
            <div
              className="bg-white rounded-3xl max-w-lg w-full p-6 space-y-4 shadow-2xl animate-in fade-in zoom-in-95 duration-200"
              onClick={(e) => e.stopPropagation()}
            >
              <div className="flex items-center justify-between pb-3 border-b border-neutral-100">
                <div>
                  <span
                    className={`text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded-full ${
                      isSsl
                        ? "text-blue-700 bg-blue-50"
                        : isCodTxn
                        ? "text-emerald-700 bg-emerald-50"
                        : "text-pink-700 bg-pink-50"
                    }`}
                  >
                    {isSsl
                      ? "SSLCommerz Transaction"
                      : isCodTxn
                      ? "Cash on Delivery (COD)"
                      : `${txnMethod} Manual MFS`}
                  </span>
                  <h3 id="txn-details-modal-title" className="font-bold text-base text-neutral-900 mt-1 font-mono">
                    {selectedTxn.tran_id}
                  </h3>
                </div>
                <button
                  type="button"
                  onClick={() => setSelectedTxn(null)}
                  aria-label="Close transaction details modal"
                  className="p-1 rounded-full hover:bg-neutral-100 text-neutral-400 hover:text-neutral-700 cursor-pointer"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>

              <div className="space-y-2 text-xs">
                <div className="flex justify-between py-1 border-b border-neutral-50">
                  <span className="text-neutral-500">Order ID:</span>
                  <span className="font-mono font-bold text-blue-700">{orderSymbol}{selectedTxn.order_id}</span>
                </div>
                <div className="flex justify-between py-1 border-b border-neutral-50">
                  <span className="text-neutral-500">Amount:</span>
                  <span className="font-bold text-neutral-900">{formatBDT(selectedTxn.amount, isEnglish)}</span>
                </div>
                <div className="flex justify-between py-1 border-b border-neutral-50">
                  <span className="text-neutral-500">Payment Channel:</span>
                  <span className="font-bold text-neutral-800">{selectedTxn.card_type || txnMethod}</span>
                </div>
                <div className="flex justify-between py-1 border-b border-neutral-50">
                  <span className="text-neutral-500">Status:</span>
                  <div>{getTxnStatusBadge(selectedTxn.status)}</div>
                </div>
                {isSsl && (
                  <>
                    <div className="flex justify-between py-1 border-b border-neutral-50">
                      <span className="text-neutral-500">Validation ID (val_id):</span>
                      <span className="font-mono text-[11px] text-neutral-800">{selectedTxn.val_id || "None"}</span>
                    </div>
                    <div className="flex justify-between py-1 border-b border-neutral-50">
                      <span className="text-neutral-500">Card Issuer:</span>
                      <span className="text-neutral-800">{selectedTxn.card_issuer || "N/A"}</span>
                    </div>
                    <div className="flex justify-between py-1 border-b border-neutral-50">
                      <span className="text-neutral-500">Bank Trx ID:</span>
                      <span className="font-mono text-neutral-800">{selectedTxn.bank_tran_id || "N/A"}</span>
                    </div>
                  </>
                )}
                {isMfsTxn && (
                  <div className="flex justify-between py-1 border-b border-neutral-50">
                    <span className="text-neutral-500">Sender Wallet / Note:</span>
                    <span className="font-mono text-neutral-800">{selectedTxn.card_issuer || "N/A"}</span>
                  </div>
                )}
                <div className="flex justify-between py-1 border-b border-neutral-50">
                  <span className="text-neutral-500">Customer:</span>
                  <span className="text-neutral-800 font-medium">
                    {selectedTxn.customer_name} ({selectedTxn.customer_phone})
                  </span>
                </div>
                {isCodTxn && (
                  <div className="p-3 rounded-xl bg-emerald-50 border border-emerald-200 text-emerald-800 text-[11px] mt-2">
                    Cash on Delivery orders are settled directly by the delivery courier upon parcel handover—no online gateway server check is needed.
                  </div>
                )}
                {selectedTxn.error_reason && (
                  <div className="p-3 rounded-xl bg-rose-50 border border-rose-200 text-rose-800 text-[11px] mt-2">
                    <b>Failure Reason:</b> {selectedTxn.error_reason}
                  </div>
                )}
              </div>

              <div className="pt-3 border-t border-neutral-100 flex items-center justify-between gap-2">
                {isSsl && selectedTxn.status !== "VALIDATED" && (
                  <button
                    type="button"
                    onClick={() => handleVerifyTxn(selectedTxn.tran_id, selectedTxn.val_id || "")}
                    className="px-3.5 py-2 rounded-xl bg-blue-600 hover:bg-blue-700 text-white font-bold text-xs cursor-pointer flex items-center gap-1.5"
                  >
                    <ShieldCheck className="w-3.5 h-3.5" />
                    <span>Verify with SSLCommerz Server</span>
                  </button>
                )}
                {isMfsTxn && selectedTxn.status !== "VALIDATED" && (
                  <button
                    type="button"
                    onClick={() => handleVerifyTxn(selectedTxn.tran_id, "")}
                    className="px-3.5 py-2 rounded-xl bg-pink-600 hover:bg-pink-700 text-white font-bold text-xs cursor-pointer flex items-center gap-1.5"
                  >
                    <ShieldCheck className="w-3.5 h-3.5" />
                    <span>{`Validate ${txnMethod} Payment`}</span>
                  </button>
                )}
                <button
                  type="button"
                  onClick={() => setSelectedTxn(null)}
                  className="px-4 py-2 rounded-xl bg-neutral-100 hover:bg-neutral-200 text-neutral-700 font-bold text-xs ml-auto cursor-pointer"
                >
                  Close
                </button>
              </div>
            </div>
          </div>
        );
      })()}

      {/* Move Payment Transaction / Reconciliation Order to Recycle Bin Confirmation Modal */}
      {paymentDeleteDialog && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-xs">
          <div className="bg-white rounded-3xl border border-neutral-200 shadow-2xl w-full max-w-md p-6 space-y-4">
            <div className="flex items-start gap-3">
              <div className="w-11 h-11 rounded-2xl bg-rose-100 text-rose-600 flex items-center justify-center shrink-0">
                <AlertTriangle className="w-6 h-6" />
              </div>
              <div>
                <h3 className="text-base font-black text-neutral-900">
                  {paymentDeleteDialog.scope === "txn"
                    ? `Move Transaction ${paymentDeleteDialog.item?.tran_id} to Recycle Bin?`
                    : paymentDeleteDialog.mode === "bulk"
                    ? `Move ${selectedReconOrderIds.length} Orders to Recycle Bin?`
                    : `Move Order ${formatReconOrderId(paymentDeleteDialog.item?.id)} to Recycle Bin?`}
                </h3>
                <p className="text-xs text-neutral-600 mt-1">
                  {"Moved records are stored safely in the "}
                  <strong className="text-neutral-900">{"Recycle Bin"}</strong>
                  {". You can restore them anytime or delete them permanently from the database."}
                </p>
              </div>
            </div>
            <div className="flex items-center justify-end gap-2.5 pt-2">
              <button
                type="button"
                onClick={() => setPaymentDeleteDialog(null)}
                className="px-4 py-2 rounded-xl border border-neutral-200 hover:bg-neutral-50 text-neutral-700 font-bold text-xs cursor-pointer"
              >
                {"Cancel"}
              </button>
              <button
                type="button"
                disabled={isDeletingPaymentItems}
                onClick={handleConfirmPaymentDeleteDialog}
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
