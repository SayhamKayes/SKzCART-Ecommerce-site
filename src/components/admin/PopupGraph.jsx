import { useState, useMemo, useEffect } from "react";
import {
  X,
  TrendingUp,
  Calendar,
  Search,
  ShoppingBag,
  DollarSign,
  Package,
  Layers,
  CheckCircle2,
  Sparkles,
  ChevronLeft,
  ChevronRight
} from "lucide-react";
import { formatBDT } from "../../utils/bangladesh";
import {
  POPUP_TIMEFRAME_OPTIONS,
  extractLocalISODate,
  getDefaultCustomRange,
  resolveAnalyticsBounds,
  isWithinISORange,
  buildAnalyticsSeries,
  isSettledOrderEarning,
  getOrderNetEarning,
} from "../../utils/analyticsRange";

const PopupGraph = ({
  isOpen = false,
  onClose,
  orders = [],
  products = [],
  isEnglish = true
}) => {
  const [timeframe, setTimeframe] = useState("7d"); // Default: Last 7 Days ('7d' | '30d' | '3m' | '6m' | '1y' | 'custom' | 'all')
  const [customRange, setCustomRange] = useState(() => getDefaultCustomRange());
  const [searchQuery, setSearchQuery] = useState("");
  const [currentPage, setCurrentPage] = useState(1);
  const itemsPerPage = 10;
  const [hoveredPointIndex, setHoveredPointIndex] = useState(null);

  // Reset to Last 7 Days whenever modal opens so it matches Dashboard Overview 1:1
  useEffect(() => {
    if (isOpen) {
      setTimeframe("7d");
      setHoveredPointIndex(null);
    }
  }, [isOpen]);

  // Reset to first page when search query or timeframe changes
  useEffect(() => {
    setCurrentPage(1);
    setHoveredPointIndex(null);
  }, [searchQuery, timeframe, customRange.start, customRange.end]);

  // Close on Escape key
  useEffect(() => {
    const handleKeyDown = (e) => {
      if (e.key === "Escape" && isOpen) {
        onClose?.();
      }
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [isOpen, onClose]);

  // Prevent background scroll when modal is open
  useEffect(() => {
    if (isOpen) {
      document.body.style.overflow = "hidden";
    } else {
      document.body.style.overflow = "";
    }
    return () => {
      document.body.style.overflow = "";
    };
  }, [isOpen]);

  // Exact same bounds & real time-series logic as AdminAnalytics & Overview Graph
  const { bounds, filteredOrders, chartPointsData } = useMemo(() => {
    const resolvedBounds = resolveAnalyticsBounds(
      timeframe,
      customRange.start,
      customRange.end,
      orders
    );
    const scoped = orders.filter((o) =>
      isWithinISORange(
        extractLocalISODate(o?.createdAt),
        resolvedBounds.startISO,
        resolvedBounds.endISO
      )
    );
    const series = buildAnalyticsSeries(scoped, resolvedBounds).map((bucket) => ({
      key: bucket.key,
      label: bucket.label,
      display: bucket.fullLabel || bucket.label,
      revenue: Number(bucket.earnings || 0),
      orders: Number(bucket.orders || 0),
    }));

    return {
      bounds: resolvedBounds,
      filteredOrders: scoped,
      chartPointsData: series,
    };
  }, [orders, timeframe, customRange.start, customRange.end]);

  // KPIs for the selected timeframe (strictly matching AdminAnalytics, excluding delivery charges)
  const filteredRevenue = useMemo(() => {
    return filteredOrders.reduce(
      (sum, o) => sum + (isSettledOrderEarning(o) ? getOrderNetEarning(o) : 0),
      0
    );
  }, [filteredOrders]);

  const deliveredOrdersCount = useMemo(() => {
    return filteredOrders.filter(
      (o) => String(o.status || "").toUpperCase() === "DELIVERED"
    ).length;
  }, [filteredOrders]);

  const filteredAOV = useMemo(() => {
    return filteredOrders.length > 0
      ? Math.round(
          filteredOrders.reduce((sum, o) => sum + (Number(o.total) || 0), 0) /
            filteredOrders.length
        )
      : 0;
  }, [filteredOrders]);

  const codPendingFiltered = useMemo(() => {
    return filteredOrders
      .filter((o) => {
        const method = String(o.paymentMethod || "").toUpperCase();
        const status = String(o.status || "").toUpperCase();
        return (
          method === "COD" &&
          status !== "DELIVERED" &&
          status !== "CANCELLED" &&
          status !== "RETURNED"
        );
      })
      .reduce((sum, o) => sum + (Number(o.total) || 0), 0);
  }, [filteredOrders]);

  // Chart coordinates
  const chartWidth = 600;
  const chartHeight = 200;
  const paddingX = 56;
  const paddingRight = 24;
  const paddingYTop = 25;
  const paddingYBottom = 35;
  const usableWidth = chartWidth - paddingX - paddingRight;
  const usableHeight = chartHeight - paddingYTop - paddingYBottom;

  const maxVal = Math.max(...chartPointsData.map((p) => p.revenue), 100);

  const svgPoints = chartPointsData.map((p, idx) => {
    const x =
      chartPointsData.length === 1
        ? paddingX + usableWidth / 2
        : paddingX + (idx / Math.max(chartPointsData.length - 1, 1)) * usableWidth;
    const y = chartHeight - paddingYBottom - (p.revenue / maxVal) * usableHeight;
    return { ...p, x, y };
  });

  const maxLabels = 12;
  const labelStride = Math.max(1, Math.ceil(svgPoints.length / maxLabels));

  const createSmoothPath = (pts) => {
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

  const linePath = createSmoothPath(svgPoints);
  const areaPath =
    svgPoints.length > 0 && filteredRevenue > 0
      ? `${linePath} L ${svgPoints[svgPoints.length - 1].x},${chartHeight - paddingYBottom} L ${svgPoints[0].x},${chartHeight - paddingYBottom} Z`
      : "";

  // Product-wise aggregation using settled revenue orders in range
  const productAnalytics = useMemo(() => {
    const map = {};

    products.forEach((prod) => {
      map[prod.id] = {
        id: prod.id,
        name: prod.name,
        nameBn: prod.nameBn || prod.bengaliName || prod.name,
        category: prod.category || "General",
        price: prod.price || 0,
        image:
          prod.thumbnail ||
          prod.image ||
          (Array.isArray(prod.images) ? prod.images[0] : "") ||
          "",
        stock: prod.stock ?? 25,
        unitsSold: 0,
        revenue: 0,
        ordersCount: 0
      };
    });

    filteredOrders.forEach((order) => {
      if (!isSettledOrderEarning(order)) return;
      if (Array.isArray(order.items) && order.items.length > 0) {
        order.items.forEach((item) => {
          const pId = item.productId || item.id;
          if (!map[pId]) {
            map[pId] = {
              id: pId,
              name: item.name || "Product",
              nameBn: item.nameBn || item.name || "Product",
              category: "General",
              price: item.price || 0,
              image: item.image || "",
              stock: 20,
              unitsSold: 0,
              revenue: 0,
              ordersCount: 0
            };
          }
          const qty = Number(item.quantity) || 1;
          const itemTotal = (Number(item.price) || 0) * qty;
          map[pId].unitsSold += qty;
          map[pId].revenue += itemTotal;
          map[pId].ordersCount += 1;
        });
      }
    });

    const list = Object.values(map);
    if (!searchQuery.trim()) {
      return list.sort((a, b) => b.revenue - a.revenue);
    }
    const q = searchQuery.toLowerCase().trim();
    return list
      .filter(
        (p) =>
          p.name.toLowerCase().includes(q) ||
          p.nameBn.toLowerCase().includes(q) ||
          p.category.toLowerCase().includes(q)
      )
      .sort((a, b) => b.revenue - a.revenue);
  }, [products, filteredOrders, searchQuery]);

  const totalUnitsSold = useMemo(() => {
    return productAnalytics.reduce((sum, p) => sum + p.unitsSold, 0);
  }, [productAnalytics]);

  const categoryStats = useMemo(() => {
    const catMap = {};
    productAnalytics.forEach((p) => {
      const cat = p.category || "General";
      catMap[cat] = (catMap[cat] || 0) + p.revenue;
    });
    const total = Object.values(catMap).reduce((a, b) => a + b, 0) || 1;
    return Object.entries(catMap).map(([name, amount]) => ({
      name,
      amount,
      pct: Math.round((amount / total) * 100)
    }));
  }, [productAnalytics]);

  const totalProductsCount = productAnalytics.length;
  const totalPages = Math.ceil(totalProductsCount / itemsPerPage) || 1;
  const startIndex = (currentPage - 1) * itemsPerPage;
  const endIndex = Math.min(startIndex + itemsPerPage, totalProductsCount);
  const paginatedProducts = useMemo(() => {
    return productAnalytics.slice(startIndex, endIndex);
  }, [productAnalytics, startIndex, endIndex]);

  if (!isOpen) return null;

  return (
    <div
      className="fixed inset-0 z-50 bg-black/40 backdrop-blur-md flex items-center justify-center p-3 sm:p-6 transition-all duration-300"
      onClick={onClose}
    >
      {/* Modal Dialog Window */}
      <div
        className="bg-white w-full max-w-6xl max-h-[92vh] rounded-3xl shadow-2xl border border-neutral-200 overflow-hidden flex flex-col animate-in fade-in zoom-in-95"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Modal Header */}
        <div className="p-5 sm:p-6 border-b border-neutral-200 flex flex-wrap items-center justify-between gap-4 bg-neutral-50/70">
          <div className="flex items-center gap-3">
            <div className="p-3 rounded-2xl bg-emerald-100 text-emerald-700">
              <TrendingUp className="w-6 h-6" />
            </div>
            <div>
              <div className="flex flex-wrap items-center gap-2">
                <h2 className="text-xl font-black text-neutral-900">
                  {"Total Earnings & Sales Analytics"}
                </h2>
                <span className="text-[11px] font-bold px-2 py-0.5 rounded-full bg-emerald-50 text-emerald-700 border border-emerald-200">
                  {bounds.rangeLabel}
                </span>
              </div>
              <p className="text-xs text-neutral-500 mt-0.5">
                {"Real-time settled revenue tracking, order timeline & product-wise sales breakdown"}
              </p>
            </div>
          </div>

          <div className="flex items-center gap-3">
            <button
              onClick={onClose}
              className="p-2 rounded-xl bg-white hover:bg-neutral-200 text-neutral-500 hover:text-neutral-900 border border-neutral-200 transition-colors cursor-pointer"
              title={"Close modal"}
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Modal Scrollable Body */}
        <div className="overflow-y-auto p-5 sm:p-6 space-y-6 flex-1">
          {/* 1. Timeframe Filter Toolbar */}
          <div className="bg-white rounded-2xl p-4 border border-neutral-200 shadow-2xs space-y-3">
            <div className="flex flex-wrap items-center justify-between gap-3">
              <div className="flex items-center gap-1.5 text-xs font-bold text-neutral-700">
                <Calendar className="w-4 h-4 text-emerald-600" />
                <span>{"Select Timeframe:"}</span>
              </div>

              {/* Timeframe pill tabs */}
              <div className="flex flex-wrap items-center gap-1.5 bg-neutral-100 p-1 rounded-xl">
                {POPUP_TIMEFRAME_OPTIONS.map((tab) => (
                  <button
                    key={tab.key}
                    type="button"
                    onClick={() => setTimeframe(tab.key)}
                    className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all cursor-pointer ${
                      timeframe === tab.key
                        ? "bg-white text-emerald-700 shadow-xs"
                        : "text-neutral-600 hover:text-neutral-900"
                    }`}
                  >
                    {tab.label}
                  </button>
                ))}
              </div>
            </div>

            {/* Custom Date Range Picker if 'custom' is active */}
            {timeframe === "custom" && (
              <div className="flex flex-wrap items-center gap-3 pt-2 border-t border-neutral-100 text-xs">
                <span className="font-semibold text-neutral-600">
                  {"Date Range:"}
                </span>
                <input
                  type="date"
                  value={customRange.start}
                  max={customRange.end || undefined}
                  onChange={(e) =>
                    setCustomRange((prev) => ({ ...prev, start: e.target.value }))
                  }
                  className="px-3 py-1.5 border border-neutral-300 rounded-xl font-medium focus:ring-2 focus:ring-emerald-500 focus:outline-none"
                />
                <span className="text-neutral-400">—</span>
                <input
                  type="date"
                  value={customRange.end}
                  min={customRange.start || undefined}
                  onChange={(e) =>
                    setCustomRange((prev) => ({ ...prev, end: e.target.value }))
                  }
                  className="px-3 py-1.5 border border-neutral-300 rounded-xl font-medium focus:ring-2 focus:ring-emerald-500 focus:outline-none"
                />
              </div>
            )}
          </div>

          {/* 2. Overview KPI Cards for Selected Timeframe */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            {/* Total Revenue in range */}
            <div className="bg-emerald-50/60 rounded-2xl p-4 border border-emerald-200">
              <div className="flex justify-between items-start mb-1 text-emerald-700">
                <span className="text-xs font-bold uppercase tracking-wider">
                  {"Total Revenue"}
                </span>
                <DollarSign className="w-4 h-4" />
              </div>
              <div className="text-2xl font-black text-emerald-900">
                {formatBDT(filteredRevenue)}
              </div>
              <div className="text-[11px] text-emerald-700 mt-1 font-semibold">
                {"Paid & delivered orders"}
              </div>
            </div>

            {/* Orders Count in range */}
            <div className="bg-white rounded-2xl p-4 border border-neutral-200">
              <div className="flex justify-between items-start mb-1 text-neutral-500">
                <span className="text-xs font-bold uppercase tracking-wider">
                  {"Total Orders"}
                </span>
                <ShoppingBag className="w-4 h-4 text-blue-600" />
              </div>
              <div className="text-2xl font-black text-neutral-900">
                {filteredOrders.length} {"Orders"}
              </div>
              <div className="text-[11px] text-blue-600 mt-1 font-semibold">
                {deliveredOrdersCount} {"Delivered successfully"}
              </div>
            </div>

            {/* Total Units Sold */}
            <div className="bg-white rounded-2xl p-4 border border-neutral-200">
              <div className="flex justify-between items-start mb-1 text-neutral-500">
                <span className="text-xs font-bold uppercase tracking-wider">
                  {"Units Sold"}
                </span>
                <Package className="w-4 h-4 text-purple-600" />
              </div>
              <div className="text-2xl font-black text-neutral-900">
                {totalUnitsSold} {"Pcs"}
              </div>
              <div className="text-[11px] text-purple-600 mt-1 font-semibold">
                {"Paid & delivered items"}
              </div>
            </div>

            {/* Average Order Value (AOV) */}
            <div className="bg-white rounded-2xl p-4 border border-neutral-200">
              <div className="flex justify-between items-start mb-1 text-neutral-500">
                <span className="text-xs font-bold uppercase tracking-wider">
                  {"Average Order"}
                </span>
                <Sparkles className="w-4 h-4 text-amber-600" />
              </div>
              <div className="text-2xl font-black text-neutral-900">
                {formatBDT(filteredAOV)}
              </div>
              <div className="text-[11px] text-amber-700 mt-1 font-semibold">
                {"COD Pending:"} {formatBDT(codPendingFiltered)}
              </div>
            </div>
          </div>

          {/* 3. Visual Charts Grid (Revenue Trend + Category Flowchart) */}
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
            {/* Left: SVG Revenue Trend Area Chart (Col 8) */}
            <div className="lg:col-span-8 bg-white rounded-3xl p-5 border border-neutral-200 shadow-2xs space-y-3">
              <div className="flex justify-between items-center">
                <div>
                  <h3 className="text-sm font-bold text-neutral-900 flex items-center gap-1.5">
                    <TrendingUp className="w-4 h-4 text-emerald-600" />
                    <span>
                      {"Revenue & Earnings Trend Curve"}
                    </span>
                  </h3>
                  <p className="text-[11px] text-neutral-400">
                    {`Settled & paid revenue trend • ${bounds.rangeLabel}`}
                  </p>
                </div>
                <span className="text-xs font-extrabold text-neutral-900 bg-neutral-100 px-3 py-1 rounded-xl">
                  {formatBDT(filteredRevenue)}
                </span>
              </div>

              {/* Chart Canvas */}
              <div className="relative pt-2">
                <svg
                  viewBox={`0 0 ${chartWidth} ${chartHeight}`}
                  className="w-full h-auto overflow-visible select-none"
                >
                  <defs>
                    <linearGradient id="popupAreaGrad" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="0%" stopColor="#10B981" stopOpacity="0.35" />
                      <stop offset="100%" stopColor="#10B981" stopOpacity="0.0" />
                    </linearGradient>
                  </defs>

                  {/* Horizontal Grid lines + Y-axis labels */}
                  {[0, 0.5, 1].map((ratio, idx) => {
                    const y = chartHeight - paddingYBottom - usableHeight * ratio;
                    const tickVal = filteredRevenue === 0 && ratio > 0 ? 0 : Math.round(maxVal * ratio);
                    return (
                      <g key={idx}>
                        <line
                          x1={paddingX}
                          y1={y}
                          x2={chartWidth - paddingRight}
                          y2={y}
                          stroke={idx === 0 ? "#CBD5E1" : "#E5E7EB"}
                          strokeDasharray={idx === 0 ? undefined : "3 3"}
                          strokeWidth="1"
                        />
                        <text
                          x={paddingX - 8}
                          y={y + 3}
                          textAnchor="end"
                          fontSize="9.5"
                          fill="#64748B"
                          fontWeight="700"
                        >
                          {idx === 0 ? formatBDT(0) : filteredRevenue > 0 ? formatBDT(tickVal) : ""}
                        </text>
                      </g>
                    );
                  })}

                  {/* Gradient Area */}
                  {areaPath && <path d={areaPath} fill="url(#popupAreaGrad)" />}

                  {/* Curve Line (180-deg flat baseline when revenue is 0) */}
                  {linePath && (
                    <path
                      d={linePath}
                      fill="none"
                      stroke="#059669"
                      strokeWidth="3"
                      strokeLinecap="round"
                      strokeLinejoin="round"
                    />
                  )}

                  {/* Hover Guide Line */}
                  {hoveredPointIndex !== null && svgPoints[hoveredPointIndex] && (
                    <line
                      x1={svgPoints[hoveredPointIndex].x}
                      y1={paddingYTop}
                      x2={svgPoints[hoveredPointIndex].x}
                      y2={chartHeight - paddingYBottom}
                      stroke="#10B981"
                      strokeDasharray="2 2"
                      strokeWidth="1.5"
                    />
                  )}

                  {/* Points and Axis Text */}
                  {svgPoints.map((p, idx) => {
                    const isHovered = hoveredPointIndex === idx;
                    const showLabel =
                      svgPoints.length <= maxLabels ||
                      idx % labelStride === 0 ||
                      idx === svgPoints.length - 1;
                    return (
                      <g key={p.key || idx} className="cursor-pointer">
                        <circle
                          cx={p.x}
                          cy={p.y}
                          r={isHovered ? 6 : svgPoints.length > 20 ? 2.8 : 4}
                          fill="#FFFFFF"
                          stroke="#059669"
                          strokeWidth={isHovered ? 3 : 2}
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
                        {showLabel && (
                          <text
                            x={p.x}
                            y={chartHeight - 10}
                            textAnchor="middle"
                            className={`text-[9.5px] select-none font-semibold ${
                              isHovered ? "fill-emerald-700 font-bold" : "fill-neutral-400"
                            }`}
                          >
                            {p.label}
                          </text>
                        )}
                      </g>
                    );
                  })}
                </svg>

                {/* Floating Tooltip */}
                {hoveredPointIndex !== null && svgPoints[hoveredPointIndex] && (
                  <div
                    className="absolute pointer-events-none -top-2 transform -translate-x-1/2 bg-neutral-900 text-white text-xs px-3 py-1.5 rounded-xl shadow-xl z-20 whitespace-nowrap"
                    style={{
                      left: `${Math.min(Math.max((svgPoints[hoveredPointIndex].x / chartWidth) * 100, 14), 86)}%`
                    }}
                  >
                    <div className="font-extrabold text-emerald-400">
                      {formatBDT(svgPoints[hoveredPointIndex].revenue)}
                    </div>
                    <div className="text-neutral-300 text-[10px]">
                      {svgPoints[hoveredPointIndex].display} • {svgPoints[hoveredPointIndex].orders} orders
                    </div>
                  </div>
                )}
              </div>
            </div>

            {/* Right: Category Flow / Distribution (Col 4) */}
            <div className="lg:col-span-4 bg-white rounded-3xl p-5 border border-neutral-200 shadow-2xs space-y-4">
              <div>
                <h3 className="text-sm font-bold text-neutral-900 flex items-center gap-1.5">
                  <Layers className="w-4 h-4 text-indigo-600" />
                  <span>{"Sales Share by Category"}</span>
                </h3>
                <p className="text-[11px] text-neutral-400">
                  {"Distribution of settled sales across categories"}
                </p>
              </div>

              <div className="space-y-3">
                {categoryStats.map((cat, idx) => {
                  const colors = [
                    "bg-emerald-600",
                    "bg-blue-600",
                    "bg-purple-600",
                    "bg-amber-600",
                    "bg-indigo-600"
                  ];
                  const barColor = colors[idx % colors.length];

                  return (
                    <div
                      key={cat.name}
                      className="p-3 rounded-2xl bg-neutral-50 border border-neutral-100 text-xs"
                    >
                      <div className="flex justify-between items-center mb-1">
                        <span className="font-bold text-neutral-800 truncate max-w-[140px]">
                          {cat.name}
                        </span>
                        <span className="font-extrabold text-neutral-900">
                          {formatBDT(cat.amount)}
                        </span>
                      </div>
                      <div className="w-full bg-neutral-200 rounded-full h-1.5 overflow-hidden">
                        <div
                          className={`${barColor} h-1.5 rounded-full transition-all duration-500`}
                          style={{ width: `${cat.pct}%` }}
                        />
                      </div>
                      <span className="text-[10px] text-neutral-400 mt-1 block font-medium">
                        {cat.pct}% {"share of sales"}
                      </span>
                    </div>
                  );
                })}
              </div>
            </div>
          </div>

          {/* 4. Product-wise Search & Comprehensive Analytics Table */}
          <div className="bg-white rounded-3xl p-5 sm:p-6 border border-neutral-200 shadow-2xs space-y-4">
            <div className="flex flex-wrap items-center justify-between gap-4">
              <div>
                <h3 className="text-base font-bold text-neutral-900 flex items-center gap-2">
                  <Package className="w-4 h-4 text-emerald-600" />
                  <span>
                    {"Product-wise Sales Performance"}
                  </span>
                </h3>
                <p className="text-xs text-neutral-400">
                  {"Units sold, revenue generation, and sales share for each catalog item"}
                </p>
              </div>

              {/* Product Search Input */}
              <div className="relative w-full sm:w-72">
                <Search className="w-4 h-4 text-neutral-400 absolute left-3 top-1/2 -translate-y-1/2" />
                <input
                  type="text"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  placeholder={"Search product or category..."}
                  className="w-full pl-9 pr-8 py-2 bg-neutral-50 border border-neutral-200 rounded-xl text-xs font-medium focus:bg-white focus:ring-2 focus:ring-emerald-500 focus:outline-none transition-all"
                />
                {searchQuery && (
                  <button
                    onClick={() => setSearchQuery("")}
                    className="absolute right-2.5 top-1/2 -translate-y-1/2 text-neutral-400 hover:text-neutral-700 text-xs font-bold"
                  >
                    ✕
                  </button>
                )}
              </div>
            </div>

            {/* Product Table */}
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs">
                <thead className="bg-neutral-50 text-neutral-500 font-semibold border-y border-neutral-200">
                  <tr>
                    <th className="py-3 px-3">{"Product"}</th>
                    <th className="py-3 px-3">{"Category"}</th>
                    <th className="py-3 px-3 text-center">{"Units Sold"}</th>
                    <th className="py-3 px-3">{"Revenue"}</th>
                    <th className="py-3 px-3">{"Sales Share"}</th>
                    <th className="py-3 px-3 text-right">{"Stock Status"}</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-neutral-100">
                  {totalProductsCount === 0 ? (
                    <tr>
                      <td colSpan={6} className="py-8 text-center text-neutral-400">
                        {"No products found matching your search."}
                      </td>
                    </tr>
                  ) : (
                    paginatedProducts.map((prod) => {
                      const sharePct =
                        filteredRevenue > 0
                          ? Math.round((prod.revenue / filteredRevenue) * 100)
                          : 0;

                      return (
                        <tr
                          key={prod.id}
                          className="hover:bg-neutral-50/80 transition-colors"
                        >
                          <td className="py-3 px-3">
                            <div className="flex items-center gap-3">
                              {prod.image ? (
                                <img
                                  src={prod.image}
                                  alt={prod.name}
                                  className="w-10 h-10 rounded-xl object-cover border border-neutral-200 shrink-0"
                                />
                              ) : (
                                <div className="w-10 h-10 rounded-xl bg-neutral-100 border border-neutral-200 flex items-center justify-center text-neutral-400 shrink-0">
                                  <Package className="w-5 h-5" />
                                </div>
                              )}
                              <div className="min-w-0">
                                <div
                                  className="font-bold text-neutral-900 truncate max-w-xs"
                                  title={isEnglish ? prod.name : prod.nameBn}
                                >
                                  {isEnglish ? prod.name : prod.nameBn}
                                </div>
                                <div className="text-[10px] text-neutral-400 font-mono">
                                  ID: {prod.id} | {formatBDT(prod.price)}
                                </div>
                              </div>
                            </div>
                          </td>

                          <td className="py-3 px-3 text-neutral-600 font-medium">
                            {prod.category}
                          </td>

                          <td className="py-3 px-3 text-center">
                            <span className="font-extrabold text-neutral-900 px-2 py-0.5 rounded-lg bg-neutral-100">
                              {prod.unitsSold} {"pcs"}
                            </span>
                          </td>

                          <td className="py-3 px-3 font-extrabold text-neutral-900">
                            {formatBDT(prod.revenue)}
                          </td>

                          <td className="py-3 px-3">
                            <div className="w-32 space-y-1">
                              <div className="flex justify-between text-[10px] font-bold text-neutral-600">
                                <span>{sharePct}%</span>
                              </div>
                              <div className="w-full bg-neutral-100 rounded-full h-1.5 overflow-hidden">
                                <div
                                  className="bg-emerald-600 h-1.5 rounded-full"
                                  style={{ width: `${Math.min(sharePct, 100)}%` }}
                                />
                              </div>
                            </div>
                          </td>

                          <td className="py-3 px-3 text-right">
                            <span
                              className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${
                                prod.stock > 10
                                  ? "bg-emerald-50 text-emerald-700 border border-emerald-200"
                                  : prod.stock > 0
                                  ? "bg-amber-50 text-amber-700 border border-amber-200"
                                  : "bg-red-50 text-red-700 border border-red-200"
                              }`}
                            >
                              {prod.stock > 0
                                ? `${prod.stock} ${"in stock"}`
                                : "Out of stock"}
                            </span>
                          </td>
                        </tr>
                      );
                    })
                  )}
                </tbody>
              </table>
            </div>

            {/* Pagination Controls */}
            {totalPages > 1 && (
              <div className="p-4 border-t border-neutral-200 bg-white flex flex-wrap items-center justify-between gap-3 text-xs">
                <div className="text-neutral-500 font-medium">
                  {`Showing ${totalProductsCount > 0 ? startIndex + 1 : 0}-${endIndex} of ${totalProductsCount} products`}
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
                          type="button"
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
        </div>

        {/* Modal Footer */}
        <div className="p-4 px-6 border-t border-neutral-200 bg-neutral-50/70 flex flex-wrap items-center justify-between gap-3 text-xs text-neutral-500">
          <div className="flex items-center gap-2">
            <CheckCircle2 className="w-4 h-4 text-emerald-600" />
            <span>
              {"Data dynamically synchronized with live orders & analytics engine"}
            </span>
          </div>
          <button
            onClick={onClose}
            className="px-5 py-2 bg-neutral-900 hover:bg-black text-white rounded-xl font-bold transition-colors cursor-pointer"
          >
            {"Done / Close"}
          </button>
        </div>
      </div>
    </div>
  );
};

export { PopupGraph };
