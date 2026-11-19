import { useState, useEffect, useRef } from "react";
import {
  CreditCard,
  CheckCircle2,
  AlertCircle,
  Clock,
  RefreshCw,
  Sliders,
  ShieldCheck,
  Search,
  ExternalLink,
  Eye,
  Lock,
  Smartphone,
  Check,
  X,
  Play,
  Settings,
  Save,
  ToggleLeft,
  ToggleRight,
  Phone,
  ChevronLeft,
  ChevronRight,
  Trash2,
  AlertTriangle
} from "lucide-react";
import { formatBDT } from "../../utils/bangladesh";
import { useLanguage } from "../../Context/LanguageContext";
import { useThemeConfig } from "../frontPanel/FrontPanelContext";
import { apiClient } from "../../services/api";
import { DEFAULT_PAYMENT_METHODS, formatAccountTypeLabel } from "../../utils/paymentConfig";
import { realtimeService } from "../../services/realtime";
import bkashImg from "../../assets/bkash.png";
import nagadImg from "../../assets/nagad2.png";
import rocketImg from "../../assets/rocket2.png";
import codImg from "../../assets/COD.png";

const AdminPayments = ({ orders = [], onRefreshOrders }) => {
  const { isEnglish } = useLanguage();
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
  const [activeTab, setActiveTab] = useState("methods"); // "methods" | "transactions" | "orders" | "config"
  const [selectedMethod, setSelectedMethod] = useState("ALL");
  const [statusFilter, setStatusFilter] = useState("ALL");
  const [searchQuery, setSearchQuery] = useState("");

  // Tabs scroll container ref for mobile arrow navigation
  const tabsContainerRef = useRef(null);

  const scrollTabs = (direction) => {
    if (tabsContainerRef.current) {
      tabsContainerRef.current.scrollBy({
        left: direction === "left" ? -220 : 220,
        behavior: "smooth"
      });
    }
  };

  // Pagination states (10 items per page)
  const [txnsCurrentPage, setTxnsCurrentPage] = useState(1);
  const [reconCurrentPage, setReconCurrentPage] = useState(1);

  // Reset pagination on filter or search changes
  useEffect(() => {
    setTxnsCurrentPage(1);
  }, [statusFilter, searchQuery]);

  useEffect(() => {
    setReconCurrentPage(1);
  }, [selectedMethod]);

  const [transactions, setTransactions] = useState([]);
  const [isLoadingTxns, setIsLoadingTxns] = useState(false);
  const [selectedTxn, setSelectedTxn] = useState(null);

  // Dynamic Payment Methods State (bKash, Nagad, Rocket, COD, SSLCommerz)
  const [paymentMethods, setPaymentMethods] = useState(DEFAULT_PAYMENT_METHODS);
  const [isSavingMethods, setIsSavingMethods] = useState(false);
  const [methodsSuccessMsg, setMethodsSuccessMsg] = useState("");

  // Gateway Config state
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

  // Selection & Recycle Bin Delete state for Transactions & Reconciliation
  const [selectedTxnIds, setSelectedTxnIds] = useState([]);
  const [selectedReconOrderIds, setSelectedReconOrderIds] = useState([]);
  const [deleteDialog, setDeleteDialog] = useState(null); // { scope: 'txn' | 'recon', mode: 'single' | 'bulk', item?: obj }
  const [isDeletingItems, setIsDeletingItems] = useState(false);

  const fetchTransactions = async () => {
    setIsLoadingTxns(true);
    try {
      const data = await apiClient.getPaymentTransactions({
        status: statusFilter !== "ALL" ? statusFilter : undefined,
        search: searchQuery || undefined,
      });
      setTransactions(Array.isArray(data) ? data : []);
    } catch (err) {
      console.warn("Failed to fetch transactions:", err);
    } finally {
      setIsLoadingTxns(false);
    }
  };

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

  useEffect(() => {
    fetchTransactions();
    fetchConfig();
    fetchMethods();
  }, [statusFilter]);

  useEffect(() => {
    const unsubscribe = realtimeService.subscribe((msg) => {
      const type = typeof msg === "string" ? msg : msg?.type;
      if (
        [
          "ORDER_CREATED",
          "ORDER_UPDATED",
          "ORDER_STATUS_CHANGED",
          "PAYMENT_CONFIG_UPDATED",
          "PAYMENT_RECEIVED",
        ].includes(type)
      ) {
        fetchTransactions();
        fetchMethods();
      }
    });
    return () => unsubscribe();
  }, []);

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
        setTimeout(() => setConfigSuccessMsg(""), 4000);
      }
    } catch (err) {
      console.error("Save config error:", err);
    } finally {
      setIsSavingConfig(false);
    }
  };

  const handleVerifyTxn = async (tranId, valId) => {
    try {
      const res = await apiClient.verifyPayment({ tran_id: tranId, val_id: valId });
      if (res && res.success) {
        fetchTransactions();
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
        fetchTransactions();
      } else {
        alert(res?.message || "Failed to initiate test session");
      }
    } catch (err) {
      alert("Error: " + err.message);
    } finally {
      setIsInitiatingTest(false);
    }
  };

  // Stat calculations
  const totalValidatedAmount = transactions
    .filter((t) => t.status === "VALIDATED")
    .reduce((acc, t) => acc + parseFloat(t.amount || 0), 0);

  const totalValidatedCount = transactions.filter((t) => t.status === "VALIDATED").length;
  const totalFailedCount = transactions.filter((t) => t.status === "FAILED" || t.status === "CANCELLED").length;
  const totalInitiatedCount = transactions.filter((t) => t.status === "INITIATED").length;

  // Pagination for transactions (Tab 1)
  const totalTxns = transactions.length;
  const totalTxnPages = Math.ceil(totalTxns / 10) || 1;
  const txnStartIndex = (txnsCurrentPage - 1) * 10;
  const txnEndIndex = Math.min(txnStartIndex + 10, totalTxns);
  const paginatedTxns = transactions.slice(txnStartIndex, txnEndIndex);

  // Reconciliation orders (Tab 2)
  const filteredOrders = orders.filter((o) => {
    if (selectedMethod === "ALL") return true;
    return o.paymentMethod === selectedMethod;
  });

  const totalReconOrders = filteredOrders.length;
  const totalReconPages = Math.ceil(totalReconOrders / 10) || 1;
  const reconStartIndex = (reconCurrentPage - 1) * 10;
  const reconEndIndex = Math.min(reconStartIndex + 10, totalReconOrders);
  const paginatedOrders = filteredOrders.slice(reconStartIndex, reconEndIndex);

  const toggleSelectTxn = (id) => {
    setSelectedTxnIds((prev) =>
      prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id]
    );
  };
  const allVisibleTxnsSelected =
    paginatedTxns.length > 0 && paginatedTxns.every((t) => selectedTxnIds.includes(t.id));
  const toggleSelectAllTxns = () => {
    if (allVisibleTxnsSelected) {
      const visible = new Set(paginatedTxns.map((t) => t.id));
      setSelectedTxnIds((prev) => prev.filter((id) => !visible.has(id)));
    } else {
      setSelectedTxnIds(Array.from(new Set([...selectedTxnIds, ...paginatedTxns.map((t) => t.id)])));
    }
  };

  const toggleSelectReconOrder = (id) => {
    setSelectedReconOrderIds((prev) =>
      prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id]
    );
  };
  const allVisibleReconSelected =
    paginatedOrders.length > 0 && paginatedOrders.every((o) => selectedReconOrderIds.includes(o.id));
  const toggleSelectAllRecon = () => {
    if (allVisibleReconSelected) {
      const visible = new Set(paginatedOrders.map((o) => o.id));
      setSelectedReconOrderIds((prev) => prev.filter((id) => !visible.has(id)));
    } else {
      setSelectedReconOrderIds(Array.from(new Set([...selectedReconOrderIds, ...paginatedOrders.map((o) => o.id)])));
    }
  };

  const handleConfirmDeleteDialog = async () => {
    if (!deleteDialog) return;
    const dlg = deleteDialog;
    setDeleteDialog(null);
    setIsDeletingItems(true);
    try {
      if (dlg.scope === "txn") {
        if (dlg.mode === "single" && dlg.item) {
          const res = await apiClient.deletePaymentTransaction(dlg.item.id);
          if (res && res.success) {
            setSelectedTxnIds((prev) => prev.filter((id) => id !== dlg.item.id));
          }
        } else if (dlg.mode === "bulk" && selectedTxnIds.length > 0) {
          const res = await apiClient.bulkDeletePaymentTransactions(selectedTxnIds);
          if (res && res.success) setSelectedTxnIds([]);
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
        if (typeof onRefreshOrders === "function") await onRefreshOrders();
        try {
          realtimeService.broadcast("ORDER_DELETED", { from: "reconciliation" });
          realtimeService.broadcast("RECYCLE_BIN_UPDATED", { itemType: "ORDER" });
        } catch {}
      }
    } finally {
      setIsDeletingItems(false);
    }
  };

  const getStatusBadge = (status) => {
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

  return (
    <div className="space-y-6 max-w-full overflow-x-hidden">
      {/* Top Header */}
      <div className="bg-white rounded-3xl p-6 border border-neutral-200 shadow-xs flex flex-wrap items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2">
            <span className="text-xs font-bold uppercase tracking-wider text-blue-700 bg-blue-50 px-2.5 py-1 rounded-full border border-blue-200">
              {"Payment Gateway Hub"}
            </span>
            <span className="text-xs font-bold uppercase tracking-wider text-emerald-700 bg-emerald-50 px-2.5 py-1 rounded-full border border-emerald-200">
              {gatewayConfig.is_sandbox ? "SSLCommerz Sandbox Active" : "SSLCommerz Live Active"}
            </span>
          </div>
          <h1 className="text-2xl font-black text-neutral-900 mt-2">
            {"SSLCommerz Payment Gateway & Transactions"}
          </h1>
          <p className="text-xs text-neutral-500 mt-0.5">
            {"Live transaction logs, automated order confirmation synchronization, and gateway credential management."}
          </p>
        </div>

        <div className="flex items-center gap-2.5">
          <button
            onClick={handleTriggerSandboxTest}
            disabled={isInitiatingTest}
            className="px-4 py-2 rounded-xl bg-blue-600 hover:bg-blue-700 text-white font-bold text-xs flex items-center gap-1.5 shadow-sm transition-all cursor-pointer disabled:opacity-50"
            title="Launch an interactive test transaction to verify payment workflow"
          >
            <Play className="w-3.5 h-3.5 fill-current" />
            <span>
              {isInitiatingTest
                ? "Launching..."
                : gatewayConfig.is_sandbox
                ? "Test Sandbox Flow"
                : "Test Live Gateway"}
            </span>
          </button>

          <button
            onClick={() => {
              fetchTransactions();
              fetchConfig();
            }}
            className="p-2.5 rounded-xl border border-neutral-200 hover:bg-neutral-100 text-neutral-700 transition-colors cursor-pointer"
            title="Refresh Transactions"
          >
            <RefreshCw className={`w-4 h-4 ${isLoadingTxns ? "animate-spin" : ""}`} />
          </button>
        </div>
      </div>

      {/* KPI Stats Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="bg-white rounded-2xl p-5 border border-neutral-200 shadow-xs space-y-1">
          <span className="text-[11px] font-bold text-neutral-500 uppercase tracking-wider">
            {"SSLCommerz Settled"}
          </span>
          <div className="text-2xl font-black text-neutral-950">
            {formatBDT(totalValidatedAmount)}
          </div>
          <p className="text-[11px] text-emerald-700 font-semibold flex items-center gap-1">
            <CheckCircle2 className="w-3.5 h-3.5" />
            {totalValidatedCount} {"Successful payments"}
          </p>
        </div>

        <div className="bg-white rounded-2xl p-5 border border-neutral-200 shadow-xs space-y-1">
          <span className="text-[11px] font-bold text-neutral-500 uppercase tracking-wider">
            {"Initiated Sessions"}
          </span>
          <div className="text-2xl font-black text-blue-700">
            {totalInitiatedCount}
          </div>
          <p className="text-[11px] text-neutral-500">
            {"Awaiting customer payment"}
          </p>
        </div>

        <div className="bg-white rounded-2xl p-5 border border-neutral-200 shadow-xs space-y-1">
          <span className="text-[11px] font-bold text-neutral-500 uppercase tracking-wider">
            {"Failed / Cancelled"}
          </span>
          <div className="text-2xl font-black text-rose-600">
            {totalFailedCount}
          </div>
          <p className="text-[11px] text-neutral-500">
            {"Cancelled or declined sessions"}
          </p>
        </div>

        <div className="bg-white rounded-2xl p-5 border border-neutral-200 shadow-xs space-y-1">
          <span className="text-[11px] font-bold text-neutral-500 uppercase tracking-wider">
            {"Gateway Mode"}
          </span>
          <div className="text-xl font-black text-neutral-900 flex items-center gap-2">
            <span>{gatewayConfig.is_sandbox ? "SANDBOX" : "LIVE PRODUCTION"}</span>
          </div>
          <p className="text-[11px] text-neutral-500 font-mono">
            Store: {gatewayConfig.store_id} &bull; Fee: {gatewayConfig.fee_percent}%
          </p>
        </div>
      </div>

      {/* Tabs with Left/Right Navigation Arrows for Mobile & Small Screens */}
      <div className="relative flex items-center border-b border-neutral-200">
        <button
          type="button"
          onClick={() => scrollTabs("left")}
          className="sm:hidden absolute left-0 z-20 p-1.5 rounded-full bg-white/95 border border-neutral-300 shadow-md text-neutral-700 hover:text-black -translate-x-1 cursor-pointer transition-all active:scale-90"
          title={"Scroll tabs left"}
        >
          <ChevronLeft className="w-4 h-4" />
        </button>

        <div
          ref={tabsContainerRef}
          className="flex gap-3 sm:gap-6 overflow-x-auto no-scrollbar max-w-full pb-0.5 px-8 sm:px-0 scroll-smooth w-full"
        >
          <button
            onClick={() => setActiveTab("transactions")}
            className={`pb-3 font-bold text-xs cursor-pointer border-b-2 transition-all flex items-center gap-2 whitespace-nowrap shrink-0 ${activeTab === "transactions"
                ? "border-blue-600 text-blue-700"
                : "border-transparent text-neutral-500 hover:text-neutral-900"
              }`}
          >
            <CreditCard className="w-4 h-4" />
            <span>{"Live Gateway Transactions"}</span>
            <span className="text-[10px] px-1.5 py-0.5 rounded-full bg-blue-100 text-blue-800 font-bold">
              {transactions.length}
            </span>
          </button>

          <button
            onClick={() => setActiveTab("orders")}
            className={`pb-3 font-bold text-xs cursor-pointer border-b-2 transition-all flex items-center gap-2 whitespace-nowrap shrink-0 ${activeTab === "orders"
                ? "border-blue-600 text-blue-700"
                : "border-transparent text-neutral-500 hover:text-neutral-900"
              }`}
          >
            <Smartphone className="w-4 h-4" />
            <span>{"Order Payment Reconciliation"}</span>
            <span className="text-[10px] px-1.5 py-0.5 rounded-full bg-neutral-100 text-neutral-800 font-bold">
              {orders.length}
            </span>
          </button>

          <button
            onClick={() => setActiveTab("config")}
            className={`pb-3 font-bold text-xs cursor-pointer border-b-2 transition-all flex items-center gap-2 whitespace-nowrap shrink-0 ${activeTab === "config"
                ? "border-blue-600 text-blue-700"
                : "border-transparent text-neutral-500 hover:text-neutral-900"
              }`}
          >
            <Sliders className="w-4 h-4" />
            <span>{"SSLCommerz Credentials"}</span>
          </button>

          <button
            onClick={() => setActiveTab("methods")}
            className={`pb-3 font-bold text-xs cursor-pointer border-b-2 transition-all flex items-center gap-2 whitespace-nowrap shrink-0 ${activeTab === "methods"
                ? "border-emerald-600 text-emerald-700"
                : "border-transparent text-neutral-500 hover:text-neutral-900"
              }`}
          >
            <Settings className="w-4 h-4 text-emerald-600" />
            <span>{"Payment Methods & Channels"}</span>
            <span className="text-[10px] px-2 py-0.5 rounded-full bg-emerald-100 text-emerald-800 font-extrabold">
              {paymentMethods.filter((m) => m.is_active).length} Active
            </span>
          </button>
        </div>

        <button
          type="button"
          onClick={() => scrollTabs("right")}
          className="sm:hidden absolute right-0 z-20 p-1.5 rounded-full bg-white/95 border border-neutral-300 shadow-md text-neutral-700 hover:text-black translate-x-1 cursor-pointer transition-all active:scale-90"
          title={"Scroll tabs right"}
        >
          <ChevronRight className="w-4 h-4" />
        </button>
      </div>

      {/* TAB 1: Live Transactions Table */}
      {activeTab === "transactions" && (
        <div className="bg-white rounded-3xl border border-neutral-200 shadow-xs p-6 space-y-4">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div className="flex items-center gap-2.5">
              <div className="relative">
                <Search className="w-4 h-4 absolute left-3 top-2.5 text-neutral-400" />
                <input
                  type="text"
                  placeholder={"Search TrxID, ValID, Order ID..."}
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  onKeyDown={(e) => e.key === "Enter" && fetchTransactions()}
                  className="pl-9 pr-4 py-1.5 rounded-xl border border-neutral-200 text-xs outline-none focus:border-blue-600 w-60 sm:w-72"
                />
              </div>

              <button
                onClick={fetchTransactions}
                className="px-3 py-1.5 bg-neutral-900 text-white rounded-xl text-xs font-bold hover:bg-neutral-800 cursor-pointer"
              >
                {"Search"}
              </button>
            </div>

            <div className="flex items-center gap-2 overflow-x-auto no-scrollbar max-w-full py-1">
              {/* Top Pagination Control (matching user-marked red box) */}
              {totalTxnPages > 1 && (
                <div className="flex items-center gap-1 shrink-0 mr-1">
                  <button
                    type="button"
                    disabled={txnsCurrentPage === 1}
                    onClick={() => setTxnsCurrentPage((p) => Math.max(1, p - 1))}
                    className="p-1.5 rounded-lg border border-neutral-200 hover:bg-neutral-100 disabled:opacity-40 disabled:hover:bg-transparent text-neutral-700 font-semibold transition-colors flex items-center cursor-pointer text-xs"
                    title={"Previous page"}
                  >
                    <ChevronLeft className="w-3.5 h-3.5" />
                  </button>

                  {Array.from({ length: totalTxnPages }, (_, i) => i + 1)
                    .filter(
                      (num) =>
                        num === 1 ||
                        num === totalTxnPages ||
                        (num >= txnsCurrentPage - 1 && num <= txnsCurrentPage + 1)
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
                        <span key={`tx-top-dots-${idx}`} className="px-1 text-neutral-400 font-bold text-xs">
                          ...
                        </span>
                      ) : (
                        <button
                          key={`tx-top-page-${item}`}
                          type="button"
                          onClick={() => setTxnsCurrentPage(item)}
                          className={`w-7 h-7 rounded-lg font-bold text-xs transition-colors cursor-pointer ${
                            txnsCurrentPage === item
                              ? "bg-neutral-900 text-white shadow-xs"
                              : "hover:bg-neutral-100 text-neutral-700 border border-neutral-200 bg-white"
                          }`}
                        >
                          {item}
                        </button>
                      )
                    )}

                  <button
                    type="button"
                    disabled={txnsCurrentPage === totalTxnPages}
                    onClick={() => setTxnsCurrentPage((p) => Math.min(totalTxnPages, p + 1))}
                    className="p-1.5 rounded-lg border border-neutral-200 hover:bg-neutral-100 disabled:opacity-40 disabled:hover:bg-transparent text-neutral-700 font-semibold transition-colors flex items-center cursor-pointer text-xs"
                    title={"Next page"}
                  >
                    <ChevronRight className="w-3.5 h-3.5" />
                  </button>
                </div>
              )}

              {["ALL", "VALIDATED", "INITIATED", "FAILED", "CANCELLED"].map((st) => (
                <button
                  key={st}
                  onClick={() => setStatusFilter(st)}
                  className={`px-2.5 py-1.5 rounded-xl text-xs font-semibold transition-all cursor-pointer whitespace-nowrap shrink-0 ${statusFilter === st
                      ? "bg-blue-600 text-white shadow-xs font-bold"
                      : "bg-neutral-100 text-neutral-600 hover:bg-neutral-200"
                    }`}
                >
                  {st}
                </button>
              ))}
            </div>
          </div>

          {selectedTxnIds.length > 0 && (
            <div className="p-3 rounded-2xl bg-rose-50/70 border border-rose-200 flex items-center justify-between gap-3 text-xs">
              <span className="font-bold text-neutral-800">
                {selectedTxnIds.length} transaction(s) selected
              </span>
              <button
                type="button"
                disabled={isDeletingItems}
                onClick={() => setDeleteDialog({ scope: "txn", mode: "bulk" })}
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
                      onClick={toggleSelectAllTxns}
                      className={`w-4 h-4 rounded border flex items-center justify-center transition-colors cursor-pointer ${
                        allVisibleTxnsSelected
                          ? "bg-blue-600 border-blue-600 text-white"
                          : "border-neutral-300 bg-white"
                      }`}
                      title="Select All on Page"
                    >
                      {allVisibleTxnsSelected && <Check className="w-3 h-3" />}
                    </button>
                  </th>
                  <th className="py-2.5 px-3">{"Transaction ID"}</th>
                  <th className="py-2.5 px-3">{"Order ID"}</th>
                  <th className="py-2.5 px-3">{"Customer & Contact"}</th>
                  <th className="py-2.5 px-3">{"Amount"}</th>
                  <th className="py-2.5 px-3">{"Channel / Card"}</th>
                  <th className="py-2.5 px-3">{"Status"}</th>
                  <th className="py-2.5 px-3">{"Created At"}</th>
                  <th className="py-2.5 px-3 text-right">{"Action"}</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-neutral-100">
                {totalTxns === 0 ? (
                  <tr>
                    <td colSpan={9} className="py-12 text-center text-neutral-400">
                      <CreditCard className="w-8 h-8 mx-auto mb-2 text-neutral-300" />
                      <p>{"No transactions found"}</p>
                      <button
                        onClick={handleTriggerSandboxTest}
                        className="mt-3 px-3 py-1.5 bg-blue-600 text-white rounded-xl text-xs font-bold hover:bg-blue-700 cursor-pointer"
                      >
                        {"Create First Test Transaction"}
                      </button>
                    </td>
                  </tr>
                ) : (
                  paginatedTxns.map((txn) => (
                    <tr
                      key={txn.id || txn.tran_id}
                      className={
                        selectedTxnIds.includes(txn.id)
                          ? "bg-rose-50/30"
                          : "hover:bg-neutral-50/80"
                      }
                    >
                      <td className="py-3 px-3">
                        <button
                          type="button"
                          onClick={() => toggleSelectTxn(txn.id)}
                          className={`w-4 h-4 rounded border flex items-center justify-center transition-colors cursor-pointer ${
                            selectedTxnIds.includes(txn.id)
                              ? "bg-blue-600 border-blue-600 text-white"
                              : "border-neutral-300 bg-white"
                          }`}
                        >
                          {selectedTxnIds.includes(txn.id) && <Check className="w-3 h-3" />}
                        </button>
                      </td>
                      <td className="py-3 px-3 font-mono font-bold text-neutral-900">
                        {txn.tran_id}
                        {txn.val_id && (
                          <span className="block text-[10px] text-neutral-400 font-mono">
                            Val: {txn.val_id.slice(0, 18)}...
                          </span>
                        )}
                      </td>
                      <td className="py-3 px-3 font-bold text-blue-700 font-mono">
                        {orderSymbol}{txn.order_id}
                      </td>
                      <td className="py-3 px-3">
                        <span className="font-bold text-neutral-900 block">{txn.customer_name || "Guest"}</span>
                        <span className="text-[11px] text-neutral-400 font-mono">{txn.customer_phone}</span>
                      </td>
                      <td className="py-3 px-3 font-extrabold text-neutral-900">
                        {formatBDT(txn.amount)}
                      </td>
                      <td className="py-3 px-3">
                        <span className="font-semibold text-neutral-800 block">
                          {txn.card_type || txn.payment_method || "SSLCOMMERZ"}
                        </span>
                        {txn.bank_tran_id && (
                          <span className="text-[10px] text-neutral-400 font-mono">
                            BankTrx: {txn.bank_tran_id}
                          </span>
                        )}
                      </td>
                      <td className="py-3 px-3">
                        {getStatusBadge(txn.status)}
                      </td>
                      <td className="py-3 px-3 text-neutral-400 font-mono text-[11px]">
                        {new Date(txn.created_at).toLocaleString("bn-BD")}
                      </td>
                      <td className="py-3 px-3 text-right">
                        <div className="flex items-center justify-end gap-1.5">
                          {txn.status === "INITIATED" && (
                            <button
                              onClick={() => handleVerifyTxn(txn.tran_id, txn.val_id || "")}
                              className="px-2 py-1 rounded bg-blue-50 text-blue-700 border border-blue-200 hover:bg-blue-100 font-bold text-[10px] cursor-pointer"
                              title="Verify with SSLCommerz"
                            >
                              Verify
                            </button>
                          )}
                          <button
                            onClick={() => setSelectedTxn(txn)}
                            className="p-1.5 rounded-lg hover:bg-neutral-100 text-neutral-600 hover:text-neutral-900 cursor-pointer"
                            title="View Details"
                          >
                            <Eye className="w-4 h-4" />
                          </button>
                          <button
                            type="button"
                            disabled={isDeletingItems}
                            onClick={() => setDeleteDialog({ scope: "txn", mode: "single", item: txn })}
                            className="p-1.5 rounded-lg border border-rose-200 bg-rose-50 hover:bg-rose-100 text-rose-600 transition-colors cursor-pointer disabled:opacity-50"
                            title="Delete Transaction (Move to Recycle Bin)"
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

          {/* Bottom Pagination Bar for Transactions */}
          {totalTxnPages > 1 && (
            <div className="p-4 border-t border-neutral-200 bg-white flex flex-wrap items-center justify-between gap-3 text-xs">
              <div className="text-neutral-500 font-medium">
                {`Showing ${totalTxns > 0 ? txnStartIndex + 1 : 0}-${txnEndIndex} of ${totalTxns} transactions`}
              </div>

              <div className="flex items-center gap-1">
                <button
                  type="button"
                  disabled={txnsCurrentPage === 1}
                  onClick={() => setTxnsCurrentPage((p) => Math.max(1, p - 1))}
                  className="px-2.5 py-1.5 rounded-lg border border-neutral-200 hover:bg-neutral-100 disabled:opacity-40 disabled:hover:bg-transparent text-neutral-700 font-semibold transition-colors flex items-center gap-1 cursor-pointer"
                >
                  <ChevronLeft className="w-3.5 h-3.5" />
                  <span className="hidden sm:inline">{"Previous"}</span>
                </button>

                {Array.from({ length: totalTxnPages }, (_, i) => i + 1)
                  .filter(
                    (num) =>
                      num === 1 ||
                      num === totalTxnPages ||
                      (num >= txnsCurrentPage - 1 && num <= txnsCurrentPage + 1)
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
                      <span key={`tx-dots-${idx}`} className="px-2 text-neutral-400 font-bold">
                        ...
                      </span>
                    ) : (
                      <button
                        key={`tx-page-${item}`}
                        type="button"
                        onClick={() => setTxnsCurrentPage(item)}
                        className={`w-8 h-8 rounded-lg font-bold text-xs transition-colors cursor-pointer ${
                          txnsCurrentPage === item
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
                  disabled={txnsCurrentPage === totalTxnPages}
                  onClick={() => setTxnsCurrentPage((p) => Math.min(totalTxnPages, p + 1))}
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

      {/* TAB 2: Orders Reconciliation Table */}
      {activeTab === "orders" && (
        <div className="bg-white rounded-3xl border border-neutral-200 shadow-xs p-6 space-y-4">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div>
              <h3 className="text-base font-bold text-neutral-900">
                {"Order Payment Reconciliation"}
              </h3>
              <p className="text-xs text-neutral-400">
                {"Sync status between online gateway and local operations"}
              </p>
            </div>

            <div className="flex items-center gap-2 overflow-x-auto no-scrollbar max-w-full py-1">
              {/* Top Pagination Control (matching user-marked red box) */}
              {totalReconPages > 1 && (
                <div className="flex items-center gap-1 shrink-0 mr-1">
                  <button
                    type="button"
                    disabled={reconCurrentPage === 1}
                    onClick={() => setReconCurrentPage((p) => Math.max(1, p - 1))}
                    className="p-1.5 rounded-lg border border-neutral-200 hover:bg-neutral-100 disabled:opacity-40 disabled:hover:bg-transparent text-neutral-700 font-semibold transition-colors flex items-center cursor-pointer text-xs"
                    title={"Previous page"}
                  >
                    <ChevronLeft className="w-3.5 h-3.5" />
                  </button>

                  {Array.from({ length: totalReconPages }, (_, i) => i + 1)
                    .filter(
                      (num) =>
                        num === 1 ||
                        num === totalReconPages ||
                        (num >= reconCurrentPage - 1 && num <= reconCurrentPage + 1)
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
                        <span key={`rc-top-dots-${idx}`} className="px-1 text-neutral-400 font-bold text-xs">
                          ...
                        </span>
                      ) : (
                        <button
                          key={`rc-top-page-${item}`}
                          type="button"
                          onClick={() => setReconCurrentPage(item)}
                          className={`w-7 h-7 rounded-lg font-bold text-xs transition-colors cursor-pointer ${
                            reconCurrentPage === item
                              ? "bg-neutral-900 text-white shadow-xs"
                              : "hover:bg-neutral-100 text-neutral-700 border border-neutral-200 bg-white"
                          }`}
                        >
                          {item}
                        </button>
                      )
                    )}

                  <button
                    type="button"
                    disabled={reconCurrentPage === totalReconPages}
                    onClick={() => setReconCurrentPage((p) => Math.min(totalReconPages, p + 1))}
                    className="p-1.5 rounded-lg border border-neutral-200 hover:bg-neutral-100 disabled:opacity-40 disabled:hover:bg-transparent text-neutral-700 font-semibold transition-colors flex items-center cursor-pointer text-xs"
                    title={"Next page"}
                  >
                    <ChevronRight className="w-3.5 h-3.5" />
                  </button>
                </div>
              )}

              {["ALL", "SSLCOMMERZ", "COD", "BKASH", "NAGAD", "ROCKET"].map((m) => (
                <button
                  key={m}
                  onClick={() => setSelectedMethod(m)}
                  className={`px-2.5 py-1.5 rounded-xl text-xs font-semibold transition-all cursor-pointer whitespace-nowrap shrink-0 ${selectedMethod === m
                      ? "bg-neutral-900 text-white font-bold"
                      : "bg-neutral-100 text-neutral-600 hover:bg-neutral-200"
                    }`}
                >
                  {m}
                </button>
              ))}
            </div>
          </div>

          {selectedReconOrderIds.length > 0 && (
            <div className="p-3 rounded-2xl bg-rose-50/70 border border-rose-200 flex items-center justify-between gap-3 text-xs">
              <span className="font-bold text-neutral-800">
                {selectedReconOrderIds.length} order(s) selected
              </span>
              <button
                type="button"
                disabled={isDeletingItems}
                onClick={() => setDeleteDialog({ scope: "recon", mode: "bulk" })}
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
                  paginatedOrders.map((ord) => (
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
                        <span className={`px-2 py-0.5 rounded font-bold text-[10px] ${ord.paymentMethod === "SSLCOMMERZ"
                            ? "bg-blue-100 text-blue-900 border border-blue-200"
                            : ord.paymentMethod === "COD"
                              ? "bg-emerald-50 text-emerald-800"
                              : "bg-pink-50 text-pink-800"
                          }`}>
                          {ord.paymentMethod}
                        </span>
                      </td>
                      <td className="py-3 px-3">
                        <span
                          className={`px-2 py-0.5 rounded-full text-[10px] font-bold ${ord.paymentStatus === "PAID"
                              ? "bg-emerald-100 text-emerald-800"
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
                        {formatBDT(ord.total)}
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
                          disabled={isDeletingItems}
                          onClick={() => setDeleteDialog({ scope: "recon", mode: "single", item: ord })}
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

          {/* Bottom Pagination Bar for Orders Reconciliation */}
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
                  className="px-2.5 py-1.5 rounded-lg border border-neutral-200 hover:bg-neutral-100 disabled:opacity-40 disabled:hover:bg-transparent text-neutral-700 font-semibold transition-colors flex items-center gap-1 cursor-pointer"
                >
                  <ChevronLeft className="w-3.5 h-3.5" />
                  <span className="hidden sm:inline">{"Previous"}</span>
                </button>

                {Array.from({ length: totalReconPages }, (_, i) => i + 1)
                  .filter(
                    (num) =>
                      num === 1 ||
                      num === totalReconPages ||
                      (num >= reconCurrentPage - 1 && num <= reconCurrentPage + 1)
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
                      <span key={`rc-dots-${idx}`} className="px-2 text-neutral-400 font-bold">
                        ...
                      </span>
                    ) : (
                      <button
                        key={`rc-page-${item}`}
                        type="button"
                        onClick={() => setReconCurrentPage(item)}
                        className={`w-8 h-8 rounded-lg font-bold text-xs transition-colors cursor-pointer ${
                          reconCurrentPage === item
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
                  disabled={reconCurrentPage === totalReconPages}
                  onClick={() => setReconCurrentPage((p) => Math.min(totalReconPages, p + 1))}
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

      {/* TAB 3: Gateway Credentials & Settings */}
      {activeTab === "config" && (
        <div className="bg-white rounded-3xl border border-neutral-200 shadow-xs p-6 sm:p-8 max-w-3xl space-y-6">
          <div className="border-b border-neutral-100 pb-4">
            <h3 className="text-lg font-bold text-neutral-900 flex items-center gap-2">
              <Sliders className="w-5 h-5 text-blue-600" />
              <span>{"SSLCommerz Merchant Configuration"}</span>
            </h3>
            <p className="text-xs text-neutral-500 mt-1">
              {"Configure your official SSLCommerz Store ID, Store Password, and toggle between Sandbox test box and Production live environment."}
            </p>
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
                <label className="block font-bold text-neutral-700 mb-1">
                  Store ID (Merchant ID)
                </label>
                <input
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
                <label className="block font-bold text-neutral-700 mb-1">
                  Store Password (Secret Key)
                </label>
                <input
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
                <label className="block font-bold text-neutral-700 mb-1">
                  Gateway Processing Fee (%)
                </label>
                <input
                  type="number"
                  step="0.1"
                  value={gatewayConfig.fee_percent}
                  onChange={(e) => setGatewayConfig({ ...gatewayConfig, fee_percent: e.target.value })}
                  className="w-full px-3.5 py-2.5 rounded-xl border border-neutral-300 text-xs outline-none focus:border-blue-600"
                />
              </div>

              <div>
                <label className="block font-bold text-neutral-700 mb-1">
                  Gateway Status
                </label>
                <select
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

            <div className="pt-4 flex justify-end">
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
      )}

      {/* TAB 4: Payment Methods & MFS Channels Configuration */}
      {activeTab === "methods" && (
        <div className="space-y-6">
          {/* Top Info & Action Bar */}
          <div className="bg-white rounded-3xl p-6 border border-neutral-200 shadow-xs flex flex-wrap items-center justify-between gap-4">
            <div>
              <div className="flex items-center gap-2">
                <span className="text-xs font-bold uppercase tracking-wider text-emerald-800 bg-emerald-100 px-2.5 py-1 rounded-full border border-emerald-300">
                  {"Checkout Synchronized"}
                </span>
                <span className="text-xs font-bold uppercase tracking-wider text-neutral-600 bg-neutral-100 px-2.5 py-1 rounded-full border border-neutral-200">
                  {paymentMethods.filter((m) => m.is_active).length} of {paymentMethods.length} Channels Active
                </span>
              </div>
              <h2 className="text-xl font-black text-neutral-900 mt-2">
                {"Payment Methods & MFS Number Manager"}
              </h2>
              <p className="text-xs text-neutral-500 mt-0.5 max-w-2xl leading-relaxed">
                {"Enable or disable any payment method on the checkout page instantly. Update your merchant/personal wallet numbers and payment instructions. Changes synchronize across both the Guest Checkout Modal and the Product Details page."}
              </p>
            </div>

            <div className="flex items-center gap-3">
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
                    <div className="p-3.5 rounded-2xl bg-blue-50/60 border border-blue-200/80 space-y-2 text-xs">
                      <div className="flex items-center justify-between text-blue-950 font-bold">
                        <span>SSLCommerz Automated Multi-Card & MFS</span>
                        <button
                          type="button"
                          onClick={() => setActiveTab("config")}
                          className="text-[11px] text-blue-700 underline hover:text-blue-800 cursor-pointer font-bold"
                        >
                          Configure API Credentials →
                        </button>
                      </div>
                      <p className="text-[11px] text-blue-800/90 leading-relaxed">
                        Automated online payment gateway (Visa, MasterCard, bKash, Nagad). When enabled, customers can pay directly via secure OTP-verified gateway.
                      </p>
                    </div>
                  )}
                </div>
              );
            })}
          </div>

          {/* Live Customer Checkout Preview Box */}
          <div className="bg-neutral-900 text-white rounded-3xl p-6 shadow-xl space-y-4 border border-neutral-800">
            <div className="flex items-center justify-between border-b border-neutral-800 pb-3">
              <div className="flex items-center gap-2">
                <Eye className="w-5 h-5 text-emerald-400" />
                <h3 className="font-bold text-sm text-white">
                  {"Live Checkout Preview (Customer View)"}
                </h3>
              </div>
              <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-emerald-500/20 text-emerald-300 border border-emerald-500/30">
                Real-Time Simulated
              </span>
            </div>

            <p className="text-xs text-neutral-400">
              Payment methods and numbers configured above will appear dynamically to customers on checkout:
            </p>

            {/* Simulated Checkout Buttons */}
            <div className="space-y-3 p-4 bg-neutral-950 rounded-2xl border border-neutral-800">
              <div className="text-xs font-bold text-neutral-300 mb-2">2. Select Payment Method:</div>

              {/* Row 1: SSLCommerz & COD */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                {paymentMethods.find((m) => m.method_id === "sslcommerz")?.is_active && (
                  <div className="p-3 rounded-xl border border-blue-500 bg-blue-950/40 text-white flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <CreditCard className="w-4 h-4 text-blue-400" />
                      <span className="font-bold text-xs">Pay Online (SSLCommerz)</span>
                    </div>
                    <span className="text-[9px] px-1.5 py-0.5 rounded bg-blue-500/30 text-blue-300 font-bold">
                      Cards & MFS
                    </span>
                  </div>
                )}

                {paymentMethods.find((m) => m.method_id === "cod")?.is_active && (
                  <div className="p-3 rounded-xl border border-emerald-500/80 bg-emerald-950/40 text-white flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <span className="text-base">💵</span>
                      <span className="font-bold text-xs">Cash on Delivery</span>
                    </div>
                    <span className="text-[9px] px-1.5 py-0.5 rounded bg-emerald-500/30 text-emerald-300 font-bold">
                      Pay on Delivery
                    </span>
                  </div>
                )}
              </div>

              {/* Row 2: Manual MFS Equal Width */}
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-2.5 pt-1">
                {paymentMethods.find((m) => m.method_id === "bkash")?.is_active && (
                  <div className="p-2.5 rounded-xl border border-pink-500/80 bg-pink-950/30 flex items-center justify-between">
                    <span className="font-bold text-xs text-pink-300">bKash Manual</span>
                    <span className="text-[9px] font-mono text-pink-200">
                      {paymentMethods.find((m) => m.method_id === "bkash")?.number || "01892-019281"}
                    </span>
                  </div>
                )}

                {paymentMethods.find((m) => m.method_id === "nagad")?.is_active && (
                  <div className="p-2.5 rounded-xl border border-amber-500/80 bg-amber-950/30 flex items-center justify-between">
                    <span className="font-bold text-xs text-amber-300">Nagad Manual</span>
                    <span className="text-[9px] font-mono text-amber-200">
                      {paymentMethods.find((m) => m.method_id === "nagad")?.number || "01918-293810"}
                    </span>
                  </div>
                )}

                {paymentMethods.find((m) => m.method_id === "rocket")?.is_active && (
                  <div className="p-2.5 rounded-xl border border-purple-500/80 bg-purple-950/30 flex items-center justify-between">
                    <span className="font-bold text-xs text-purple-300">Rocket Manual</span>
                    <span className="text-[9px] font-mono text-purple-200">
                      {paymentMethods.find((m) => m.method_id === "rocket")?.number || "01712-345678"}
                    </span>
                  </div>
                )}
              </div>
            </div>

            <div className="flex justify-end pt-2">
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
        </div>
      )}

      {/* Transaction Details Modal */}
      {selectedTxn && (
        <div className="fixed inset-0 z-50 overflow-y-auto bg-black/60 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl max-w-lg w-full p-6 space-y-4 shadow-2xl animate-in fade-in zoom-in-95 duration-200">
            <div className="flex items-center justify-between pb-3 border-b border-neutral-100">
              <div>
                <span className="text-[10px] font-bold uppercase tracking-wider text-blue-700 bg-blue-50 px-2 py-0.5 rounded-full">
                  SSLCommerz Transaction
                </span>
                <h3 className="font-bold text-base text-neutral-900 mt-1 font-mono">
                  {selectedTxn.tran_id}
                </h3>
              </div>
              <button
                onClick={() => setSelectedTxn(null)}
                className="p-1 rounded-full hover:bg-neutral-100 text-neutral-400 hover:text-neutral-700 cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="space-y-2 text-xs">
              <div className="flex justify-between py-1 border-b border-neutral-50">
                <span className="text-neutral-500">Order ID:</span>
                <span className="font-mono font-bold text-blue-700">#{selectedTxn.order_id}</span>
              </div>
              <div className="flex justify-between py-1 border-b border-neutral-50">
                <span className="text-neutral-500">Amount:</span>
                <span className="font-bold text-neutral-900">{formatBDT(selectedTxn.amount)}</span>
              </div>
              <div className="flex justify-between py-1 border-b border-neutral-50">
                <span className="text-neutral-500">Status:</span>
                <div>{getStatusBadge(selectedTxn.status)}</div>
              </div>
              <div className="flex justify-between py-1 border-b border-neutral-50">
                <span className="text-neutral-500">Validation ID (val_id):</span>
                <span className="font-mono text-[11px] text-neutral-800">{selectedTxn.val_id || "None"}</span>
              </div>
              <div className="flex justify-between py-1 border-b border-neutral-50">
                <span className="text-neutral-500">Card / Channel:</span>
                <span className="font-bold text-neutral-800">{selectedTxn.card_type || "N/A"}</span>
              </div>
              <div className="flex justify-between py-1 border-b border-neutral-50">
                <span className="text-neutral-500">Card Issuer:</span>
                <span className="text-neutral-800">{selectedTxn.card_issuer || "N/A"}</span>
              </div>
              <div className="flex justify-between py-1 border-b border-neutral-50">
                <span className="text-neutral-500">Bank Trx ID:</span>
                <span className="font-mono text-neutral-800">{selectedTxn.bank_tran_id || "N/A"}</span>
              </div>
              <div className="flex justify-between py-1 border-b border-neutral-50">
                <span className="text-neutral-500">Customer:</span>
                <span className="text-neutral-800 font-medium">
                  {selectedTxn.customer_name} ({selectedTxn.customer_phone})
                </span>
              </div>
              {selectedTxn.error_reason && (
                <div className="p-3 rounded-xl bg-rose-50 border border-rose-200 text-rose-800 text-[11px] mt-2">
                  <b>Failure Reason:</b> {selectedTxn.error_reason}
                </div>
              )}
            </div>

            <div className="pt-3 border-t border-neutral-100 flex items-center justify-between gap-2">
              {selectedTxn.status !== "VALIDATED" && (
                <button
                  onClick={() => handleVerifyTxn(selectedTxn.tran_id, selectedTxn.val_id || "")}
                  className="px-3.5 py-2 rounded-xl bg-blue-600 hover:bg-blue-700 text-white font-bold text-xs cursor-pointer flex items-center gap-1.5"
                >
                  <ShieldCheck className="w-3.5 h-3.5" />
                  <span>Verify with SSLCommerz Server</span>
                </button>
              )}
              <button
                onClick={() => setSelectedTxn(null)}
                className="px-4 py-2 rounded-xl bg-neutral-100 hover:bg-neutral-200 text-neutral-700 font-bold text-xs ml-auto cursor-pointer"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Move to Recycle Bin Confirmation Modal */}
      {deleteDialog && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-xs">
          <div className="bg-white rounded-3xl border border-neutral-200 shadow-2xl w-full max-w-md p-6 space-y-4">
            <div className="flex items-start gap-3">
              <div className="w-11 h-11 rounded-2xl bg-rose-100 text-rose-600 flex items-center justify-center shrink-0">
                <AlertTriangle className="w-6 h-6" />
              </div>
              <div>
                <h3 className="text-base font-black text-neutral-900">
                  {deleteDialog.scope === "txn"
                    ? deleteDialog.mode === "bulk"
                      ? `Move ${selectedTxnIds.length} Transactions to Recycle Bin?`
                      : `Move Transaction ${deleteDialog.item?.tran_id} to Recycle Bin?`
                    : deleteDialog.mode === "bulk"
                    ? `Move ${selectedReconOrderIds.length} Orders to Recycle Bin?`
                    : `Move Order ${formatReconOrderId(deleteDialog.item?.id)} to Recycle Bin?`}
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
                onClick={() => setDeleteDialog(null)}
                className="px-4 py-2 rounded-xl border border-neutral-200 hover:bg-neutral-50 text-neutral-700 font-bold text-xs cursor-pointer"
              >
                {"Cancel"}
              </button>
              <button
                type="button"
                disabled={isDeletingItems}
                onClick={handleConfirmDeleteDialog}
                className="px-4 py-2 rounded-xl bg-rose-600 hover:bg-rose-700 text-white font-bold text-xs shadow-sm cursor-pointer flex items-center gap-1.5"
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

export { AdminPayments };
