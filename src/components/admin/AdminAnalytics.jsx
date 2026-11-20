import { useState, useEffect, useMemo } from "react";
import {
  TrendingUp,
  ShoppingBag,
  Clock,
  Truck,
  DollarSign,
  CreditCard,
  Smartphone,
  Banknote,
  AlertTriangle,
  RefreshCw,
  CheckCircle2,
  Activity
} from "lucide-react";
import { formatBDT } from "../../utils/bangladesh";
import { apiClient } from "../../services/api";
import { realtimeService } from "../../services/realtime";

const createSmoothPath = (pts) => {
  if (!pts || pts.length === 0) return "";
  if (pts.length === 1) return `M ${pts[0].x},${pts[0].y}`;
  let path = `M ${pts[0].x},${pts[0].y}`;
  for (let i = 0; i < pts.length - 1; i++) {
    const p0 = pts[i];
    const p1 = pts[i + 1];
    const cx = p0.x + (p1.x - p0.x) / 2;
    path += ` C ${cx},${p0.y} ${cx},${p1.y} ${p1.x},${p1.y}`;
  }
  return path;
};

const AnalyticsTrendChart = ({
  title,
  subtitle,
  data = [],
  valueKey = "value",
  secondaryKey = null,
  color = "#10B981",
  secondaryColor = "#F59E0B",
  primaryLabel = "Primary",
  secondaryLabel = "Secondary",
  formatVal = (v) => String(v),
  gradId = "trendGrad",
}) => {
  const [hoveredIdx, setHoveredIdx] = useState(null);
  const width = 460;
  const height = 190;
  const padX = 28;
  const padTop = 22;
  const padBottom = 28;
  const usableW = width - padX * 2;
  const usableH = height - padTop - padBottom;

  const maxVal = Math.max(
    ...data.map((d) => Math.max(Number(d[valueKey] || 0), Number(secondaryKey ? d[secondaryKey] || 0 : 0))),
    1
  );

  const buildPoints = (key) =>
    data.map((d, i) => ({
      ...d,
      val: Number(d[key] || 0),
      x: padX + (i / Math.max(data.length - 1, 1)) * usableW,
      y: height - padBottom - (Number(d[key] || 0) / maxVal) * usableH,
    }));

  const primaryPts = buildPoints(valueKey);
  const secondaryPts = secondaryKey ? buildPoints(secondaryKey) : [];
  const linePath = createSmoothPath(primaryPts);
  const areaPath =
    primaryPts.length > 0
      ? `${linePath} L ${primaryPts[primaryPts.length - 1].x},${height - padBottom} L ${primaryPts[0].x},${height - padBottom} Z`
      : "";
  const secondaryPath = secondaryKey ? createSmoothPath(secondaryPts) : "";

  return (
    <div className="bg-white rounded-3xl p-5 border border-neutral-200 shadow-xs space-y-3">
      <div className="flex flex-wrap items-start justify-between gap-2">
        <div>
          <h3 className="text-sm font-black text-neutral-900">{title}</h3>
          <p className="text-[11px] text-neutral-500">{subtitle}</p>
        </div>
        <div className="flex items-center gap-3 text-[11px] font-bold">
          <span className="flex items-center gap-1.5 text-neutral-700">
            <span className="w-2.5 h-2.5 rounded-full" style={{ backgroundColor: color }} />
            {primaryLabel}
          </span>
          {secondaryKey && (
            <span className="flex items-center gap-1.5 text-neutral-700">
              <span className="w-2.5 h-2.5 rounded-full" style={{ backgroundColor: secondaryColor }} />
              {secondaryLabel}
            </span>
          )}
        </div>
      </div>

      <svg viewBox={`0 0 ${width} ${height}`} className="w-full h-auto overflow-visible select-none">
        <defs>
          <linearGradient id={gradId} x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor={color} stopOpacity="0.28" />
            <stop offset="100%" stopColor={color} stopOpacity="0.0" />
          </linearGradient>
        </defs>

        {[0, 0.5, 1].map((ratio, idx) => {
          const y = height - padBottom - usableH * ratio;
          return (
            <line
              key={idx}
              x1={padX}
              y1={y}
              x2={width - padX}
              y2={y}
              stroke="#E5E7EB"
              strokeDasharray="3 3"
              strokeWidth="1"
            />
          );
        })}

        {areaPath && <path d={areaPath} fill={`url(#${gradId})`} />}
        {linePath && (
          <path d={linePath} fill="none" stroke={color} strokeWidth="2.5" strokeLinecap="round" />
        )}
        {secondaryPath && (
          <path
            d={secondaryPath}
            fill="none"
            stroke={secondaryColor}
            strokeWidth="2"
            strokeDasharray="4 3"
            strokeLinecap="round"
          />
        )}

        {primaryPts.map((pt, idx) => {
          const secPt = secondaryPts[idx];
          const isHovered = hoveredIdx === idx;
          return (
            <g
              key={pt.date || idx}
              onMouseEnter={() => setHoveredIdx(idx)}
              onMouseLeave={() => setHoveredIdx(null)}
              className="cursor-pointer"
            >
              <circle
                cx={pt.x}
                cy={pt.y}
                r={isHovered ? 5 : 3.2}
                fill="#fff"
                stroke={color}
                strokeWidth="2.2"
              />
              {secPt && (
                <circle
                  cx={secPt.x}
                  cy={secPt.y}
                  r={isHovered ? 4.5 : 2.8}
                  fill="#fff"
                  stroke={secondaryColor}
                  strokeWidth="2"
                />
              )}
              {(data.length <= 10 || idx % Math.ceil(data.length / 7) === 0 || idx === data.length - 1) && (
                <text
                  x={pt.x}
                  y={height - 8}
                  textAnchor="middle"
                  fontSize="9.5"
                  fill="#64748B"
                  fontWeight="600"
                >
                  {pt.label}
                </text>
              )}
              {isHovered && (
                <g transform={`translate(${Math.min(Math.max(pt.x - 52, 6), width - 116)}, ${Math.max(pt.y - 44, 4)})`}>
                  <rect width="110" height={secPt ? "38" : "24"} rx="8" fill="#0F172A" />
                  <text x="8" y="15" fontSize="9.5" fill="#fff" fontWeight="700">
                    {`${pt.label}: ${formatVal(pt.val)}`}
                  </text>
                  {secPt && (
                    <text x="8" y="30" fontSize="9" fill="#FCD34D" fontWeight="700">
                      {`${secondaryLabel}: ${secPt.val}`}
                    </text>
                  )}
                </g>
              )}
            </g>
          );
        })}
      </svg>
    </div>
  );
};

