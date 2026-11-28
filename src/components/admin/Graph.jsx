import { useState, useMemo } from "react";
import { TrendingUp, Maximize2, ArrowUpRight } from "lucide-react";
import { formatBDT } from "../../utils/bangladesh";
import {
  extractLocalISODate,
  parseLocalISODate,
  resolveAnalyticsBounds,
  isWithinISORange,
  buildAnalyticsSeries,
} from "../../utils/analyticsRange";

const Graph = ({
  orders = [],
  totalRevenue = 0,
  onOpenModal
}) => {
  const [hoveredPointIndex, setHoveredPointIndex] = useState(null);

  // Real Last 7 Days daily settled earnings (matches AdminAnalytics "7d" 100%)
  const { bounds, last7DaysData, totalChartRev, avgDailyRev, peakDay } = useMemo(() => {
    const resolvedBounds = resolveAnalyticsBounds("7d", "", "", orders);
    const scopedOrders = orders.filter((o) =>
      isWithinISORange(extractLocalISODate(o?.createdAt), resolvedBounds.startISO, resolvedBounds.endISO)
    );
    const series = buildAnalyticsSeries(scopedOrders, resolvedBounds).map((bucket) => {
      const dt = parseLocalISODate(bucket.date);
      const dayName = dt ? dt.toLocaleString("en-US", { weekday: "short" }) : bucket.label;
      return {
        date: bucket.date,
        dayName,
        label: bucket.label,
        displayDate: bucket.fullLabel || bucket.label,
        revenue: Number(bucket.earnings || 0),
        orders: Number(bucket.orders || 0),
      };
    });

    const total7d = series.reduce((sum, d) => sum + d.revenue, 0);
    const avg7d = Math.round(total7d / Math.max(series.length, 1));
    const peak = series.reduce(
      (prev, curr) => (curr.revenue > prev.revenue ? curr : prev),
      series[0] || { revenue: 0, dayName: "", displayDate: "", label: "" }
    );

    return {
      bounds: resolvedBounds,
      last7DaysData: series,
      totalChartRev: total7d,
      avgDailyRev: avg7d,
      peakDay: peak,
    };
  }, [orders]);

  // Chart coordinates
  const chartWidth = 340;
  const chartHeight = 135;
  const paddingX = 22;
  const paddingYTop = 20;
  const paddingYBottom = 26;
  const usableWidth = chartWidth - paddingX * 2;
  const usableHeight = chartHeight - paddingYTop - paddingYBottom;

  const maxRevenue = Math.max(...last7DaysData.map((d) => d.revenue), 100);

  const points = last7DaysData.map((d, idx) => {
    const x =
      last7DaysData.length === 1
        ? paddingX + usableWidth / 2
        : paddingX + (idx / Math.max(last7DaysData.length - 1, 1)) * usableWidth;
    const y = chartHeight - paddingYBottom - (d.revenue / maxRevenue) * usableHeight;
    return { ...d, x, y };
  });

  const createCurvedPath = (pts) => {
    if (!pts || pts.length === 0) return "";
    if (pts.length === 1) return `M ${pts[0].x},${pts[0].y}`;
    let path = `M ${pts[0].x},${pts[0].y}`;
    for (let i = 0; i < pts.length - 1; i++) {
      const p0 = pts[i];
      const p1 = pts[i + 1];
      const cp1x = p0.x + (p1.x - p0.x) / 2;
      const cp1y = p0.y;
      const cp2x = p0.x + (p1.x - p0.x) / 2;
      const cp2y = p1.y;
      path += ` C ${cp1x},${cp1y} ${cp2x},${cp2y} ${p1.x},${p1.y}`;
    }
    return path;
  };

  const linePath = createCurvedPath(points);
  const areaPath =
    points.length > 0 && totalChartRev > 0
      ? `${linePath} L ${points[points.length - 1].x},${chartHeight - paddingYBottom} L ${points[0].x},${chartHeight - paddingYBottom} Z`
      : "";

  return (
    <div className="bg-white rounded-3xl p-5 border border-neutral-200 shadow-xs flex flex-col justify-between space-y-4">
      <div>
        <div className="flex justify-between items-start gap-2">
          <div>
            <h3 className="text-base font-bold text-neutral-900 flex items-center gap-1.5">
              <TrendingUp className="w-4 h-4 text-emerald-600" />
              <span>{"Total Earnings Analytics"}</span>
            </h3>
            <p className="text-xs text-neutral-400 mt-0.5">
              {`Last 7 days • ${bounds.rangeLabel}`}
            </p>
          </div>

          <div className="flex items-center gap-2">
            <span
              className="text-[11px] font-bold px-2.5 py-1 rounded-full bg-emerald-50 text-emerald-700 border border-emerald-200/60 hidden sm:inline-block"
              title={`All-time total: ${formatBDT(totalRevenue)}`}
            >
              {formatBDT(totalChartRev)}
            </span>
            <button
              onClick={onOpenModal}
              className="flex items-center gap-1.5 px-3 py-1.5 bg-neutral-900 hover:bg-emerald-600 text-white text-xs font-bold rounded-xl shadow-xs transition-colors cursor-pointer group"
              title={"Open detailed analytics popup"}
            >
              <Maximize2 className="w-3.5 h-3.5 group-hover:scale-110 transition-transform" />
              <span>{"Expand"}</span>
            </button>
          </div>
        </div>

        {/* Peak & Daily Average summary badges */}
        <div className="grid grid-cols-2 gap-2 mt-3.5">
          <div className="p-2.5 rounded-xl bg-neutral-50 border border-neutral-100">
            <span className="text-[10px] text-neutral-400 uppercase font-semibold block">
              {"Peak Day Revenue"}
            </span>
            <span className="text-sm font-extrabold text-neutral-900">
              {formatBDT(peakDay.revenue)}
            </span>
            <span className="text-[10px] text-emerald-600 block mt-0.5 font-medium">
              {peakDay.revenue > 0 ? `${peakDay.dayName} (${peakDay.label})` : "No paid sales in 7d"}
            </span>
          </div>

          <div className="p-2.5 rounded-xl bg-neutral-50 border border-neutral-100">
            <span className="text-[10px] text-neutral-400 uppercase font-semibold block">
              {"Daily Average"}
            </span>
            <span className="text-sm font-extrabold text-neutral-900">
              {formatBDT(avgDailyRev)}
            </span>
            <span className="text-[10px] text-neutral-500 block mt-0.5 font-medium">
              {"Last 7 days"}
            </span>
          </div>
        </div>
      </div>

      {/* Smooth SVG Area & Line Chart */}
      <div className="relative pt-2">
        <svg
          viewBox={`0 0 ${chartWidth} ${chartHeight}`}
          className="w-full h-auto overflow-visible select-none"
        >
          <defs>
            <linearGradient id="earningsAreaGradSummary" x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor="#10B981" stopOpacity="0.32" />
              <stop offset="100%" stopColor="#10B981" stopOpacity="0.0" />
            </linearGradient>
          </defs>

          {/* Dotted horizontal reference grid lines */}
          <line
            x1={paddingX}
            y1={paddingYTop}
            x2={chartWidth - paddingX}
            y2={paddingYTop}
            stroke="#E5E7EB"
            strokeDasharray="3 3"
            strokeWidth="1"
          />
          <line
            x1={paddingX}
            y1={chartHeight - paddingYBottom - usableHeight / 2}
            x2={chartWidth - paddingX}
            y2={chartHeight - paddingYBottom - usableHeight / 2}
            stroke="#F3F4F6"
            strokeDasharray="3 3"
            strokeWidth="1"
          />
          <line
            x1={paddingX}
            y1={chartHeight - paddingYBottom}
            x2={chartWidth - paddingX}
            y2={chartHeight - paddingYBottom}
            stroke="#E5E7EB"
            strokeWidth="1"
          />

          {/* Gradient Area Fill */}
          {areaPath && <path d={areaPath} fill="url(#earningsAreaGradSummary)" />}

          {/* Curve Stroke Line (180-deg flat line when all 7 days are 0) */}
          {linePath && (
            <path
              d={linePath}
              fill="none"
              stroke="#059669"
              strokeWidth="2.5"
              strokeLinecap="round"
              strokeLinejoin="round"
            />
          )}

          {/* Hover guide line */}
          {hoveredPointIndex !== null && points[hoveredPointIndex] && (
            <line
              x1={points[hoveredPointIndex].x}
              y1={paddingYTop}
              x2={points[hoveredPointIndex].x}
              y2={chartHeight - paddingYBottom}
              stroke="#10B981"
              strokeDasharray="2 2"
              strokeWidth="1.5"
            />
          )}

          {/* Interactive Data Dots & Labels */}
          {points.map((p, idx) => {
            const isHovered = hoveredPointIndex === idx;
            return (
              <g key={p.date} className="cursor-pointer">
                <circle
                  cx={p.x}
                  cy={p.y}
                  r={isHovered ? 5.5 : 3.5}
                  fill="#FFFFFF"
                  stroke="#059669"
                  strokeWidth={isHovered ? 2.5 : 2}
                  className="transition-all"
                  onMouseEnter={() => setHoveredPointIndex(idx)}
                  onMouseLeave={() => setHoveredPointIndex(null)}
                />
                <circle
                  cx={p.x}
                  cy={p.y}
                  r={14}
                  fill="transparent"
                  onMouseEnter={() => setHoveredPointIndex(idx)}
                  onMouseLeave={() => setHoveredPointIndex(null)}
                />
                <text
                  x={p.x}
                  y={chartHeight - 6}
                  textAnchor="middle"
                  className={`text-[9px] select-none font-semibold ${
                    isHovered ? "fill-emerald-700 font-bold" : "fill-neutral-400"
                  }`}
                >
                  {p.label}
                </text>
              </g>
            );
          })}
        </svg>

        {/* Floating Tooltip */}
        {hoveredPointIndex !== null && points[hoveredPointIndex] && (
          <div
            className="absolute pointer-events-none -top-2 transform -translate-x-1/2 bg-neutral-900 text-white text-[10px] px-2.5 py-1 rounded-lg shadow-lg z-10 whitespace-nowrap"
            style={{
              left: `${Math.min(Math.max((points[hoveredPointIndex].x / chartWidth) * 100, 14), 86)}%`
            }}
          >
            <div className="font-bold text-emerald-400">
              {formatBDT(points[hoveredPointIndex].revenue)}
            </div>
            <div className="text-neutral-300 text-[9px]">
              {points[hoveredPointIndex].dayName}, {points[hoveredPointIndex].displayDate} • {points[hoveredPointIndex].orders} orders
            </div>
          </div>
        )}
      </div>

      <div className="pt-2 border-t border-neutral-100 text-[11px] text-neutral-400 flex justify-between items-center">
        <span>
          {"Real-time sync with paid & delivered orders"}
        </span>
        <button
          onClick={onOpenModal}
          className="text-emerald-700 font-bold hover:underline flex items-center gap-1 cursor-pointer"
        >
          <span>{"Detailed Breakdown"}</span>
          <ArrowUpRight className="w-3.5 h-3.5" />
        </button>
      </div>
    </div>
  );
};

export { Graph };
