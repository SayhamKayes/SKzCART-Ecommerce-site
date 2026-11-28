/**
 * Pure date-range and multi-granularity time-series helpers for Admin Analytics.
 */

export const TIMEFRAME_OPTIONS = [
  { key: "7d", label: "7 Days" },
  { key: "14d", label: "14 Days" },
  { key: "30d", label: "30 Days" },
  { key: "6m", label: "6 Months" },
  { key: "1y", label: "1 Year" },
  { key: "custom", label: "Custom" },
  { key: "all", label: "All Time" },
];

export const POPUP_TIMEFRAME_OPTIONS = [
  { key: "7d", label: "Last 7 Days" },
  { key: "30d", label: "Monthly" },
  { key: "3m", label: "3 Months" },
  { key: "6m", label: "6 Months" },
  { key: "1y", label: "Yearly" },
  { key: "custom", label: "Custom" },
  { key: "all", label: "All Time" },
];

export const isSettledOrderEarning = (order) => {
  const status = String(order?.status || "").toUpperCase();
  const payStatus = String(order?.paymentStatus || "").toUpperCase();
  return payStatus === "PAID" || status === "DELIVERED";
};

export const getOrderNetEarning = (order) => {
  const total = Number(order?.total || 0);
  const deliveryFee = Number(order?.deliveryFee || 0);
  return Math.max(0, total - deliveryFee);
};

const pad2 = (n) => String(n).padStart(2, "0");

/**
 * Formats a Date into local YYYY-MM-DD without UTC midnight shift.
 */
export const toLocalISODate = (date) => {
  const d = date instanceof Date ? date : new Date(date);
  if (Number.isNaN(d.getTime())) return "";
  return `${d.getFullYear()}-${pad2(d.getMonth() + 1)}-${pad2(d.getDate())}`;
};

/**
 * Parses a YYYY-MM-DD string into a local Date at 00:00:00.
 */
export const parseLocalISODate = (iso) => {
  if (typeof iso !== "string") return null;
  const match = /^(\d{4})-(\d{2})-(\d{2})$/.exec(iso.trim());
  if (!match) return null;
  const year = Number(match[1]);
  const month = Number(match[2]);
  const day = Number(match[3]);
  const dt = new Date(year, month - 1, day);
  if (
    dt.getFullYear() !== year ||
    dt.getMonth() !== month - 1 ||
    dt.getDate() !== day
  ) {
    return null;
  }
  return dt;
};

/**
 * Extracts local YYYY-MM-DD from either a date-only string or full ISO timestamp.
 */
export const extractLocalISODate = (raw) => {
  if (!raw) return "";
  const str = String(raw).trim();
  if (/^\d{4}-\d{2}-\d{2}$/.test(str)) {
    return parseLocalISODate(str) ? str : "";
  }
  const normalized = /^\d{4}-\d{2}-\d{2}\s+\d{2}:/.test(str) ? str.replace(/\s+/, "T") : str;
  const dt = new Date(normalized);
  return Number.isNaN(dt.getTime()) ? "" : toLocalISODate(dt);
};

export const addDaysLocal = (date, deltaDays) => {
  const d = new Date(date.getFullYear(), date.getMonth(), date.getDate() + deltaDays);
  return d;
};

export const getDefaultCustomRange = (now = new Date()) => {
  const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  return {
    start: toLocalISODate(addDaysLocal(today, -29)),
    end: toLocalISODate(today),
  };
};

const formatShortDay = (d) =>
  `${d.getDate()} ${d.toLocaleString("en-US", { month: "short" })}`;

const formatShortMonth = (d) =>
  `${d.toLocaleString("en-US", { month: "short" })} '${String(d.getFullYear()).slice(-2)}`;

const getWeekStartLocal = (d) => {
  const day = d.getDay(); // 0=Sun..6=Sat
  const diff = day === 0 ? -6 : 1 - day; // Monday start
  return addDaysLocal(d, diff);
};

const pickGranularity = (timeframeKey, daySpan) => {
  if (timeframeKey === "3m" || timeframeKey === "6m" || timeframeKey === "1y") return "monthly";
  if (daySpan > 150) return "monthly";
  if (daySpan > 45) return "weekly";
  return "daily";
};

/**
 * Resolves inclusive local YYYY-MM-DD bounds, granularity, and human label for a timeframe.
 */