const AdminAnalytics = ({ orders = [] }) => {
  const [timeframeDays, setTimeframeDays] = useState(7); // 7 | 14 | 30 | 0 (all)
  const [transactions, setTransactions] = useState([]);
  const [isRefreshing, setIsRefreshing] = useState(false);

  const loadTransactions = async () => {
    setIsRefreshing(true);
    try {
      const txns = await apiClient.getPaymentTransactions();
      setTransactions(Array.isArray(txns) ? txns : []);
    } catch (err) {
      console.warn("Analytics transaction fetch error:", err);
    } finally {
      setIsRefreshing(false);
    }
  };

  useEffect(() => {
    loadTransactions();
    const unsubscribe = realtimeService.subscribe((msg) => {
      const type = typeof msg === "string" ? msg : msg?.type;
      if (
        ["ORDER_CREATED", "ORDER_UPDATED", "ORDER_STATUS_CHANGED", "PAYMENT_RECEIVED", "RECYCLE_BIN_UPDATED"].includes(
          type
        )
      ) {
        loadTransactions();
      }
    });
    return () => {
      if (typeof unsubscribe === "function") unsubscribe();
    };
  }, []);

  const analytics = useMemo(() => {
    const now = new Date();
    const cutoffStr =
      timeframeDays > 0
        ? new Date(now.getTime() - (timeframeDays - 1) * 86400000).toISOString().slice(0, 10)
        : null;

    const scopedOrders = cutoffStr
      ? orders.filter((o) => String(o.createdAt || "").slice(0, 10) >= cutoffStr)
      : orders;

    const scopedTxns = cutoffStr
      ? transactions.filter((t) => String(t.created_at || "").slice(0, 10) >= cutoffStr)
      : transactions;

    let totalEarnings = 0;
    let pendingCount = 0;
    let pendingConfirmationCount = 0;
    let inTransitCount = 0;
    let deliveredCount = 0;
    let cancelledCount = 0;
    let pendingCodAmount = 0;
    let pendingCodCount = 0;

    const gateways = {
      SSLCOMMERZ: { label: "SSLCommerz", amount: 0, paidAmount: 0, count: 0, color: "#2563EB" },
      BKASH: { label: "bKash", amount: 0, paidAmount: 0, count: 0, color: "#DB2777" },
      NAGAD: { label: "Nagad", amount: 0, paidAmount: 0, count: 0, color: "#D97706" },
      ROCKET: { label: "Rocket", amount: 0, paidAmount: 0, count: 0, color: "#7C3AED" },
      COD: { label: "Cash on Delivery", amount: 0, paidAmount: 0, count: 0, color: "#059669" },
    };

    for (const o of scopedOrders) {
      const status = String(o.status || "").toUpperCase();
      const payStatus = String(o.paymentStatus || "").toUpperCase();
      const method = String(o.paymentMethod || "").toUpperCase();
      const total = Number(o.total || 0);

      if (payStatus === "PAID" || status === "DELIVERED") totalEarnings += total;
      if (status === "PENDING") pendingCount += 1;
      else if (status === "CONFIRMED") pendingConfirmationCount += 1;
      else if (["COURIER_CREATED", "PICKED_UP", "IN_TRANSIT", "OUT_FOR_DELIVERY"].includes(status)) {
        inTransitCount += 1;
      } else if (status === "DELIVERED") deliveredCount += 1;
      else if (status === "CANCELLED") cancelledCount += 1;

      if (method === "COD" && !["DELIVERED", "CANCELLED", "RETURNED"].includes(status)) {
        pendingCodAmount += total;
        pendingCodCount += 1;
      }

      if (status !== "CANCELLED" && status !== "RETURNED" && gateways[method]) {
        gateways[method].count += 1;
        gateways[method].amount += total;
        if (payStatus === "PAID" || (method === "COD" && status === "DELIVERED")) {
          gateways[method].paidAmount += total;
        }
      }
    }

    const failedTxns = scopedTxns.filter((t) => t.status === "FAILED");
    const cancelledTxns = scopedTxns.filter((t) => t.status === "CANCELLED");
    const validatedTxns = scopedTxns.filter((t) => t.status === "VALIDATED");
    const initiatedTxns = scopedTxns.filter((t) => t.status === "INITIATED");

    const totalAttempts = scopedOrders.length + failedTxns.length + cancelledTxns.length;
    const totalFailures = failedTxns.length + cancelledCount + cancelledTxns.length;
    const failureRate = totalAttempts > 0 ? ((totalFailures / totalAttempts) * 100).toFixed(1) : "0.0";

    const mfsTotalAmount =
      gateways.BKASH.amount + gateways.NAGAD.amount + gateways.ROCKET.amount;
    const mfsTotalCount =
      gateways.BKASH.count + gateways.NAGAD.count + gateways.ROCKET.count;
    const liveGatewayTotal =
      gateways.SSLCOMMERZ.amount + mfsTotalAmount + gateways.COD.amount;

    // Daily chart buckets
    const daysCount = timeframeDays > 0 ? timeframeDays : 14;
    const buckets = {};
    for (let i = daysCount - 1; i >= 0; i--) {
      const d = new Date(now.getTime() - i * 86400000);
      const iso = d.toISOString().slice(0, 10);
      buckets[iso] = {
        date: iso,
        label: `${d.getDate()} ${d.toLocaleString("en-US", { month: "short" })}`,
        earnings: 0,
        orders: 0,
        pending: 0,
        inTransit: 0,
        confirmed: 0,
      };
    }

    for (const o of scopedOrders) {
      const iso = String(o.createdAt || "").slice(0, 10);
      const b = buckets[iso];
      if (!b) continue;
      const status = String(o.status || "").toUpperCase();
      const payStatus = String(o.paymentStatus || "").toUpperCase();
      b.orders += 1;
      if (payStatus === "PAID" || status === "DELIVERED") b.earnings += Number(o.total || 0);
      if (status === "PENDING") b.pending += 1;
      if (status === "CONFIRMED") b.confirmed += 1;
      if (["COURIER_CREATED", "PICKED_UP", "IN_TRANSIT", "OUT_FOR_DELIVERY"].includes(status)) {
        b.inTransit += 1;
      }
    }

    return {
      scopedOrders,
      totalEarnings,
      pendingCount,
      pendingConfirmationCount,
      inTransitCount,
      deliveredCount,
      cancelledCount,
      pendingCodAmount,
      pendingCodCount,
      gateways,
      mfsTotalAmount,
      mfsTotalCount,
      liveGatewayTotal,
      failedTxns,
      cancelledTxns,
      validatedTxns,
      initiatedTxns,
      failureRate,
      dailySeries: Object.values(buckets),
    };
  }, [orders, transactions, timeframeDays]);

  return (
    <div className="space-y-6">
      {/* Header & Timeframe Selector */}
      <div className="bg-white rounded-3xl p-5 sm:p-6 border border-neutral-200 shadow-xs flex flex-wrap items-center justify-between gap-4">
        <div>
          <span className="text-[11px] font-bold uppercase tracking-wider text-indigo-700 bg-indigo-50 px-2.5 py-1 rounded-full">
            {"Real-Time Store Intelligence"}
          </span>
          <h1 className="text-2xl font-black text-neutral-900 mt-1.5 flex items-center gap-2">
            <Activity className="w-6 h-6 text-emerald-600" />
            <span>{"Analytics & Live Revenue Telemetry"}</span>
          </h1>
          <p className="text-xs text-neutral-500 mt-0.5">
            {"Live earnings, order pipeline velocity, MFS/SSLCommerz/COD breakdown, and payment failure rates."}
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          {[
            { days: 7, label: "7 Days" },
            { days: 14, label: "14 Days" },
            { days: 30, label: "30 Days" },
            { days: 0, label: "All Time" },
          ].map((opt) => (
            <button
              key={opt.days}
              type="button"
              onClick={() => setTimeframeDays(opt.days)}
              className={`px-3 py-1.5 rounded-xl text-xs font-bold cursor-pointer transition-all ${
                timeframeDays === opt.days
                  ? "bg-neutral-900 text-white shadow-xs"
                  : "bg-neutral-100 text-neutral-600 hover:bg-neutral-200"
              }`}
            >
              {opt.label}
            </button>
          ))}
          <button
            type="button"
            onClick={loadTransactions}
            className="p-2 rounded-xl border border-neutral-200 hover:bg-neutral-50 text-neutral-600 cursor-pointer"
            title="Refresh live telemetry"
          >
            <RefreshCw className={`w-4 h-4 ${isRefreshing ? "animate-spin" : ""}`} />
          </button>
        </div>
      </div>

      {/* Primary KPI Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {[
          {
            title: "Total Earnings",
            value: formatBDT(analytics.totalEarnings),
            sub: `${analytics.deliveredCount} Delivered • ${analytics.validatedTxns.length} Gateway Settled`,
            icon: <DollarSign className="w-4 h-4 text-emerald-600" />,
            badge: "bg-emerald-50",
            border: "border-emerald-200",
          },
          {
            title: "Total Orders",
            value: `${analytics.scopedOrders.length} Orders`,
            sub: `Pending: ${analytics.pendingCount} • Confirmed: ${analytics.pendingConfirmationCount}`,
            icon: <ShoppingBag className="w-4 h-4 text-blue-600" />,
            badge: "bg-blue-50",
            border: "border-blue-200",
          },
          {
            title: "In Transit & Pending COD",
            value: formatBDT(analytics.pendingCodAmount),
            sub: `${analytics.inTransitCount} In Transit • ${analytics.pendingCodCount} Pending COD`,
            icon: <Truck className="w-4 h-4 text-indigo-600" />,
            badge: "bg-indigo-50",
            border: "border-indigo-200",
          },
          {
            title: "Failure & Cancel Rate",
            value: `${analytics.failureRate}%`,
            sub: `${analytics.failedTxns.length} Failed Txns • ${analytics.cancelledCount + analytics.cancelledTxns.length} Cancelled`,
            icon: <AlertTriangle className="w-4 h-4 text-rose-600" />,
            badge: "bg-rose-50",
            border: "border-rose-200",
          },
        ].map((card) => (
          <div key={card.title} className={`bg-white rounded-2xl p-4 border ${card.border} shadow-xs space-y-1.5`}>
            <div className="flex items-center justify-between">
              <span className="text-[11px] font-bold text-neutral-500 uppercase tracking-wider">{card.title}</span>
              <div className={`p-1.5 rounded-xl ${card.badge}`}>{card.icon}</div>
            </div>
            <div className="text-2xl font-black text-neutral-950">{card.value}</div>
            <p className="text-[11px] text-neutral-600 font-medium">{card.sub}</p>
          </div>
        ))}
      </div>

      {/* Live Visual Trend Graphs */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
        <AnalyticsTrendChart
          title="Earnings Revenue Graph"
          subtitle="Daily settled & paid revenue trend"
          data={analytics.dailySeries}
          valueKey="earnings"
          color="#10B981"
          primaryLabel="Earnings (৳)"
          formatVal={(v) => formatBDT(v)}
          gradId="analyticsEarningsGrad"
        />

        <AnalyticsTrendChart
          title="Orders vs Pending Pipeline Graph"
          subtitle="Total daily orders compared with pending & in-transit queue"
          data={analytics.dailySeries}
          valueKey="orders"
          secondaryKey="pending"
          color="#2563EB"
          secondaryColor="#F59E0B"
          primaryLabel="Total Orders"
          secondaryLabel="Pending"
          formatVal={(v) => `${v} Orders`}
          gradId="analyticsOrdersGrad"
        />
      </div>

      {/* Order Stages Breakdown & Gateway Revenue Share */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-5">
        {/* Order Operations Pipeline Visual */}
        <div className="bg-white rounded-3xl p-5 border border-neutral-200 shadow-xs space-y-4">
          <div className="flex items-center justify-between">
            <div>
              <h3 className="text-sm font-black text-neutral-900">{"Order Stage Velocity"}</h3>
              <p className="text-[11px] text-neutral-500">{"Live distribution across fulfillment states"}</p>
            </div>
            <Clock className="w-4 h-4 text-neutral-400" />
          </div>

          <div className="space-y-3 text-xs">
            {[
              { label: "Pending Orders", count: analytics.pendingCount, color: "bg-amber-500" },
              { label: "Pending Confirmation", count: analytics.pendingConfirmationCount, color: "bg-blue-500" },
              { label: "In Transit (Courier)", count: analytics.inTransitCount, color: "bg-indigo-500" },
              { label: "Delivered", count: analytics.deliveredCount, color: "bg-emerald-500" },
              { label: "Cancelled", count: analytics.cancelledCount, color: "bg-rose-500" },
            ].map((stage) => {
              const pct = Math.round((stage.count / Math.max(analytics.scopedOrders.length, 1)) * 100);
              return (
                <div key={stage.label} className="space-y-1">
                  <div className="flex justify-between font-bold text-neutral-800">
                    <span>{stage.label}</span>
                    <span>{`${stage.count} (${pct}%)`}</span>
                  </div>
                  <div className="w-full bg-neutral-100 h-2 rounded-full overflow-hidden">
                    <div className={`${stage.color} h-2 rounded-full transition-all`} style={{ width: `${pct}%` }} />
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {/* Gateway & MFS Breakdown */}
        <div className="lg:col-span-2 bg-white rounded-3xl p-5 border border-neutral-200 shadow-xs space-y-4">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <div>
              <h3 className="text-sm font-black text-neutral-900">
                {"Live Gateway, MFS (bKash • Nagad • Rocket) & COD Breakdown"}
              </h3>
              <p className="text-[11px] text-neutral-500">
                {"Total active volume across all payment channels: "}
                <strong className="text-neutral-900">{formatBDT(analytics.liveGatewayTotal)}</strong>
              </p>
            </div>
            <span className="text-[11px] font-bold px-2.5 py-1 rounded-full bg-emerald-50 text-emerald-700 border border-emerald-200">
              {`MFS Combined: ${formatBDT(analytics.mfsTotalAmount)} (${analytics.mfsTotalCount})`}
            </span>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
            {Object.entries(analytics.gateways).map(([key, gw]) => {
              const share = Math.round((gw.amount / Math.max(analytics.liveGatewayTotal, 1)) * 100);
              return (
                <div key={key} className="p-3.5 rounded-2xl border border-neutral-200 bg-neutral-50/70 space-y-2">
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-extrabold text-neutral-900 flex items-center gap-1.5">
                      {key === "SSLCOMMERZ" ? (
                        <CreditCard className="w-3.5 h-3.5 text-blue-600" />
                      ) : key === "COD" ? (
                        <Banknote className="w-3.5 h-3.5 text-emerald-600" />
                      ) : (
                        <Smartphone className="w-3.5 h-3.5 text-pink-600" />
                      )}
                      {gw.label}
                    </span>
                    <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-white border border-neutral-200 text-neutral-700">
                      {share}%
                    </span>
                  </div>
                  <div className="text-lg font-black text-neutral-950">{formatBDT(gw.amount)}</div>
                  <div className="w-full bg-neutral-200 h-1.5 rounded-full overflow-hidden">
                    <div className="h-1.5 rounded-full" style={{ width: `${share}%`, backgroundColor: gw.color }} />
                  </div>
                  <div className="text-[10px] text-neutral-600 font-semibold flex justify-between">
                    <span>{`${gw.count} Orders`}</span>
                    <span>{`Paid: ${formatBDT(gw.paidAmount)}`}</span>
                  </div>
                </div>
              );
            })}

            {/* Failure Diagnostics Card */}
            <div className="p-3.5 rounded-2xl border border-rose-200 bg-rose-50/50 space-y-2">
              <div className="flex items-center justify-between">
                <span className="text-xs font-extrabold text-rose-800 flex items-center gap-1.5">
                  <AlertTriangle className="w-3.5 h-3.5 text-rose-600" />
                  {"Payment Health"}
                </span>
                <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-rose-100 text-rose-800">
                  {`${analytics.failureRate}% Fail`}
                </span>
              </div>
              <div className="text-lg font-black text-rose-700">
                {`${analytics.validatedTxns.length} Validated`}
              </div>
              <div className="text-[10px] text-rose-800 font-semibold space-y-0.5">
                <div>{`Failed Sessions: ${analytics.failedTxns.length}`}</div>
                <div>{`Cancelled / Incomplete: ${analytics.cancelledTxns.length + analytics.initiatedTxns.length}`}</div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export { AdminAnalytics };

