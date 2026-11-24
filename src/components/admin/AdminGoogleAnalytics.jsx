import { useState, useEffect, useMemo, useCallback } from "react";
import {
  Activity,
  BarChart3,
  BookOpen,
  Calendar,
  CheckCircle2,
  Clock,
  ExternalLink,
  Eye,
  EyeOff,
  Globe,
  LineChart,
  MapPin,
  Monitor,
  PieChart as PieChartIcon,
  RefreshCw,
  Save,
  ShieldAlert,
  Smartphone,
  TrendingUp,
  Users,
  Zap,
} from "lucide-react";
import { apiClient } from "../../services/api";
import { realtimeService } from "../../services/realtime";
import { formatBDT, formatBDTDateTime } from "../../utils/bangladesh";
import { TIMEFRAME_OPTIONS, getDefaultCustomRange } from "../../utils/analyticsRange";
import { useThemeConfig } from "../frontPanel/FrontPanelContext";

const formatDuration = (totalSeconds = 0) => {
  const s = Math.max(0, Math.round(Number(totalSeconds) || 0));
  if (s < 60) return `${s}s`;
  const m = Math.floor(s / 60);
  const rem = s % 60;
  return `${m}m ${rem}s`;
};

/**
 * Reusable interactive SVG Donut / Pie Chart with hover highlight & clean center readout.
 */
const InteractivePieChart = ({
  slices = [],
  centerLabel = "Total",
  centerValue = "0",
  emptyText = "No data yet",
}) => {
  const [hoveredIdx, setHoveredIdx] = useState(null);
  const total = slices.reduce((sum, s) => sum + Number(s.count || 0), 0);

  const cx = 90;
  const cy = 90;
  const r = 68;
  const innerR = 42;

  const computedSlices = useMemo(() => {
    if (total <= 0) return [];
    let angleAcc = -Math.PI / 2;
    return slices
      .filter((s) => Number(s.count || 0) > 0)
      .map((s) => {
        const val = Number(s.count || 0);
        const pct = (val / total) * 100;
        const sweep = (val / total) * Math.PI * 2;
        const startAngle = angleAcc;
        const endAngle = angleAcc + sweep;
        angleAcc = endAngle;

        if (pct >= 99.9) {
          return { ...s, pct, isFullCircle: true };
        }
        const x1 = cx + r * Math.cos(startAngle);
        const y1 = cy + r * Math.sin(startAngle);
        const x2 = cx + r * Math.cos(endAngle);
        const y2 = cy + r * Math.sin(endAngle);
        const ix1 = cx + innerR * Math.cos(endAngle);
        const iy1 = cy + innerR * Math.sin(endAngle);
        const ix2 = cx + innerR * Math.cos(startAngle);
        const iy2 = cy + innerR * Math.sin(startAngle);
        const largeArc = sweep > Math.PI ? 1 : 0;

        const d = [
          `M ${x1} ${y1}`,
          `A ${r} ${r} 0 ${largeArc} 1 ${x2} ${y2}`,
          `L ${ix1} ${iy1}`,
          `A ${innerR} ${innerR} 0 ${largeArc} 0 ${ix2} ${iy2}`,
          "Z",
        ].join(" ");
        return { ...s, pct, d, isFullCircle: false };
      });
  }, [slices, total]);

  const activeSlice = hoveredIdx !== null ? computedSlices[hoveredIdx] : null;

  return (
    <div className="flex flex-col sm:flex-row items-center gap-5">
      <div className="relative w-44 h-44 shrink-0 flex items-center justify-center">
        {total <= 0 ? (
          <div className="w-40 h-40 rounded-full border-12 border-neutral-100 flex flex-col items-center justify-center text-center px-3">
            <span className="text-lg font-black text-neutral-400">0</span>
            <span className="text-[10px] font-semibold text-neutral-400">{emptyText}</span>
          </div>
        ) : (
          <svg viewBox="0 0 180 180" className="w-full h-full select-none">
            {computedSlices.map((sl, idx) =>
              sl.isFullCircle ? (
                <circle
                  key={sl.label}
                  cx={cx}
                  cy={cy}
                  r={(r + innerR) / 2}
                  fill="none"
                  stroke={sl.color || "#10B981"}
                  strokeWidth={r - innerR}
                  onMouseEnter={() => setHoveredIdx(idx)}
                  onMouseLeave={() => setHoveredIdx(null)}
                  className="cursor-pointer transition-opacity"
                />
              ) : (
                <path
                  key={sl.label}
                  d={sl.d}
                  fill={sl.color || "#10B981"}
                  opacity={hoveredIdx === null || hoveredIdx === idx ? 1 : 0.45}
                  onMouseEnter={() => setHoveredIdx(idx)}
                  onMouseLeave={() => setHoveredIdx(null)}
                  className="cursor-pointer transition-all duration-150"
                />
              )
            )}
            <text
              x={cx}
              y={cy - 4}
              textAnchor="middle"
              fontSize="16"
              fontWeight="900"
              fill="#0F172A"
            >
              {activeSlice ? `${activeSlice.pct.toFixed(1)}%` : centerValue}
            </text>
            <text
              x={cx}
              y={cy + 12}
              textAnchor="middle"
              fontSize="9.5"
              fontWeight="700"
              fill="#64748B"
            >
              {activeSlice ? activeSlice.label.slice(0, 16) : centerLabel}
            </text>
          </svg>
        )}
      </div>

      <div className="flex-1 w-full space-y-2 text-xs">
        {slices.length === 0 ? (
          <p className="text-neutral-400 text-xs">{emptyText}</p>
        ) : (
          slices.map((s, idx) => {
            const pct = total > 0 ? ((Number(s.count || 0) / total) * 100).toFixed(1) : "0.0";
            return (
              <div
                key={s.label}
                onMouseEnter={() => setHoveredIdx(idx)}
                onMouseLeave={() => setHoveredIdx(null)}
                className="flex items-center justify-between gap-2 p-2 rounded-xl bg-neutral-50 border border-neutral-100 hover:border-neutral-300 transition-colors cursor-default"
              >
                <div className="flex items-center gap-2 min-w-0">
                  <span
                    className="w-2.5 h-2.5 rounded-full shrink-0"
                    style={{ backgroundColor: s.color || "#10B981" }}
                  />
                  <span className="font-bold text-neutral-800 truncate">{s.label}</span>
                </div>
                <div className="flex items-center gap-2 shrink-0">
                  <span className="font-black text-neutral-900">{s.count}</span>
                  <span className="text-[10px] font-bold px-1.5 py-0.5 rounded-md bg-white border border-neutral-200 text-neutral-600">
                    {pct}%
                  </span>
                </div>
              </div>
            );
          })
        )}
      </div>
    </div>
  );
};

