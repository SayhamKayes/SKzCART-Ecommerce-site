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
  Activity,
  Maximize2,
  X,
  Calendar,
  BarChart3
} from "lucide-react";
import { formatBDT } from "../../utils/bangladesh";
import { apiClient } from "../../services/api";
import { realtimeService } from "../../services/realtime";
import {
  TIMEFRAME_OPTIONS,
  extractLocalISODate,
  getDefaultCustomRange,
  resolveAnalyticsBounds,
  isWithinISORange,
  buildAnalyticsSeries,
  isSettledOrderEarning,
  getOrderNetEarning,
} from "../../utils/analyticsRange";

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

const TimeframeControls = ({
  timeframeKey,
  onSelectTimeframe,
  customRange,
  onChangeCustomRange,
  onRefresh,
  isRefreshing = false,
}) => (
  <div className="flex flex-col items-start lg:items-end gap-2">
    <div className="flex flex-wrap items-center gap-1.5">
      {TIMEFRAME_OPTIONS.map((opt) => (
        <button
          key={opt.key}
          type="button"
          onClick={() => onSelectTimeframe(opt.key)}
          className={`px-3 py-1.5 rounded-xl text-xs font-bold cursor-pointer transition-all flex items-center gap-1.5 ${
            timeframeKey === opt.key
              ? "bg-neutral-900 text-white shadow-xs"
              : "bg-neutral-100 text-neutral-600 hover:bg-neutral-200"
          }`}
        >
          {opt.key === "custom" && <Calendar className="w-3.5 h-3.5" />}
          <span>{opt.label}</span>
        </button>
      ))}
      {onRefresh && (
        <button
          type="button"
          onClick={onRefresh}
          className="p-2 rounded-xl border border-neutral-200 hover:bg-neutral-50 text-neutral-600 cursor-pointer"
          title="Refresh live telemetry"
        >
          <RefreshCw className={`w-4 h-4 ${isRefreshing ? "animate-spin" : ""}`} />
        </button>
      )}
    </div>

    {timeframeKey === "custom" && (
      <div className="flex flex-wrap items-center gap-2 bg-neutral-50 border border-neutral-200 rounded-2xl px-3 py-1.5">
        <span className="text-[11px] font-bold text-neutral-500">{"From:"}</span>
        <input
          type="date"
          value={customRange.start}
          max={customRange.end || undefined}
          onChange={(e) =>
            onChangeCustomRange((prev) => ({ ...prev, start: e.target.value }))
          }
          className="bg-white border border-neutral-200 rounded-lg px-2 py-1 text-xs font-bold text-neutral-800 focus:outline-none focus:border-emerald-500"
        />
        <span className="text-[11px] font-bold text-neutral-500">{"To:"}</span>
        <input
          type="date"
          value={customRange.end}
          min={customRange.start || undefined}
          onChange={(e) =>
            onChangeCustomRange((prev) => ({ ...prev, end: e.target.value }))
          }
          className="bg-white border border-neutral-200 rounded-lg px-2 py-1 text-xs font-bold text-neutral-800 focus:outline-none focus:border-emerald-500"
        />
      </div>
    )}
  </div>
);

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
  onExpand = null,
  isExpanded = false,
}) => {
  const [hoveredIdx, setHoveredIdx] = useState(null);
  const width = isExpanded ? 780 : 480;
  const height = isExpanded ? 310 : 210;
  const padLeft = isExpanded ? 66 : 30;
  const padRight = 24;
  const padTop = 24;
  const padBottom = 32;
  const usableW = width - padLeft - padRight;
  const usableH = height - padTop - padBottom;

  const maxVal = Math.max(
    ...data.map((d) =>
      Math.max(Number(d[valueKey] || 0), Number(secondaryKey ? d[secondaryKey] || 0 : 0))
    ),
    1
  );

  const buildPoints = (key) =>
    data.map((d, i) => ({
      ...d,
      val: Number(d[key] || 0),
      x:
        data.length === 1
          ? padLeft + usableW / 2
          : padLeft + (i / Math.max(data.length - 1, 1)) * usableW,
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

  const maxLabels = isExpanded ? 14 : 7;
  const labelStride = Math.max(1, Math.ceil(data.length / maxLabels));

  return (
    <div
      className={
        isExpanded
          ? "space-y-4"
          : "bg-white rounded-3xl p-5 border border-neutral-200 shadow-xs flex flex-col justify-between h-full gap-3"
      }
    >
      <div className="flex flex-wrap items-start justify-between gap-2">
        <div>
          {!isExpanded && <h3 className="text-sm font-black text-neutral-900">{title}</h3>}
          {!isExpanded && <p className="text-[11px] text-neutral-500">{subtitle}</p>}
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
          {onExpand && (
            <button
              type="button"
              onClick={onExpand}
              className="p-1.5 rounded-lg border border-neutral-200 hover:bg-neutral-100 text-neutral-600 cursor-pointer transition-colors"
              title="Open large view"
              aria-label={`Expand ${title}`}
            >
              <Maximize2 className="w-3.5 h-3.5" />
            </button>
          )}
        </div>
      </div>

      <svg viewBox={`0 0 ${width} ${height}`} className="w-full h-auto overflow-visible select-none">
        <defs>
          <linearGradient id={`${gradId}-${isExpanded ? "lg" : "sm"}`} x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor={color} stopOpacity="0.28" />
            <stop offset="100%" stopColor={color} stopOpacity="0.0" />
          </linearGradient>
        </defs>

        {[0, 0.5, 1].map((ratio, idx) => {
          const y = height - padBottom - usableH * ratio;
          const tickVal = Math.round(maxVal * ratio);
          return (
            <g key={idx}>
              <line
                x1={padLeft}
                y1={y}
                x2={width - padRight}
                y2={y}
                stroke="#E5E7EB"
                strokeDasharray="3 3"
                strokeWidth="1"
              />
              {isExpanded && (
                <text
                  x={padLeft - 8}
                  y={y + 3}
                  textAnchor="end"
                  fontSize="10"
                  fill="#64748B"
                  fontWeight="700"
                >
                  {formatVal(tickVal)}
                </text>
              )}
            </g>
          );
        })}

        {areaPath && <path d={areaPath} fill={`url(#${gradId}-${isExpanded ? "lg" : "sm"})`} />}
        {linePath && (
          <path d={linePath} fill="none" stroke={color} strokeWidth={isExpanded ? "3" : "2.5"} strokeLinecap="round" />
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
          const showLabel =
            data.length <= maxLabels || idx % labelStride === 0 || idx === data.length - 1;
          return (
            <g
              key={pt.key || pt.date || idx}
              onMouseEnter={() => setHoveredIdx(idx)}
              onMouseLeave={() => setHoveredIdx(null)}
              className="cursor-pointer"
            >
              <circle
                cx={pt.x}
                cy={pt.y}
                r={isHovered ? 5.5 : data.length > 20 ? 2.6 : 3.4}
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
              {showLabel && (
                <text
                  x={pt.x}
                  y={height - 8}
                  textAnchor="middle"
                  fontSize={isExpanded ? "10.5" : "9.5"}
                  fill="#64748B"
                  fontWeight="600"
                >
                  {pt.label}
                </text>
              )}
              {isHovered && (
                <g
                  transform={`translate(${Math.min(
                    Math.max(pt.x - 68, 6),
                    width - 144
                  )}, ${Math.max(pt.y - 48, 4)})`}
                >
                  <rect width="138" height={secPt ? "40" : "26"} rx="8" fill="#0F172A" />
                  <text x="8" y="16" fontSize="10" fill="#fff" fontWeight="700">
                    {`${pt.fullLabel || pt.label}: ${formatVal(pt.val)}`}
                  </text>
                  {secPt && (
                    <text x="8" y="32" fontSize="9.5" fill="#FCD34D" fontWeight="700">
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

const OrdersVerticalBarChart = ({
  title,
  subtitle,
  data = [],
  onExpand = null,
  isExpanded = false,
}) => {
  const [hoveredIdx, setHoveredIdx] = useState(null);

  const count = Math.max(data.length, 1);
  const svgWidth = isExpanded ? 780 : 480;
  const svgHeight = isExpanded ? 310 : 210;
  const padLeft = isExpanded ? 42 : 28;
  const padRight = 12;
  const padTop = 18;
  const padBottom = 20;
  const usableW = svgWidth - padLeft - padRight;
  const usableH = svgHeight - padTop - padBottom;

  const maxVal = Math.max(
    ...data.map((d) => Math.max(Number(d.orders || 0), Number(d.pending || 0))),
    1
  );

  const slotW = usableW / count;
  const pairWidth = Math.min(34, Math.max(6, slotW * 0.72));
  const barGap = count > 20 && !isExpanded ? 1 : 2;
  const barW = Math.max(2.5, (pairWidth - barGap) / 2);

  const maxLabels = isExpanded ? 15 : 8;
  const labelStride = Math.max(1, Math.ceil(count / maxLabels));

  return (
    <div
      className={
        isExpanded
          ? "space-y-4"
          : "bg-white rounded-3xl p-5 border border-neutral-200 shadow-xs flex flex-col justify-between h-full gap-3"
      }
    >
      <div className="flex flex-wrap items-start justify-between gap-2">
        <div>
          {!isExpanded && <h3 className="text-sm font-black text-neutral-900">{title}</h3>}
          {!isExpanded && <p className="text-[11px] text-neutral-500">{subtitle}</p>}
        </div>
        <div className="flex items-center gap-3 text-[11px] font-bold">
          <span className="flex items-center gap-1.5 text-neutral-700">
            <span className="w-2.5 h-2.5 rounded-sm bg-blue-600" />
            {"Total Orders"}
          </span>
          <span className="flex items-center gap-1.5 text-neutral-700">
            <span className="w-2.5 h-2.5 rounded-sm bg-amber-500" />
            {"Pending"}
          </span>
          {onExpand && (
            <button
              type="button"
              onClick={onExpand}
              className="p-1.5 rounded-lg border border-neutral-200 hover:bg-neutral-100 text-neutral-600 cursor-pointer transition-colors"
              title="Open large view"
              aria-label={`Expand ${title}`}
            >
              <Maximize2 className="w-3.5 h-3.5" />
            </button>
          )}
        </div>
      </div>

      <div className="w-full overflow-hidden">
        <svg
          viewBox={`0 0 ${svgWidth} ${svgHeight}`}
          className="w-full h-auto overflow-visible select-none"
        >
          {[0, 0.5, 1].map((ratio, idx) => {
            const y = svgHeight - padBottom - usableH * ratio;
            const labelVal = Math.round(maxVal * ratio);
            return (
              <g key={idx}>
                <line
                  x1={padLeft}
                  y1={y}
                  x2={svgWidth - padRight}
                  y2={y}
                  stroke={idx === 0 ? "#CBD5E1" : "#E5E7EB"}
                  strokeDasharray={idx === 0 ? undefined : "3 3"}
                  strokeWidth="1"
                />
                <text
                  x={padLeft - 6}
                  y={y + 3}
                  textAnchor="end"
                  fontSize={isExpanded ? "10" : "9"}
                  fill="#64748B"
                  fontWeight="700"
                >
                  {labelVal}
                </text>
              </g>
            );
          })}

          {data.map((d, idx) => {
            const ordersVal = Number(d.orders || 0);
            const pendingVal = Number(d.pending || 0);
            const ordersH = ordersVal > 0 ? Math.max((ordersVal / maxVal) * usableH, 4) : 0;
            const pendingH = pendingVal > 0 ? Math.max((pendingVal / maxVal) * usableH, 4) : 0;

            const slotX = padLeft + idx * slotW;
            const centerX = slotX + slotW / 2;
            const ordersX = centerX - barW - barGap / 2;
            const pendingX = centerX + barGap / 2;
            const baseLineY = svgHeight - padBottom;
            const isHovered = hoveredIdx === idx;
            const isNearEnd = idx !== count - 1 && count - 1 - idx < Math.max(1, Math.floor(labelStride / 2));
            const showXLabel =
              count <= maxLabels || (idx % labelStride === 0 && !isNearEnd) || idx === count - 1;
            const labelAnchor =
              count > 10 && idx === 0 ? "start" : count > 10 && idx === count - 1 ? "end" : "middle";
            const labelX =
              labelAnchor === "start" ? Math.max(padLeft, slotX) : labelAnchor === "end" ? Math.min(svgWidth - padRight, slotX + slotW) : centerX;

            return (
              <g
                key={d.key || d.date || idx}
                onMouseEnter={() => setHoveredIdx(idx)}
                onMouseLeave={() => setHoveredIdx(null)}
                className="cursor-pointer"
              >
                <rect
                  x={slotX}
                  y={padTop}
                  width={slotW}
                  height={usableH}
                  rx="3"
                  fill={isHovered ? "#F1F5F9" : "transparent"}
                />
                {ordersH > 0 && (
                  <rect
                    x={ordersX}
                    y={baseLineY - ordersH}
                    width={barW}
                    height={ordersH}
                    rx="2"
                    fill={isHovered ? "#1D4ED8" : "#2563EB"}
                  />
                )}
                {pendingH > 0 && (
                  <rect
                    x={pendingX}
                    y={baseLineY - pendingH}
                    width={barW}
                    height={pendingH}
                    rx="2"
                    fill={isHovered ? "#D97706" : "#F59E0B"}
                  />
                )}
                {showXLabel && (
                  <text
                    x={labelX}
                    y={svgHeight - 5}
                    textAnchor={labelAnchor}
                    fontSize={isExpanded ? "9.5" : count > 20 ? "8" : "9"}
                    fill="#64748B"
                    fontWeight="600"
                  >
                    {d.label}
                  </text>
                )}
              </g>
            );
          })}

          {hoveredIdx !== null && data[hoveredIdx] && (() => {
            const d = data[hoveredIdx];
            const centerX = padLeft + (hoveredIdx + 0.5) * slotW;
            const peakVal = Math.max(Number(d.orders || 0), Number(d.pending || 0));
            const peakY = svgHeight - padBottom - (peakVal / maxVal) * usableH;
            const tipX = Math.min(Math.max(centerX - 74, 8), svgWidth - 156);
            const tipY = Math.max(peakY - 58, 4);
            return (
              <g transform={`translate(${tipX}, ${tipY})`} className="pointer-events-none">
                <rect width="148" height="48" rx="9" fill="#0F172A" />
                <text x="9" y="15" fontSize="10" fill="#E2E8F0" fontWeight="700">
                  {d.fullLabel || d.label}
                </text>
                <text x="9" y="29" fontSize="9.5" fill="#60A5FA" fontWeight="700">
                  {`Orders: ${d.orders || 0}  •  Pending: ${d.pending || 0}`}
                </text>
                <text x="9" y="42" fontSize="9" fill="#94A3B8" fontWeight="600">
                  {`Confirmed: ${d.confirmed || 0}  •  Transit: ${d.inTransit || 0}`}
                </text>
              </g>
            );
          })()}
        </svg>
      </div>
    </div>
  );
};

const AdminAnalytics = ({ orders = [] }) => {
  const [timeframeKey, setTimeframeKey] = useState("30d"); // 7d | 14d | 30d | 6m | 1y | custom | all
  const [customRange, setCustomRange] = useState(() => getDefaultCustomRange());
  const [expandedChart, setExpandedChart] = useState(null); // null | "earnings" | "orders"
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

  useEffect(() => {
    if (!expandedChart) return undefined;
    const handleKeyDown = (e) => {
      if (e.key === "Escape") setExpandedChart(null);
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [expandedChart]);

  const analytics = useMemo(() => {
    const bounds = resolveAnalyticsBounds(
      timeframeKey,
      customRange.start,
      customRange.end,
      orders,
      transactions
    );

    const scopedOrders = orders.filter((o) =>
      isWithinISORange(extractLocalISODate(o.createdAt), bounds.startISO, bounds.endISO)
    );

    const scopedTxns = transactions.filter((t) =>
      isWithinISORange(extractLocalISODate(t.created_at), bounds.startISO, bounds.endISO)
    );

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
      const netEarning = getOrderNetEarning(o);

      if (isSettledOrderEarning(o)) totalEarnings += netEarning;
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

    const dailySeries = buildAnalyticsSeries(scopedOrders, bounds);

    return {
      bounds,
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
      dailySeries,
    };
  }, [orders, transactions, timeframeKey, customRange.start, customRange.end]);

  return (
    <div className="space-y-6">
      {/* Header & Timeframe Selector */}
      <div className="bg-white rounded-3xl p-5 sm:p-6 border border-neutral-200 shadow-xs flex flex-wrap items-start justify-between gap-4">
        <div>
          <div className="flex flex-wrap items-center gap-2">
            <span className="text-[11px] font-bold uppercase tracking-wider text-indigo-700 bg-indigo-50 px-2.5 py-1 rounded-full">
              {"Real-Time Store Intelligence"}
            </span>
            <span className="text-[11px] font-bold text-neutral-600 bg-neutral-100 px-2.5 py-1 rounded-full">
              {analytics.bounds.rangeLabel}
            </span>
          </div>
          <h1 className="text-2xl font-black text-neutral-900 mt-1.5 flex items-center gap-2">
            <Activity className="w-6 h-6 text-emerald-600" />
            <span>{"Analytics & Live Revenue Telemetry"}</span>
          </h1>
          <p className="text-xs text-neutral-500 mt-0.5">
            {"Live earnings, order pipeline velocity, MFS/SSLCommerz/COD breakdown, and payment failure rates."}
          </p>
        </div>

        <TimeframeControls
          timeframeKey={timeframeKey}
          onSelectTimeframe={setTimeframeKey}
          customRange={customRange}
          onChangeCustomRange={setCustomRange}
          onRefresh={loadTransactions}
          isRefreshing={isRefreshing}
        />
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
          subtitle={`Settled & paid revenue trend • ${analytics.bounds.rangeLabel}`}
          data={analytics.dailySeries}
          valueKey="earnings"
          color="#10B981"
          primaryLabel="Earnings (৳)"
          formatVal={(v) => formatBDT(v)}
          gradId="analyticsEarningsGrad"
          onExpand={() => setExpandedChart("earnings")}
        />

        <OrdersVerticalBarChart
          title="Orders vs Pending Pipeline Graph"
          subtitle={`Vertical order comparison • ${analytics.bounds.rangeLabel}`}
          data={analytics.dailySeries}
          onExpand={() => setExpandedChart("orders")}
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

      {/* Expanded Large Chart Popup Modal */}
      {expandedChart && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-neutral-950/60 backdrop-blur-xs p-3 sm:p-6"
          onClick={() => setExpandedChart(null)}
        >
          <div
            className="bg-white rounded-3xl w-full max-w-5xl max-h-[92vh] overflow-y-auto shadow-2xl border border-neutral-200 p-5 sm:p-7 space-y-5"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex flex-wrap items-start justify-between gap-4 border-b border-neutral-100 pb-4">
              <div>
                <div className="flex items-center gap-2">
                  <span className="p-2 rounded-xl bg-neutral-100 text-neutral-800">
                    {expandedChart === "earnings" ? (
                      <TrendingUp className="w-4 h-4 text-emerald-600" />
                    ) : (
                      <BarChart3 className="w-4 h-4 text-blue-600" />
                    )}
                  </span>
                  <div>
                    <h2 className="text-lg font-black text-neutral-900">
                      {expandedChart === "earnings"
                        ? "Earnings Revenue Graph — Detailed View"
                        : "Orders vs Pending Pipeline Graph — Detailed View"}
                    </h2>
                    <p className="text-xs text-neutral-500">
                      {`${analytics.bounds.rangeLabel} • Live synchronized store metrics`}
                    </p>
                  </div>
                </div>
              </div>

              <button
                type="button"
                onClick={() => setExpandedChart(null)}
                className="p-2 rounded-xl border border-neutral-200 hover:bg-neutral-100 text-neutral-600 cursor-pointer"
                aria-label="Close large chart modal"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="flex flex-wrap items-center justify-between gap-3 bg-neutral-50/80 border border-neutral-200 rounded-2xl p-3">
              <div className="flex flex-wrap items-center gap-4 text-xs font-bold">
                {expandedChart === "earnings" ? (
                  <>
                    <span className="text-neutral-700">
                      {"Settled Earnings: "}
                      <strong className="text-emerald-700">{formatBDT(analytics.totalEarnings)}</strong>
                    </span>
                    <span className="text-neutral-700">
                      {"Pending COD: "}
                      <strong className="text-amber-700">{formatBDT(analytics.pendingCodAmount)}</strong>
                    </span>
                    <span className="text-neutral-700">
                      {"Scoped Orders: "}
                      <strong className="text-neutral-900">{analytics.scopedOrders.length}</strong>
                    </span>
                  </>
                ) : (
                  <>
                    <span className="text-neutral-700">
                      {"Total Orders: "}
                      <strong className="text-blue-700">{analytics.scopedOrders.length}</strong>
                    </span>
                    <span className="text-neutral-700">
                      {"Pending: "}
                      <strong className="text-amber-600">{analytics.pendingCount}</strong>
                    </span>
                    <span className="text-neutral-700">
                      {"In-Transit: "}
                      <strong className="text-purple-700">{analytics.inTransitCount}</strong>
                    </span>
                    <span className="text-neutral-700">
                      {"Delivered: "}
                      <strong className="text-emerald-700">{analytics.deliveredCount}</strong>
                    </span>
                  </>
                )}
              </div>

              <TimeframeControls
                timeframeKey={timeframeKey}
                onSelectTimeframe={setTimeframeKey}
                customRange={customRange}
                onChangeCustomRange={setCustomRange}
              />
            </div>

            {expandedChart === "earnings" ? (
              <AnalyticsTrendChart
                title="Earnings Revenue Graph"
                subtitle={`Settled & paid revenue trend • ${analytics.bounds.rangeLabel}`}
                data={analytics.dailySeries}
                valueKey="earnings"
                color="#10B981"
                primaryLabel="Earnings (৳)"
                formatVal={(v) => formatBDT(v)}
                gradId="analyticsEarningsGradModal"
                isExpanded={true}
              />
            ) : (
              <OrdersVerticalBarChart
                title="Orders vs Pending Pipeline Graph"
                subtitle={`Vertical order comparison • ${analytics.bounds.rangeLabel}`}
                data={analytics.dailySeries}
                isExpanded={true}
              />
            )}
          </div>
        </div>
      )}
    </div>
  );
};

export { AdminAnalytics };