export const resolveAnalyticsBounds = (
  timeframeKey = "30d",
  customStart = "",
  customEnd = "",
  orders = [],
  transactions = [],
  now = new Date()
) => {
  const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  const todayISO = toLocalISODate(today);

  let startDate = addDaysLocal(today, -29);
  let endDate = today;

  if (timeframeKey === "7d") {
    startDate = addDaysLocal(today, -6);
  } else if (timeframeKey === "14d") {
    startDate = addDaysLocal(today, -13);
  } else if (timeframeKey === "30d") {
    startDate = addDaysLocal(today, -29);
  } else if (timeframeKey === "3m") {
    startDate = new Date(today.getFullYear(), today.getMonth() - 2, 1);
  } else if (timeframeKey === "6m") {
    startDate = new Date(today.getFullYear(), today.getMonth() - 5, 1);
  } else if (timeframeKey === "1y") {
    startDate = new Date(today.getFullYear(), today.getMonth() - 11, 1);
  } else if (timeframeKey === "custom") {
    const parsedStart = parseLocalISODate(customStart);
    const parsedEnd = parseLocalISODate(customEnd);
    if (parsedStart && parsedEnd) {
      if (parsedStart.getTime() <= parsedEnd.getTime()) {
        startDate = parsedStart;
        endDate = parsedEnd;
      } else {
        startDate = parsedEnd;
        endDate = parsedStart;
      }
    } else if (parsedStart) {
      startDate = parsedStart;
      endDate = parsedStart > today ? parsedStart : today;
    } else if (parsedEnd) {
      startDate = addDaysLocal(parsedEnd, -29);
      endDate = parsedEnd;
    }
  } else if (timeframeKey === "all") {
    let minISO = "";
    let maxISO = "";
    const inspect = (raw) => {
      const iso = extractLocalISODate(raw);
      if (!iso) return;
      if (!minISO || iso < minISO) minISO = iso;
      if (!maxISO || iso > maxISO) maxISO = iso;
    };
    for (const o of orders) inspect(o?.createdAt);
    for (const t of transactions) inspect(t?.created_at);

    if (minISO) {
      const minDt = parseLocalISODate(minISO);
      const maxDt = parseLocalISODate(maxISO);
      if (minDt) startDate = minDt;
      if (maxDt && maxDt > today) endDate = maxDt;
      // Ensure All Time spans at least up to today so single-day datasets still have clean bounds
      if (startDate.getTime() === endDate.getTime()) {
        startDate = addDaysLocal(endDate, -6);
      }
    }
  }

  const startISO = toLocalISODate(startDate);
  const endISO = toLocalISODate(endDate);
  const daySpan = Math.max(
    1,
    Math.round((endDate.getTime() - startDate.getTime()) / 86400000) + 1
  );
  const granularity = pickGranularity(timeframeKey, daySpan);

  const granLabel =
    granularity === "monthly" ? "Monthly" : granularity === "weekly" ? "Weekly" : "Daily";
  const rangeLabel = `${formatShortDay(startDate)} – ${formatShortDay(endDate)} (${granLabel})`;

  return {
    startISO,
    endISO,
    daySpan,
    granularity,
    rangeLabel,
    todayISO,
  };
};

export const isWithinISORange = (iso, startISO, endISO) =>
  Boolean(iso) && iso >= startISO && iso <= endISO;

/**
 * Aggregates scoped orders into continuous daily, weekly, or monthly buckets.
 */
export const buildAnalyticsSeries = (scopedOrders = [], bounds) => {
  const startDate = parseLocalISODate(bounds?.startISO);
  const endDate = parseLocalISODate(bounds?.endISO);
  if (!startDate || !endDate || startDate > endDate) return [];

  const granularity = bounds.granularity || "daily";
  const buckets = new Map();

  if (granularity === "monthly") {
    let cursor = new Date(startDate.getFullYear(), startDate.getMonth(), 1);
    const endMonth = new Date(endDate.getFullYear(), endDate.getMonth(), 1);
    while (cursor <= endMonth) {
      const key = `${cursor.getFullYear()}-${pad2(cursor.getMonth() + 1)}`;
      buckets.set(key, {
        key,
        date: key,
        label: formatShortMonth(cursor),
        fullLabel: cursor.toLocaleString("en-US", { month: "long", year: "numeric" }),
        earnings: 0,
        orders: 0,
        pending: 0,
        inTransit: 0,
        confirmed: 0,
      });
      cursor = new Date(cursor.getFullYear(), cursor.getMonth() + 1, 1);
    }
  } else if (granularity === "weekly") {
    let cursor = getWeekStartLocal(startDate);
    while (cursor <= endDate) {
      const key = toLocalISODate(cursor);
      const weekEnd = addDaysLocal(cursor, 6);
      buckets.set(key, {
        key,
        date: key,
        label: `Wk ${formatShortDay(cursor)}`,
        fullLabel: `${formatShortDay(cursor)} – ${formatShortDay(weekEnd)}`,
        earnings: 0,
        orders: 0,
        pending: 0,
        inTransit: 0,
        confirmed: 0,
      });
      cursor = addDaysLocal(cursor, 7);
    }
  } else {
    let cursor = startDate;
    while (cursor <= endDate) {
      const key = toLocalISODate(cursor);
      buckets.set(key, {
        key,
        date: key,
        label: formatShortDay(cursor),
        fullLabel: `${formatShortDay(cursor)}, ${cursor.getFullYear()}`,
        earnings: 0,
        orders: 0,
        pending: 0,
        inTransit: 0,
        confirmed: 0,
      });
      cursor = addDaysLocal(cursor, 1);
    }
  }

  for (const o of scopedOrders) {
    const iso = extractLocalISODate(o?.createdAt);
    if (!iso) continue;
    let bucketKey = iso;
    if (granularity === "monthly") {
      bucketKey = iso.slice(0, 7);
    } else if (granularity === "weekly") {
      const dt = parseLocalISODate(iso);
      if (!dt) continue;
      bucketKey = toLocalISODate(getWeekStartLocal(dt));
    }

    const bucket = buckets.get(bucketKey);
    if (!bucket) continue;

    const status = String(o.status || "").toUpperCase();
    const payStatus = String(o.paymentStatus || "").toUpperCase();
    bucket.orders += 1;
    if (isSettledOrderEarning(o)) {
      bucket.earnings += getOrderNetEarning(o);
    }
    if (status === "PENDING") bucket.pending += 1;
    if (status === "CONFIRMED") bucket.confirmed += 1;
    if (["COURIER_CREATED", "PICKED_UP", "IN_TRANSIT", "OUT_FOR_DELIVERY"].includes(status)) {
      bucket.inTransit += 1;
    }
  }

  return Array.from(buckets.values());
};