/**
 * Responsive Vertical Bar Chart (supports single or grouped dual series, zero horizontal scrollbars).
 */
const VerticalAnalyticsBarChart = ({
  data = [],
  primaryKey = "visitors",
  secondaryKey = null,
  primaryLabel = "Visitors",
  secondaryLabel = "Page Views",
  primaryColor = "#2563EB",
  secondaryColor = "#10B981",
  labelKey = "label",
}) => {
  const [hoveredIdx, setHoveredIdx] = useState(null);

  const count = Math.max(data.length, 1);
  const svgWidth = 480;
  const svgHeight = 205;
  const padLeft = 32;
  const padRight = 12;
  const padTop = 20;
  const padBottom = 22;
  const usableW = svgWidth - padLeft - padRight;
  const usableH = svgHeight - padTop - padBottom;

  const maxVal = Math.max(
    ...data.map((d) =>
      Math.max(Number(d[primaryKey] || 0), Number(secondaryKey ? d[secondaryKey] || 0 : 0))
    ),
    1
  );

  const slotW = usableW / count;
  const pairWidth = Math.min(34, Math.max(7, slotW * 0.72));
  const barGap = secondaryKey ? (count > 20 ? 1 : 2) : 0;
  const barW = secondaryKey ? Math.max(2.5, (pairWidth - barGap) / 2) : Math.min(26, pairWidth);
  const maxLabels = 8;
  const labelStride = Math.max(1, Math.ceil(count / maxLabels));

  return (
    <div className="w-full overflow-hidden">
      <svg viewBox={`0 0 ${svgWidth} ${svgHeight}`} className="w-full h-auto overflow-visible select-none">
        {[0, 0.5, 1].map((ratio, idx) => {
          const y = svgHeight - padBottom - usableH * ratio;
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
                fontSize="9"
                fill="#64748B"
                fontWeight="700"
              >
                {Math.round(maxVal * ratio)}
              </text>
            </g>
          );
        })}

        {data.map((d, idx) => {
          const v1 = Number(d[primaryKey] || 0);
          const v2 = secondaryKey ? Number(d[secondaryKey] || 0) : 0;
          const h1 = v1 > 0 ? Math.max((v1 / maxVal) * usableH, 4) : 0;
          const h2 = secondaryKey && v2 > 0 ? Math.max((v2 / maxVal) * usableH, 4) : 0;
          const slotX = padLeft + idx * slotW;
          const centerX = slotX + slotW / 2;
          const x1 = secondaryKey ? centerX - barW - barGap / 2 : centerX - barW / 2;
          const x2 = centerX + barGap / 2;
          const baseLineY = svgHeight - padBottom;
          const isHovered = hoveredIdx === idx;
          const isNearEnd = idx !== count - 1 && count - 1 - idx < Math.max(1, Math.floor(labelStride / 2));
          const showLabel = count <= maxLabels || (idx % labelStride === 0 && !isNearEnd) || idx === count - 1;
          const anchor = count > 10 && idx === 0 ? "start" : count > 10 && idx === count - 1 ? "end" : "middle";
          const labelX = anchor === "start" ? padLeft : anchor === "end" ? svgWidth - padRight : centerX;

          return (
            <g
              key={d.key || d[labelKey] || idx}
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
              {h1 > 0 && (
                <rect
                  x={x1}
                  y={baseLineY - h1}
                  width={barW}
                  height={h1}
                  rx="2.5"
                  fill={d.color || primaryColor}
                  opacity={isHovered ? 0.92 : 1}
                />
              )}
              {secondaryKey && h2 > 0 && (
                <rect
                  x={x2}
                  y={baseLineY - h2}
                  width={barW}
                  height={h2}
                  rx="2.5"
                  fill={secondaryColor}
                  opacity={isHovered ? 0.92 : 1}
                />
              )}
              {showLabel && (
                <text
                  x={labelX}
                  y={svgHeight - 5}
                  textAnchor={anchor}
                  fontSize={count > 20 ? "8" : "9"}
                  fill="#64748B"
                  fontWeight="600"
                >
                  {d[labelKey]}
                </text>
              )}
            </g>
          );
        })}

        {hoveredIdx !== null && data[hoveredIdx] && (() => {
          const d = data[hoveredIdx];
          const centerX = padLeft + (hoveredIdx + 0.5) * slotW;
          const peakVal = Math.max(Number(d[primaryKey] || 0), Number(secondaryKey ? d[secondaryKey] || 0 : 0));
          const peakY = svgHeight - padBottom - (peakVal / maxVal) * usableH;
          const tipX = Math.min(Math.max(centerX - 68, 6), svgWidth - 144);
          const tipY = Math.max(peakY - 46, 4);
          return (
            <g transform={`translate(${tipX}, ${tipY})`} className="pointer-events-none">
              <rect width="138" height={secondaryKey ? "40" : "28"} rx="8" fill="#0F172A" />
              <text x="8" y="15" fontSize="9.5" fill="#E2E8F0" fontWeight="700">
                {`${d.fullLabel || d[labelKey]}: ${d[primaryKey] || 0} ${primaryLabel}`}
              </text>
              {secondaryKey && (
                <text x="8" y="31" fontSize="9" fill="#34D399" fontWeight="700">
                  {`${secondaryLabel}: ${d[secondaryKey] || 0}`}
                </text>
              )}
            </g>
          );
        })()}
      </svg>
    </div>
  );
};

