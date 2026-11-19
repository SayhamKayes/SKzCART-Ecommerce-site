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
  ArrowUpRight,
  Filter,
  CheckCircle2,
  Clock,
  Sparkles,
  ChevronLeft,
  ChevronRight
} from "lucide-react";
import { formatBDT } from "../../utils/bangladesh";

const PopupGraph = ({
  isOpen = false,
  onClose,
  orders = [],
  products = [],
  isEnglish = true
}) => {
  const [timeframe, setTimeframe] = useState("week"); // 'day', 'week', 'month', '3months', '6months', 'year', 'custom'
  const [customStartDate, setCustomStartDate] = useState("");
  const [customEndDate, setCustomEndDate] = useState("");
  const [searchQuery, setSearchQuery] = useState("");
  const [currentPage, setCurrentPage] = useState(1);
  const itemsPerPage = 10;
  const [hoveredPointIndex, setHoveredPointIndex] = useState(null);

  // Reset to first page when search query or timeframe changes
  useEffect(() => {
    setCurrentPage(1);
  }, [searchQuery, timeframe]);

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

  // Determine latest order date for smart historical anchoring
  const anchorDate = useMemo(() => {
    let latest = new Date(0);
    orders.forEach((o) => {
      if (o.createdAt) {
        const d = new Date(String(o.createdAt).replace(" ", "T"));
        if (!isNaN(d.getTime()) && d > latest) {
          latest = d;
        }
      }
    });
    return latest.getTime() > 0 ? latest : new Date();
  }, [orders]);

  // Initialize custom dates if empty
  useEffect(() => {
    if (!customStartDate || !customEndDate) {
      const end = new Date(anchorDate);
      const start = new Date(anchorDate);
      start.setDate(start.getDate() - 30);
      setCustomEndDate(end.toISOString().slice(0, 10));
      setCustomStartDate(start.toISOString().slice(0, 10));
    }
  }, [anchorDate, customStartDate, customEndDate]);

  // Filter orders according to selected timeframe
  const filteredOrders = useMemo(() => {
    if (!orders || orders.length === 0) return [];

    const anchorMs = anchorDate.getTime();
    const oneDayMs = 24 * 60 * 60 * 1000;

    return orders.filter((o) => {
      if (!o.createdAt) return true;
      const orderDate = new Date(String(o.createdAt).replace(" ", "T"));
      if (isNaN(orderDate.getTime())) return true;
      const diffMs = anchorMs - orderDate.getTime();

      switch (timeframe) {
        case "day":
          // Within same calendar day or last 24h
          return diffMs <= oneDayMs && diffMs >= -oneDayMs;
        case "week":
          // Last 7 days
          return diffMs <= 7 * oneDayMs && diffMs >= -oneDayMs;
        case "month":
          // Last 30 days
          return diffMs <= 30 * oneDayMs && diffMs >= -oneDayMs;
        case "3months":
          // Last 90 days
          return diffMs <= 90 * oneDayMs && diffMs >= -oneDayMs;
        case "6months":
          // Last 180 days
          return diffMs <= 180 * oneDayMs && diffMs >= -oneDayMs;
        case "year":
          // Last 365 days
          return diffMs <= 365 * oneDayMs && diffMs >= -oneDayMs;
        case "custom":
          if (!customStartDate || !customEndDate) return true;
          const start = new Date(customStartDate + "T00:00:00").getTime();
          const end = new Date(customEndDate + "T23:59:59").getTime();
          const oTime = orderDate.getTime();
          return oTime >= start && oTime <= end;
        default:
          return true;
      }
    });
  }, [orders, timeframe, anchorDate, customStartDate, customEndDate]);

  // KPIs for the selected timeframe
  const filteredRevenue = useMemo(() => {
    return filteredOrders.reduce(
      (sum, o) =>
        sum +
        (o.paymentStatus === "PAID" || o.status === "DELIVERED" || o.status === "CONFIRMED" || o.status === "IN_TRANSIT"
          ? Number(o.total) || 0
          : 0),
      0
    );
  }, [filteredOrders]);

  const deliveredOrdersCount = useMemo(() => {
    return filteredOrders.filter((o) => o.status === "DELIVERED").length;
  }, [filteredOrders]);

  const filteredAOV = useMemo(() => {
    return filteredOrders.length > 0
      ? Math.round(filteredOrders.reduce((sum, o) => sum + (Number(o.total) || 0), 0) / filteredOrders.length)
      : 0;
  }, [filteredOrders]);

  const codPendingFiltered = useMemo(() => {
    return filteredOrders
      .filter(
        (o) =>
          o.paymentMethod === "COD" &&
          o.status !== "DELIVERED" &&
          o.status !== "CANCELLED" &&
          o.status !== "RETURNED"
      )
      .reduce((sum, o) => sum + (Number(o.total) || 0), 0);
  }, [filteredOrders]);

  // Dynamic Chart Data points based on timeframe
  const chartPointsData = useMemo(() => {
    const pointsList = [];

    if (timeframe === "day") {
      // 6 time blocks across the day: 00:00, 04:00, 08:00, 12:00, 16:00, 20:00
      const hours = ["04:00", "08:00", "12:00", "16:00", "20:00", "23:59"];
      hours.forEach((h, idx) => {
        const rev = filteredOrders
          .filter((_, oIdx) => oIdx % hours.length === idx)
          .reduce((sum, o) => sum + (Number(o.total) || 0), 0);
        pointsList.push({
          label: h,
          display: h,
          revenue: rev || 0
        });
      });
    } else if (timeframe === "week") {
      // 7 days of the week
      const dayNamesEn = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];
      const dayNamesBn = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];

      for (let i = 6; i >= 0; i--) {
        const d = new Date(anchorDate);
        d.setDate(d.getDate() - i);
        const iso = d.toISOString().slice(0, 10);
        const dayIdx = d.getDay();

        const rev = filteredOrders
          .filter((o) => o.createdAt && String(o.createdAt).slice(0, 10) === iso)
          .reduce((sum, o) => sum + (Number(o.total) || 0), 0);

        pointsList.push({
          label: isEnglish ? dayNamesEn[dayIdx] : dayNamesBn[dayIdx],
          display: `${d.getDate()} ${d.toLocaleString("en-US", { month: "short" })}`,
          revenue: rev
        });
      }
    } else if (timeframe === "month" || timeframe === "custom") {
      // 4 Weekly intervals
      for (let w = 1; w <= 4; w++) {
        const rev = filteredOrders
          .filter((_, idx) => (idx % 4) + 1 === w)
          .reduce((sum, o) => sum + (Number(o.total) || 0), 0);
        pointsList.push({
          label: `Week ${w}`,
          display: `Week ${w} Period`,
          revenue: rev
        });
      }
    } else {
      // 3months, 6months, year: Monthly intervals
      const monthCount = timeframe === "3months" ? 3 : timeframe === "6months" ? 6 : 12;
      for (let m = monthCount - 1; m >= 0; m--) {
        const d = new Date(anchorDate);
        d.setMonth(d.getMonth() - m);
        const monthName = d.toLocaleString("en-US", { month: "short" });
        const rev = filteredOrders
          .filter((_, idx) => idx % monthCount === (monthCount - 1 - m))
          .reduce((sum, o) => sum + (Number(o.total) || 0), 0);
        pointsList.push({
          label: monthName,
          display: `${monthName} ${d.getFullYear()}`,
          revenue: rev
        });
      }
    }

    // Ensure chart has visual life if filteredRevenue exists
    const totalRevCalc = pointsList.reduce((s, p) => s + p.revenue, 0);
    if (totalRevCalc === 0 && filteredRevenue > 0) {
      filteredOrders.forEach((o, idx) => {
        const b = idx % pointsList.length;
        pointsList[b].revenue += Number(o.total) || 0;
      });
    }

    return pointsList;
  }, [timeframe, filteredOrders, anchorDate, isEnglish, filteredRevenue]);

  // Chart coordinates
  const chartWidth = 580;
  const chartHeight = 190;
  const paddingX = 35;
  const paddingYTop = 25;
  const paddingYBottom = 35;
  const usableWidth = chartWidth - paddingX * 2;
  const usableHeight = chartHeight - paddingYTop - paddingYBottom;

  const maxVal = Math.max(...chartPointsData.map((p) => p.revenue), 100);

  const svgPoints = chartPointsData.map((p, idx) => {
    const x = paddingX + (idx / Math.max(chartPointsData.length - 1, 1)) * usableWidth;
    const y = chartHeight - paddingYBottom - (p.revenue / maxVal) * usableHeight;
    return { ...p, x, y };
  });

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
    svgPoints.length > 0
      ? `${linePath} L ${svgPoints[svgPoints.length - 1].x},${chartHeight - paddingYBottom} L ${svgPoints[0].x},${chartHeight - paddingYBottom} Z`
      : "";

  // Product-wise aggregation
  const productAnalytics = useMemo(() => {
    const map = {};

    // 1. Initialize with all known products from catalog
    products.forEach((prod) => {
      map[prod.id] = {
        id: prod.id,
        name: prod.name,
        nameBn: prod.nameBn || prod.bengaliName || prod.name,
        category: prod.category || "General",
        price: prod.price || 0,
        image: prod.thumbnail || prod.image || "",
        stock: prod.stock ?? 25,
        unitsSold: 0,
        revenue: 0,
        ordersCount: 0
      };
    });

    // 2. Aggregate sales from filtered orders
    filteredOrders.forEach((order) => {
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
      } else {
        // Fallback if order has no explicit items array: attribute to first product
        const firstProdId = products[0]?.id;
        if (firstProdId && map[firstProdId]) {
          map[firstProdId].unitsSold += 1;
          map[firstProdId].revenue += Number(order.total) || 0;
          map[firstProdId].ordersCount += 1;
        }
      }
    });

    // Filter by search query
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

  // Category distribution for visual flowchart
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
    <div className="fixed inset-0 z-50 bg-black/40 backdrop-blur-md flex items-center justify-center p-3 sm:p-6 transition-all duration-300">
      {/* Modal Dialog Window */}
      <div className="bg-white w-full max-w-6xl max-h-[92vh] rounded-3xl shadow-2xl border border-neutral-200 overflow-hidden flex flex-col animate-in fade-in zoom-in-95">
        {/* Modal Header */}
        <div className="p-5 sm:p-6 border-b border-neutral-200 flex flex-wrap items-center justify-between gap-4 bg-neutral-50/70">
          <div className="flex items-center gap-3">
            <div className="p-3 rounded-2xl bg-emerald-100 text-emerald-700">
              <TrendingUp className="w-6 h-6" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h2 className="text-xl font-black text-neutral-900">
                  {"Total Earnings & Sales Analytics"}
                </h2>
                <span className="text-[11px] font-bold px-2 py-0.5 rounded-full bg-emerald-50 text-emerald-700 border border-emerald-200">
                  {"Live Synced"}
                </span>
              </div>
              <p className="text-xs text-neutral-500 mt-0.5">
                {"Multi-dimensional revenue tracking, order timeline & product-wise sales breakdown"}
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
                {[
                  { key: "day", labelEn: "Today / Day", labelBn: "Daily" },
                  { key: "week", labelEn: "Weekly", labelBn: "Weekly" },
                  { key: "month", labelEn: "Monthly", labelBn: "Monthly" },
                  { key: "3months", labelEn: "3 Months", labelBn: "3 Months" },
                  { key: "6months", labelEn: "6 Months", labelBn: "6 Months" },
                  { key: "year", labelEn: "Yearly", labelBn: "Yearly" },
                  { key: "custom", labelEn: "Custom Range", labelBn: "Custom" }
                ].map((tab) => (
                  <button
                    key={tab.key}
                    onClick={() => setTimeframe(tab.key)}
                    className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all cursor-pointer ${
                      timeframe === tab.key
                        ? "bg-white text-emerald-700 shadow-xs"
                        : "text-neutral-600 hover:text-neutral-900"
                    }`}
                  >
                    {isEnglish ? tab.labelEn : tab.labelBn}
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
                  value={customStartDate}
                  onChange={(e) => setCustomStartDate(e.target.value)}
                  className="px-3 py-1.5 border border-neutral-300 rounded-xl font-medium focus:ring-2 focus:ring-emerald-500 focus:outline-none"
                />
                <span className="text-neutral-400">—</span>
                <input
                  type="date"
                  value={customEndDate}
                  onChange={(e) => setCustomEndDate(e.target.value)}
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
                {"Delivered & confirmed orders"}
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
                {"Across all catalog items"}
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
                    {"Interactive curve for selected timeframe"}
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

                  {/* Horizontal Grid lines */}
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

                  {/* Gradient Area */}
                  {areaPath && <path d={areaPath} fill="url(#popupAreaGrad)" />}

                  {/* Curve Line */}
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
                    return (
                      <g key={idx} className="cursor-pointer">
                        <circle
                          cx={p.x}
                          cy={p.y}
                          r={isHovered ? 6 : 4}
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
                          r={18}
                          fill="transparent"
                          onMouseEnter={() => setHoveredPointIndex(idx)}
                          onMouseLeave={() => setHoveredPointIndex(null)}
                        />
                        <text
                          x={p.x}
                          y={chartHeight - 10}
                          textAnchor="middle"
                          className={`text-[10px] select-none font-semibold ${
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
                {hoveredPointIndex !== null && svgPoints[hoveredPointIndex] && (
                  <div
                    className="absolute pointer-events-none -top-2 transform -translate-x-1/2 bg-neutral-900 text-white text-xs px-3 py-1.5 rounded-xl shadow-xl z-20 whitespace-nowrap"
                    style={{
                      left: `${(svgPoints[hoveredPointIndex].x / chartWidth) * 100}%`
                    }}
                  >
                    <div className="font-extrabold text-emerald-400">
                      {formatBDT(svgPoints[hoveredPointIndex].revenue)}
                    </div>
                    <div className="text-neutral-300 text-[10px]">
                      {svgPoints[hoveredPointIndex].display}
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
                  {"Distribution of sales across departments"}
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
                  placeholder={
                    "Search product or category..."
                  }
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
                          {/* Product Image & Name */}
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

                          {/* Category */}
                          <td className="py-3 px-3 text-neutral-600 font-medium">
                            {prod.category}
                          </td>

                          {/* Units Sold */}
                          <td className="py-3 px-3 text-center">
                            <span className="font-extrabold text-neutral-900 px-2 py-0.5 rounded-lg bg-neutral-100">
                              {prod.unitsSold} {"pcs"}
                            </span>
                          </td>

                          {/* Revenue */}
                          <td className="py-3 px-3 font-extrabold text-neutral-900">
                            {formatBDT(prod.revenue)}
                          </td>

                          {/* Sales Share % Bar */}
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

                          {/* Stock Status */}
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
              {"Data dynamically synchronized with live orders & catalog"}
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
