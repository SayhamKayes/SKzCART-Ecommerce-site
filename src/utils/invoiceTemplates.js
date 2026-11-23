import { formatBDTDateTime } from "./bangladesh";
import { DEFAULT_THEME_CONFIG } from "../components/frontPanel/defaultThemeConfig";

export const INVOICE_TEMPLATES = [
  {
    id: "classic-emerald",
    name: "1. Classic Executive",
    subtitle: "Clean Emerald Standard",
    previewBg: "#ffffff",
    previewAccent: "#065f46",
    layout: "classic",
  },
  {
    id: "modern-slate",
    name: "2. Modern Slate Pro",
    subtitle: "Dark Header Architectural",
    previewBg: "#0f172a",
    previewAccent: "#38bdf8",
    layout: "banner-dark",
  },
  {
    id: "minimal-mono",
    name: "3. Swiss Minimal Mono",
    subtitle: "Editorial Hairline B&W",
    previewBg: "#fafafa",
    previewAccent: "#171717",
    layout: "minimal",
  },
  {
    id: "royal-navy",
    name: "4. Royal Navy Gold",
    subtitle: "Corporate Executive Seal",
    previewBg: "#1e293b",
    previewAccent: "#d97706",
    layout: "navy-gold",
  },
  {
    id: "teal-commerce",
    name: "5. Teal Commerce Wave",
    subtitle: "Gradient Banner + KPI Bar",
    previewBg: "#0d9488",
    previewAccent: "#0f766e",
    layout: "gradient-kpi",
  },
  {
    id: "boutique-warm",
    name: "6. Warm Luxury Boutique",
    subtitle: "Soft Cream & Amber Trim",
    previewBg: "#fffbeb",
    previewAccent: "#b45309",
    layout: "boutique",
  },
  {
    id: "cyber-indigo",
    name: "7. Indigo SaaS Grid",
    subtitle: "Crisp Rounded Info Cards",
    previewBg: "#312e81",
    previewAccent: "#4f46e5",
    layout: "indigo-grid",
  },
  {
    id: "compact-thermal",
    name: "8. Express Dispatch Slip",
    subtitle: "Tight High-Clarity Memo",
    previewBg: "#f4f4f5",
    previewAccent: "#18181b",
    layout: "compact",
  },
  {
    id: "sidebar-stripe",
    name: "9. Left Accent Stripe",
    subtitle: "Vertical Brand Bar Margin",
    previewBg: "#ffffff",
    previewAccent: "#be123c",
    layout: "left-stripe",
  },
  {
    id: "formal-ledger",
    name: "10. Formal Boxed Ledger",
    subtitle: "Structured Grid Accounting",
    previewBg: "#f8fafc",
    previewAccent: "#1e40af",
    layout: "boxed-ledger",
  },
];

export function resolveInvoiceConfig(themeConfig) {
  const defaults = DEFAULT_THEME_CONFIG.invoiceConfig || {};
  const raw = themeConfig?.invoiceConfig || {};
  return {
    ...defaults,
    ...raw,
    orderOverrides:
      raw.orderOverrides && typeof raw.orderOverrides === "object"
        ? raw.orderOverrides
        : {},
  };
}

/**
 * Generates an Invoice ID separate from Order ID using the configured prefix and starting number.
 * Uses chronological order sequence unless an explicit per-order override exists.
 */
export function resolveInvoiceNumber(order, orders = [], invoiceConfig = {}) {
  if (!order) return "";
  const cfg = invoiceConfig || {};
  const overrides = cfg.orderOverrides && typeof cfg.orderOverrides === "object" ? cfg.orderOverrides : {};
  if (overrides[order.id]?.invoiceNumber) {
    return String(overrides[order.id].invoiceNumber).trim();
  }

  const prefix = cfg.invoicePrefix !== undefined ? String(cfg.invoicePrefix) : "INV-";
  const startNum = Math.max(1, parseInt(cfg.invoiceStartNumber, 10) || 1001);

  if (Array.isArray(orders) && orders.length > 0) {
    const sorted = [...orders].sort((a, b) => {
      const ta = new Date(a?.createdAt || 0).getTime() || 0;
      const tb = new Date(b?.createdAt || 0).getTime() || 0;
      if (ta !== tb) return ta - tb;
      return String(a?.id || "").localeCompare(String(b?.id || ""));
    });
    const idx = sorted.findIndex((o) => String(o?.id) === String(order.id));
    if (idx >= 0) {
      return `${prefix}${startNum + idx}`;
    }
  }

  return `${prefix}${startNum}`;
}

/**
 * Builds the editable invoice data object for a given customer order,
 * merging live order data with any saved per-order manual overrides.
 */
export function buildInitialInvoiceData(order, orders = [], themeConfig = {}) {
  if (!order) return null;
  const cfg = resolveInvoiceConfig(themeConfig);
  const savedOverride = (cfg.orderOverrides && cfg.orderOverrides[order.id]) || {};

  const addr = order.address && typeof order.address === "object" ? order.address : {};
  const defaultAddressLine = [addr.fullAddress, addr.thana, addr.district].filter(Boolean).join(", ");

  const defaultItems = Array.isArray(order.items)
    ? order.items.map((item, idx) => ({
        id: item.id || `item-${idx}`,
        name: item.name || "Product",
        variant: item.variant || "",
        sku: item.sku || "",
        price: Number(item.price || 0),
        quantity: Math.max(1, Number(item.quantity || 1)),
      }))
    : [];

  const items = Array.isArray(savedOverride.items) ? savedOverride.items : defaultItems;
  const computedSubtotal = items.reduce(
    (sum, it) => sum + (Number(it.price) || 0) * Math.max(1, Number(it.quantity) || 1),
    0
  );

  const subtotal =
    savedOverride.subtotal !== undefined ? Number(savedOverride.subtotal) : Number(order.subtotal ?? computedSubtotal);
  const deliveryFee =
    savedOverride.deliveryFee !== undefined ? Number(savedOverride.deliveryFee) : Number(order.deliveryFee || 0);
  const discount =
    savedOverride.discount !== undefined ? Number(savedOverride.discount) : Number(order.discount || 0);
  const total =
    savedOverride.total !== undefined
      ? Number(savedOverride.total)
      : Math.max(0, subtotal + deliveryFee - discount);

  return {
    orderId: order.id,
    invoiceNumber: resolveInvoiceNumber(order, orders, cfg),
    dateText: savedOverride.dateText || formatBDTDateTime(order.createdAt, true),
    customerName: savedOverride.customerName ?? (addr.customerName || "Customer"),
    customerPhone: savedOverride.customerPhone ?? (addr.phone || ""),
    customerEmail: savedOverride.customerEmail ?? (order.customerEmail || addr.email || ""),
    customerAddress: savedOverride.customerAddress ?? defaultAddressLine,
    district: savedOverride.district ?? (addr.district || ""),
    orderNote: savedOverride.orderNote ?? (addr.orderNote || ""),
    paymentMethod: savedOverride.paymentMethod ?? (order.paymentMethod || "COD"),
    paymentStatus: savedOverride.paymentStatus ?? (order.paymentStatus || "PENDING"),
    paymentTrxId: savedOverride.paymentTrxId ?? (addr.paymentTrxId || order.paymentTrxId || ""),
    courierProvider: savedOverride.courierProvider ?? (order.courier?.provider || ""),
    trackingId: savedOverride.trackingId ?? (order.courier?.trackingId || ""),
    items,
    subtotal,
    deliveryFee,
    discount,
    total,
  };
}