export const AdminGoogleAnalytics = () => {
  const { themeConfig } = useThemeConfig();
  const storeName = String(themeConfig?.shop?.name || "AmarDokan").trim();

  // Timeframe state (matches AdminAnalytics options)
  const [timeframeKey, setTimeframeKey] = useState("30d");
  const [customRange, setCustomRange] = useState(() => getDefaultCustomRange());

  // GA4 Credential & Status State
  const [ga4Id, setGa4Id] = useState("");
  const [ga4PropertyId, setGa4PropertyId] = useState("");
  const [ga4ApiSecret, setGa4ApiSecret] = useState("");
  const [ga4StreamName, setGa4StreamName] = useState("");
  const [ga4Enabled, setGa4Enabled] = useState(true);
  const [showSecret, setShowSecret] = useState(false);
  const [showSetupGuide, setShowSetupGuide] = useState(false);

  const [isSaving, setIsSaving] = useState(false);
  const [isTesting, setIsTesting] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [statusNotice, setStatusNotice] = useState(null); // { success, message }
  const [testNotice, setTestNotice] = useState(null);

  const [dashboard, setDashboard] = useState({
    config: {},
    bounds: { rangeLabel: "Last 30 Days" },
    summary: {
      totalVisitors: 0,
      newVisitors: 0,
      returningVisitors: 0,
      totalSessions: 0,
      totalPageViews: 0,
      viewsPerSession: 0,
      avgSessionDurationSec: 0,
      engagementRate: 0,
      bounceRate: 0,
      funnelConversionRate: 0,
      totalRevenue: 0,
    },
    trafficSources: [],
    visitorTypes: [],
    deviceBreakdown: [],
    locationBreakdown: [],
    funnel: [],
    timelineSeries: [],
    topPages: [],
    recentActivity: [],
  });

  const loadDashboard = useCallback(async (syncCredentials = false) => {
    setIsLoading(true);
    try {
      const res = await apiClient.getGA4Dashboard({
        range: timeframeKey,
        start: timeframeKey === "custom" ? customRange.start : undefined,
        end: timeframeKey === "custom" ? customRange.end : undefined,
      });
      if (res?.success) {
        setDashboard(res);
        if (syncCredentials && res.config) {
          setGa4Id(res.config.ga4Id || "");
          setGa4PropertyId(res.config.ga4PropertyId || "");
          setGa4ApiSecret(res.config.ga4ApiSecret || "");
          setGa4StreamName(res.config.ga4StreamName || `${storeName} Web Stream`);
          setGa4Enabled(res.config.ga4Enabled !== false);
        }
      }
    } finally {
      setIsLoading(false);
    }
  }, [timeframeKey, customRange.start, customRange.end, storeName]);

  useEffect(() => {
    loadDashboard(true);
  }, []);

  useEffect(() => {
    loadDashboard(false);
  }, [timeframeKey, customRange.start, customRange.end]);

  useEffect(() => {
    const unsub = realtimeService.subscribe((msg) => {
      if (
        msg &&
        ["ORDER_CREATED", "MARKETING_EVENT_FIRED", "GA4_CONFIG_UPDATED"].includes(msg.type)
      ) {
        loadDashboard(false);
      }
    });
    return () => {
      if (typeof unsub === "function") unsub();
    };
  }, [loadDashboard]);

  const handleSaveGA4Config = async (overrideEnabled = ga4Enabled) => {
    setIsSaving(true);
    setStatusNotice(null);
    try {
      const res = await apiClient.saveGA4Config({
        ga4Id: ga4Id.trim(),
        ga4PropertyId: ga4PropertyId.trim(),
        ga4ApiSecret: ga4ApiSecret.trim(),
        ga4StreamName: ga4StreamName.trim() || `${storeName} Web Stream`,
        ga4Enabled: Boolean(overrideEnabled),
      });
      if (res?.success) {
        setGa4Enabled(Boolean(res.config?.ga4Enabled));
        setStatusNotice({
          success: true,
          message: res.message || "Google Analytics settings saved!",
        });
        realtimeService.broadcast("GA4_CONFIG_UPDATED", {
          ga4Id: res.config?.ga4Id || "",
          ga4Enabled: Boolean(res.config?.ga4Enabled),
        });
        await loadDashboard(false);
      } else {
        setStatusNotice({
          success: false,
          message: res?.message || "Failed to save Google Analytics settings.",
        });
      }
    } catch (err) {
      setStatusNotice({ success: false, message: err?.message || "Error saving settings." });
    } finally {
      setIsSaving(false);
    }
  };

  const handleToggleGA4Active = async () => {
    const nextState = !ga4Enabled;
    setGa4Enabled(nextState);
    await handleSaveGA4Config(nextState);
  };

  const handleTestGA4 = async () => {
    setIsTesting(true);
    setTestNotice(null);
    try {
      const res = await apiClient.testGA4Connection();
      setTestNotice({
        success: Boolean(res?.success),
        message: res?.message || "Diagnostic check completed.",
      });
    } catch (err) {
      setTestNotice({ success: false, message: err?.message || "Test check failed." });
    } finally {
      setIsTesting(false);
    }
  };

  const isConnected = Boolean(ga4Enabled && dashboard.config?.ga4Id);
  const summary = dashboard.summary || {};

  // Biggest funnel drop-off stage highlight
  const biggestDropStep = useMemo(() => {
    const steps = (dashboard.funnel || []).filter((f, idx) => idx > 0 && f.dropOffPct > 0);
    if (steps.length === 0) return null;
    return steps.reduce((max, s) => (s.dropOffPct > max.dropOffPct ? s : max), steps[0]);
  }, [dashboard.funnel]);

  const cityChartData = useMemo(
    () =>
      (dashboard.locationBreakdown || []).slice(0, 8).map((loc) => ({
        key: loc.city,
        label: loc.city.length > 9 ? `${loc.city.slice(0, 8)}..` : loc.city,
        fullLabel: `${loc.city}, ${loc.country}`,
        visitors: loc.visitors + loc.orders,
        orders: loc.orders,
      })),
    [dashboard.locationBreakdown]
  );

  const funnelBarData = useMemo(
    () =>
      (dashboard.funnel || []).map((f) => ({
        key: f.stage,
        label: f.stage,
        fullLabel: f.label,
        count: f.count,
        color: f.color,
      })),
    [dashboard.funnel]
  );

  return (
    <div className="space-y-6">
      {/* Header & Timeframe Selector */}
      <div className="bg-white rounded-3xl p-5 sm:p-6 border border-neutral-200 shadow-xs flex flex-wrap items-start justify-between gap-4">
        <div>
          <div className="flex flex-wrap items-center gap-2">
            <span className="text-[11px] font-bold uppercase tracking-wider text-blue-700 bg-blue-50 px-2.5 py-1 rounded-full">
              {"Google Analytics 4 & Audience Telemetry"}
            </span>
            {isConnected ? (
              <span className="inline-flex items-center gap-1.5 text-[11px] font-bold text-emerald-700 bg-emerald-100/80 px-2.5 py-1 rounded-full">
                <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
                <span>{`Connected (${dashboard.config?.ga4Id})`}</span>
              </span>
            ) : (
              <span className="inline-flex items-center gap-1.5 text-[11px] font-bold text-amber-700 bg-amber-50 px-2.5 py-1 rounded-full">
                <span className="w-2 h-2 rounded-full bg-amber-400" />
                <span>{ga4Enabled ? "GA4 Setup Needed" : "Tracking Inactive"}</span>
              </span>
            )}
            <span className="text-[11px] font-bold text-neutral-600 bg-neutral-100 px-2.5 py-1 rounded-full">
              {dashboard.bounds?.rangeLabel || "Last 30 Days"}
            </span>
          </div>
          <h1 className="text-2xl font-black text-neutral-900 mt-2 flex items-center gap-2">
            <LineChart className="w-6 h-6 text-blue-600" />
            <span>{"Google Analytics & Visitor Intelligence"}</span>
          </h1>
          <p className="text-xs text-neutral-500 mt-0.5">
            {"Traffic sources, new vs returning visitors, time on site, device & city breakdown, and e-commerce drop-off funnel."}
          </p>
        </div>

        {/* Timeframe Controls + Setup Guide */}
        <div className="flex flex-col items-start lg:items-end gap-2">
          <div className="flex flex-wrap items-center gap-1.5">
            <button
              type="button"
              onClick={() => setShowSetupGuide((prev) => !prev)}
              className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl font-bold text-xs border transition-all cursor-pointer ${
                showSetupGuide
                  ? "bg-amber-500 text-white border-amber-600"
                  : "bg-amber-50 hover:bg-amber-100 text-amber-900 border-amber-300"
              }`}
            >
              <BookOpen className="w-3.5 h-3.5" />
              <span>{showSetupGuide ? "Hide Guide" : "Setup Guide"}</span>
            </button>

            {TIMEFRAME_OPTIONS.map((opt) => (
              <button
                key={opt.key}
                type="button"
                onClick={() => setTimeframeKey(opt.key)}
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

            <button
              type="button"
              onClick={() => loadDashboard(false)}
              className="p-2 rounded-xl border border-neutral-200 hover:bg-neutral-50 text-neutral-600 cursor-pointer"
              title="Refresh Google Analytics telemetry"
            >
              <RefreshCw className={`w-4 h-4 ${isLoading ? "animate-spin" : ""}`} />
            </button>
          </div>

          {timeframeKey === "custom" && (
            <div className="flex flex-wrap items-center gap-2 bg-neutral-50 border border-neutral-200 rounded-2xl px-3 py-1.5">
              <span className="text-[11px] font-bold text-neutral-500">{"From:"}</span>
              <input
                type="date"
                value={customRange.start}
                max={customRange.end || undefined}
                onChange={(e) => setCustomRange((prev) => ({ ...prev, start: e.target.value }))}
                className="bg-white border border-neutral-200 rounded-lg px-2 py-1 text-xs font-bold text-neutral-800"
              />
              <span className="text-[11px] font-bold text-neutral-500">{"To:"}</span>
              <input
                type="date"
                value={customRange.end}
                min={customRange.start || undefined}
                onChange={(e) => setCustomRange((prev) => ({ ...prev, end: e.target.value }))}
                className="bg-white border border-neutral-200 rounded-lg px-2 py-1 text-xs font-bold text-neutral-800"
              />
            </div>
          )}
        </div>
      </div>

      {/* Collapsible GA4 Setup Guide */}
      {showSetupGuide && (
        <div className="bg-amber-50/70 border border-amber-200 rounded-3xl p-5 space-y-3 text-xs">
          <div className="flex items-center justify-between">
            <h3 className="font-black text-amber-950 text-sm flex items-center gap-2">
              <BookOpen className="w-4 h-4 text-amber-700" />
              <span>{"How to Connect Google Analytics 4 (1-Minute Setup)"}</span>
            </h3>
            <a
              href="https://analytics.google.com/"
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-1 px-3 py-1.5 rounded-xl bg-amber-600 hover:bg-amber-700 text-white font-bold text-[11px]"
            >
              <span>{"Open Google Analytics"}</span>
              <ExternalLink className="w-3 h-3" />
            </a>
          </div>
          <ol className="list-decimal list-inside space-y-1 text-amber-900 font-medium">
            <li>
              {"Go to Google Analytics → Admin → Data Streams → Web and copy your "}
              <strong>{"Measurement ID (starts with G-)"}</strong>.
            </li>
            <li>
              {"(Optional for server-side ad-blocker bypass) Scroll to Measurement Protocol API Secrets → Create → copy the "}
              <strong>{"API Secret"}</strong>.
            </li>
            <li>
              {"Paste your Measurement ID below and click "}
              <strong>{"Save & Connect Google Analytics"}</strong>
              {". Storefront tracking activates immediately."}
            </li>
          </ol>
        </div>
      )}

      {/* Credential Configuration Card */}
      <div className="bg-white rounded-3xl p-5 sm:p-6 border border-neutral-200 shadow-xs space-y-4 text-xs">
        <div className="flex flex-wrap items-center justify-between gap-3 border-b border-neutral-100 pb-3">
          <div>
            <h2 className="text-sm font-black text-neutral-900 flex items-center gap-2">
              <Globe className="w-4 h-4 text-blue-600" />
              <span>{"Google Analytics 4 (GA4) Credential Setup"}</span>
            </h2>
            <p className="text-[11px] text-neutral-500 mt-0.5">
              {"Enter your GA4 credentials below to automatically inject gtag.js and stream real-time events across your store."}
            </p>
          </div>

          <div className="flex items-center gap-2.5">
            <button
              type="button"
              onClick={handleToggleGA4Active}
              aria-pressed={ga4Enabled}
              className={`px-3 py-1 rounded-full text-[11px] font-bold border transition-all cursor-pointer inline-flex items-center gap-1.5 ${
                ga4Enabled
                  ? "bg-emerald-50 border-emerald-300 text-emerald-800 hover:bg-emerald-100"
                  : "bg-neutral-100 border-neutral-300 text-neutral-600 hover:bg-neutral-200"
              }`}
            >
              <span
                className={`w-2 h-2 rounded-full ${
                  ga4Enabled ? "bg-emerald-500 animate-pulse" : "bg-neutral-400"
                }`}
              />
              <span>{ga4Enabled ? "Active" : "Inactive"}</span>
            </button>

            <a
              href="https://analytics.google.com/"
              target="_blank"
              rel="noopener noreferrer"
              className="px-3 py-1.5 rounded-xl border border-neutral-200 hover:bg-neutral-50 text-neutral-700 font-bold inline-flex items-center gap-1"
            >
              <span>{"GA4 Console"}</span>
              <ExternalLink className="w-3 h-3" />
            </a>
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-3">
          <div>
            <label className="block font-bold text-neutral-700 mb-1">
              {"GA4 Measurement ID"} <span className="text-rose-500">*</span>
            </label>
            <input
              type="text"
              value={ga4Id}
              onChange={(e) => setGa4Id(e.target.value)}
              placeholder="G-XXXXXXXXXX"
              className="w-full px-3 py-2 bg-neutral-50 rounded-xl border border-neutral-300 font-mono text-neutral-900 focus:bg-white focus:border-blue-600 outline-none"
            />
          </div>

          <div>
            <label className="block font-bold text-neutral-700 mb-1">
              {"GA4 Property ID (Optional)"}
            </label>
            <input
              type="text"
              value={ga4PropertyId}
              onChange={(e) => setGa4PropertyId(e.target.value)}
              placeholder="e.g. 428190531"
              className="w-full px-3 py-2 bg-neutral-50 rounded-xl border border-neutral-300 font-mono text-neutral-900 focus:bg-white focus:border-blue-600 outline-none"
            />
          </div>

          <div>
            <div className="flex items-center justify-between mb-1">
              <label className="font-bold text-neutral-700">{"Measurement Protocol Secret"}</label>
              <button
                type="button"
                onClick={() => setShowSecret((prev) => !prev)}
                className="text-neutral-400 hover:text-neutral-700 inline-flex items-center gap-1 text-[10px] cursor-pointer"
              >
                {showSecret ? <EyeOff className="w-3 h-3" /> : <Eye className="w-3 h-3" />}
                <span>{showSecret ? "Hide" : "Show"}</span>
              </button>
            </div>
            <input
              type={showSecret ? "text" : "password"}
              value={ga4ApiSecret}
              onChange={(e) => setGa4ApiSecret(e.target.value)}
              placeholder="Optional server relay secret"
              className="w-full px-3 py-2 bg-neutral-50 rounded-xl border border-neutral-300 font-mono text-neutral-900 focus:bg-white focus:border-blue-600 outline-none"
            />
          </div>

          <div>
            <label className="block font-bold text-neutral-700 mb-1">
              {"Web Stream Name"}
            </label>
            <input
              type="text"
              value={ga4StreamName}
              onChange={(e) => setGa4StreamName(e.target.value)}
              placeholder={`${storeName} Web Stream`}
              className="w-full px-3 py-2 bg-neutral-50 rounded-xl border border-neutral-300 text-neutral-900 focus:bg-white focus:border-blue-600 outline-none"
            />
          </div>
        </div>

        <div className="flex flex-wrap items-center justify-between gap-3 pt-1">
          <div className="flex flex-wrap items-center gap-2">
            <button
              type="button"
              onClick={() => handleSaveGA4Config(ga4Enabled)}
              disabled={isSaving}
              className="px-4 py-2.5 rounded-xl bg-blue-600 hover:bg-blue-700 disabled:opacity-50 text-white font-bold inline-flex items-center gap-1.5 cursor-pointer shadow-xs"
            >
              <Save className="w-3.5 h-3.5" />
              <span>{isSaving ? "Saving..." : "Save & Connect Google Analytics"}</span>
            </button>

            <button
              type="button"
              onClick={handleTestGA4}
              disabled={isTesting}
              className="px-4 py-2.5 rounded-xl bg-amber-500 hover:bg-amber-600 disabled:opacity-50 text-white font-bold inline-flex items-center gap-1.5 cursor-pointer"
            >
              <Zap className="w-3.5 h-3.5 fill-white" />
              <span>{isTesting ? "Testing..." : "Verify & Fire Test Hit"}</span>
            </button>
          </div>

          {statusNotice && (
            <div
              className={`px-3 py-1.5 rounded-xl border font-bold flex items-center gap-1.5 ${
                statusNotice.success
                  ? "bg-emerald-50 border-emerald-200 text-emerald-800"
                  : "bg-rose-50 border-rose-200 text-rose-800"
              }`}
            >
              {statusNotice.success ? (
                <CheckCircle2 className="w-3.5 h-3.5 shrink-0" />
              ) : (
                <ShieldAlert className="w-3.5 h-3.5 shrink-0" />
              )}
              <span>{statusNotice.message}</span>
            </div>
          )}
        </div>

        {testNotice && (
          <div
            className={`p-2.5 rounded-xl border font-mono text-[11px] ${
              testNotice.success
                ? "bg-emerald-50 border-emerald-200 text-emerald-800"
                : "bg-rose-50 border-rose-200 text-rose-800"
            }`}
          >
            {testNotice.message}
          </div>
        )}
      </div>

      {/* Top Visitors & Engagement KPI Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {[
          {
            title: "Total Visitors",
            value: summary.totalVisitors ?? 0,
            sub: `New: ${summary.newVisitors ?? 0} • Returning: ${summary.returningVisitors ?? 0}`,
            icon: <Users className="w-4 h-4 text-blue-600" />,
            badge: "bg-blue-50",
            border: "border-blue-200",
          },
          {
            title: "Page Views & Sessions",
            value: summary.totalPageViews ?? 0,
            sub: `${summary.totalSessions ?? 0} Sessions • ${summary.viewsPerSession ?? 0} Views/Session`,
            icon: <Eye className="w-4 h-4 text-emerald-600" />,
            badge: "bg-emerald-50",
            border: "border-emerald-200",
          },
          {
            title: "Avg. Time on Site",
            value: formatDuration(summary.avgSessionDurationSec),
            sub: `Engaged: ${summary.engagementRate ?? 0}% • Bounce: ${summary.bounceRate ?? 0}%`,
            icon: <Clock className="w-4 h-4 text-amber-600" />,
            badge: "bg-amber-50",
            border: "border-amber-200",
          },
          {
            title: "Funnel Conversion",
            value: `${summary.funnelConversionRate ?? 0}%`,
            sub: `Settled Funnel Revenue: ${formatBDT(summary.totalRevenue || 0)}`,
            icon: <TrendingUp className="w-4 h-4 text-indigo-600" />,
            badge: "bg-indigo-50",
            border: "border-indigo-200",
          },
        ].map((card) => (
          <div key={card.title} className={`bg-white rounded-2xl p-4 border ${card.border} shadow-xs space-y-1.5`}>
            <div className="flex items-center justify-between">
              <span className="text-[11px] font-bold text-neutral-500 uppercase tracking-wider">
                {card.title}
              </span>
              <div className={`p-1.5 rounded-xl ${card.badge}`}>{card.icon}</div>
            </div>
            <div className="text-2xl font-black text-neutral-950">{card.value}</div>
            <p className="text-[11px] text-neutral-600 font-medium">{card.sub}</p>
          </div>
        ))}
      </div>

      {/* Row 1 Charts: Traffic Sources (Pie Chart) + Visitors & Page Views (Vertical Bar Chart) */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-5">
        <div className="lg:col-span-5 bg-white rounded-3xl p-5 border border-neutral-200 shadow-xs space-y-4">
          <div className="flex items-start justify-between gap-2">
            <div>
              <h3 className="text-sm font-black text-neutral-900 flex items-center gap-1.5">
                <PieChartIcon className="w-4 h-4 text-blue-600" />
                <span>{"Traffic Sources"}</span>
              </h3>
              <p className="text-[11px] text-neutral-500">
                {"Google Search, Facebook, Instagram, Direct & YouTube acquisitions"}
              </p>
            </div>
          </div>

          <InteractivePieChart
            slices={dashboard.trafficSources || []}
            centerLabel="Traffic"
            centerValue={String(
              (dashboard.trafficSources || []).reduce((acc, s) => acc + Number(s.count || 0), 0)
            )}
            emptyText="Waiting for storefront visits"
          />
        </div>

        <div className="lg:col-span-7 bg-white rounded-3xl p-5 border border-neutral-200 shadow-xs flex flex-col justify-between gap-3">
          <div className="flex flex-wrap items-start justify-between gap-2">
            <div>
              <h3 className="text-sm font-black text-neutral-900 flex items-center gap-1.5">
                <BarChart3 className="w-4 h-4 text-emerald-600" />
                <span>{"Visitors vs Page Views Trend"}</span>
              </h3>
              <p className="text-[11px] text-neutral-500">
                {`Time on site & page engagement • ${dashboard.bounds?.rangeLabel || ""}`}
              </p>
            </div>
            <div className="flex items-center gap-3 text-[11px] font-bold">
              <span className="flex items-center gap-1.5 text-neutral-700">
                <span className="w-2.5 h-2.5 rounded-sm bg-blue-600" />
                {"Visitors"}
              </span>
              <span className="flex items-center gap-1.5 text-neutral-700">
                <span className="w-2.5 h-2.5 rounded-sm bg-emerald-500" />
                {"Page Views"}
              </span>
            </div>
          </div>

          <VerticalAnalyticsBarChart
            data={dashboard.timelineSeries || []}
            primaryKey="visitors"
            secondaryKey="pageViews"
            primaryLabel="Visitors"
            secondaryLabel="Page Views"
            primaryColor="#2563EB"
            secondaryColor="#10B981"
          />
        </div>
      </div>

      {/* Row 2 Charts: New vs Returning (Pie) + Devices (Pie) + Cities / Locations (Bar Chart) */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-5">
        <div className="lg:col-span-4 bg-white rounded-3xl p-5 border border-neutral-200 shadow-xs space-y-4">
          <div>
            <h3 className="text-sm font-black text-neutral-900 flex items-center gap-1.5">
              <Users className="w-4 h-4 text-emerald-600" />
              <span>{"New vs Returning Visitors"}</span>
            </h3>
            <p className="text-[11px] text-neutral-500">
              {"First-time vs repeat storefront shoppers"}
            </p>
          </div>
          <InteractivePieChart
            slices={dashboard.visitorTypes || []}
            centerLabel="Visitors"
            centerValue={String(summary.totalVisitors ?? 0)}
            emptyText="No visitor sessions yet"
          />
        </div>

        <div className="lg:col-span-4 bg-white rounded-3xl p-5 border border-neutral-200 shadow-xs space-y-4">
          <div>
            <h3 className="text-sm font-black text-neutral-900 flex items-center gap-1.5">
              <Smartphone className="w-4 h-4 text-indigo-600" />
              <span>{"Device Breakdown"}</span>
            </h3>
            <p className="text-[11px] text-neutral-500">
              {"Mobile vs Desktop vs Tablet share"}
            </p>
          </div>
          <InteractivePieChart
            slices={dashboard.deviceBreakdown || []}
            centerLabel="Devices"
            centerValue={String(summary.totalSessions ?? 0)}
            emptyText="No device data yet"
          />
        </div>

        <div className="lg:col-span-4 bg-white rounded-3xl p-5 border border-neutral-200 shadow-xs flex flex-col justify-between gap-3">
          <div>
            <h3 className="text-sm font-black text-neutral-900 flex items-center gap-1.5">
              <MapPin className="w-4 h-4 text-rose-500" />
              <span>{"Top Visitor Cities & Locations"}</span>
            </h3>
            <p className="text-[11px] text-neutral-500">
              {"District & city visits + order demand"}
            </p>
          </div>
          <VerticalAnalyticsBarChart
            data={cityChartData}
            primaryKey="visitors"
            primaryLabel="Visits/Orders"
            primaryColor="#6366F1"
          />
        </div>
      </div>

      {/* Row 3: E-Commerce Conversion Funnel & Step-by-Step Drop-Off Analysis */}
      <div className="bg-white rounded-3xl p-5 sm:p-6 border border-neutral-200 shadow-xs space-y-5">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <h3 className="text-sm font-black text-neutral-900 flex items-center gap-2">
              <BarChart3 className="w-4 h-4 text-indigo-600" />
              <span>{"E-Commerce Funnel Conversion & Customer Drop-Off"}</span>
            </h3>
            <p className="text-[11px] text-neutral-500">
              {"Track exactly how many customers progress from View → Add to Cart → Checkout → Purchase and where drop-offs happen."}
            </p>
          </div>
          {biggestDropStep && (
            <span className="px-3 py-1 rounded-full bg-rose-50 border border-rose-200 text-rose-700 text-[11px] font-bold">
              {`Highest Drop-off at ${biggestDropStep.stage}: ${biggestDropStep.dropOffPct}%`}
            </span>
          )}
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-12 gap-5 items-center">
          <div className="lg:col-span-6">
            <VerticalAnalyticsBarChart
              data={funnelBarData}
              primaryKey="count"
              primaryLabel="Users/Events"
              primaryColor="#2563EB"
            />
          </div>

          <div className="lg:col-span-6 grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs">
            {(dashboard.funnel || []).map((step, idx) => (
              <div
                key={step.stage}
                className="p-3.5 rounded-2xl border border-neutral-200 bg-neutral-50/70 space-y-1.5"
              >
                <div className="flex items-center justify-between">
                  <span className="font-black text-neutral-900 flex items-center gap-1.5">
                    <span
                      className="w-2.5 h-2.5 rounded-full"
                      style={{ backgroundColor: step.color }}
                    />
                    {`${idx + 1}. ${step.stage}`}
                  </span>
                  <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-white border border-neutral-200 text-neutral-700">
                    {`${step.rateFromTop}% of Views`}
                  </span>
                </div>
                <div className="text-xl font-black text-neutral-950">{step.count}</div>
                <div className="flex items-center justify-between text-[11px]">
                  <span className="text-emerald-700 font-bold">
                    {idx === 0 ? "Funnel Entry" : `Kept: ${step.rateFromPrev}%`}
                  </span>
                  {idx > 0 && (
                    <span className="text-rose-600 font-bold">
                      {`Dropped: ${step.dropOffPct}%`}
                    </span>
                  )}
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Row 4: Top Pages & Live Storefront Activity Stream */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-5">
        <div className="lg:col-span-5 bg-white rounded-3xl p-5 border border-neutral-200 shadow-xs space-y-3">
          <div>
            <h3 className="text-sm font-black text-neutral-900 flex items-center gap-1.5">
              <Monitor className="w-4 h-4 text-emerald-600" />
              <span>{"Top Viewed Store Pages"}</span>
            </h3>
            <p className="text-[11px] text-neutral-500">{"Most visited storefront routes and time spent"}</p>
          </div>
          <div className="divide-y divide-neutral-100 border border-neutral-200 rounded-2xl overflow-hidden text-xs">
            {(dashboard.topPages || []).length === 0 ? (
              <div className="p-6 text-center text-neutral-400">{"No page views tracked yet."}</div>
            ) : (
              dashboard.topPages.map((pg) => (
                <div key={pg.path} className="p-3 flex items-center justify-between gap-3">
                  <div className="min-w-0">
                    <span className="font-bold text-neutral-900 block truncate">{pg.title || pg.path}</span>
                    <span className="text-[10px] font-mono text-neutral-400 block truncate">{pg.path}</span>
                  </div>
                  <div className="text-right shrink-0">
                    <span className="font-black text-neutral-900 block">{`${pg.views} Views`}</span>
                    <span className="text-[10px] text-neutral-500">{`Avg ${formatDuration(pg.avgDurationSec)}`}</span>
                  </div>
                </div>
              ))
            )}
          </div>
        </div>

        <div className="lg:col-span-7 bg-white rounded-3xl p-5 border border-neutral-200 shadow-xs space-y-3">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <div>
              <h3 className="text-sm font-black text-neutral-900 flex items-center gap-1.5">
                <Activity className="w-4 h-4 text-blue-600" />
                <span>{"Live Visitor Activity Stream"}</span>
              </h3>
              <p className="text-[11px] text-neutral-500">
                {"Real-time actions, product viewed, traffic channel, device, and visitor city"}
              </p>
            </div>
            {(dashboard.recentActivity || []).length > 0 && (
              <span className="text-[10px] font-bold px-2.5 py-0.5 rounded-full bg-neutral-100 text-neutral-600">
                {`${dashboard.recentActivity.length} Events`}
              </span>
            )}
          </div>
          <div className="overflow-auto max-h-[385px] border border-neutral-200 rounded-2xl">
            <table className="w-full text-left text-xs">
              <thead className="bg-neutral-50 text-neutral-500 font-bold border-b border-neutral-200 sticky top-0 z-10">
                <tr>
                  <th className="py-2.5 px-3">{"Event"}</th>
                  <th className="py-2.5 px-3">{"Product"}</th>
                  <th className="py-2.5 px-3">{"Page"}</th>
                  <th className="py-2.5 px-3">{"Source"}</th>
                  <th className="py-2.5 px-3">{"Device / City"}</th>
                  <th className="py-2.5 px-3">{"Visitor"}</th>
                  <th className="py-2.5 px-3">{"Time"}</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-neutral-100">
                {(dashboard.recentActivity || []).length === 0 ? (
                  <tr>
                    <td colSpan={7} className="py-8 text-center text-neutral-400">
                      {"Open the storefront to see live visitor telemetry appear here in real time."}
                    </td>
                  </tr>
                ) : (
                  dashboard.recentActivity.map((ev) => (
                    <tr key={ev.id} className="hover:bg-neutral-50/70">
                      <td className="py-2 px-3 font-bold text-neutral-900 whitespace-nowrap">{ev.eventType}</td>
                      <td
                        className="py-2 px-3 font-semibold text-neutral-800 max-w-[160px] truncate"
                        title={ev.productName || "General Storefront"}
                      >
                        {ev.productName || <span className="text-neutral-400 font-normal">{"—"}</span>}
                      </td>
                      <td
                        className="py-2 px-3 font-mono text-[11px] text-neutral-600 max-w-[130px] truncate"
                        title={ev.pagePath}
                      >
                        {ev.pagePath}
                      </td>
                      <td className="py-2 px-3 font-semibold text-blue-700 whitespace-nowrap">{ev.trafficSource}</td>
                      <td className="py-2 px-3 text-[11px] text-neutral-600 whitespace-nowrap">
                        {`${ev.deviceType} • ${ev.city}`}
                      </td>
                      <td className="py-2 px-3">
                        <span
                          className={`px-2 py-0.5 rounded-full text-[10px] font-bold ${
                            ev.isNewVisitor
                              ? "bg-emerald-50 text-emerald-700"
                              : "bg-blue-50 text-blue-700"
                          }`}
                        >
                          {ev.isNewVisitor ? "New" : "Returning"}
                        </span>
                      </td>
                      <td className="py-2 px-3 text-[10px] font-mono text-neutral-400 whitespace-nowrap">
                        {formatBDTDateTime(ev.timestamp, true)}
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </div>
  );
};

export default AdminGoogleAnalytics;

