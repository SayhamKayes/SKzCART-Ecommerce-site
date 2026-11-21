import React from "react";
import {
  ShieldCheck,
  Truck,
  RotateCcw,
  CheckCircle2,
  Lock,
  Sparkles,
  Zap,
  Package,
  Award,
  Clock,
  PhoneCall,
} from "lucide-react";
import { DEFAULT_THEME_CONFIG } from "../components/frontPanel/defaultThemeConfig";

export const TRUST_BADGE_ICON_OPTIONS = [
  { id: "shield", label: "Shield Verified", Icon: ShieldCheck },
  { id: "truck", label: "Delivery Truck", Icon: Truck },
  { id: "rotate", label: "Return / Warranty", Icon: RotateCcw },
  { id: "check", label: "Checkmark", Icon: CheckCircle2 },
  { id: "lock", label: "Security Lock", Icon: Lock },
  { id: "sparkles", label: "Original Sparkles", Icon: Sparkles },
  { id: "zap", label: "Fast Dispatch", Icon: Zap },
  { id: "package", label: "Parcel Inspect", Icon: Package },
  { id: "award", label: "Quality Award", Icon: Award },
  { id: "clock", label: "Fast Time", Icon: Clock },
  { id: "phone", label: "Support Call", Icon: PhoneCall },
];

export const TRUST_BADGE_COLOR_OPTIONS = [
  { id: "emerald", label: "Emerald Green", className: "text-emerald-600" },
  { id: "amber", label: "Amber Gold", className: "text-amber-600" },
  { id: "blue", label: "Trust Blue", className: "text-blue-600" },
  { id: "rose", label: "Rose Red", className: "text-rose-600" },
  { id: "neutral", label: "Charcoal Dark", className: "text-neutral-700" },
];

export const EDITORIAL_CARD_ICON_PRESETS = [
  "🚚", "🔒", "📦", "💬", "🛡️", "✅", "⚡", "🔄", "💳", "⭐", "🎁", "📞", "🏠", "🕒"
];

/**
 * Renders either a known Lucide icon token or a custom emoji/character icon.
 */
export function renderTrustBadgeIcon(iconKey, colorKey = "emerald", sizeClass = "w-4 h-4") {
  const colorMeta =
    TRUST_BADGE_COLOR_OPTIONS.find((c) => c.id === colorKey) ||
    TRUST_BADGE_COLOR_OPTIONS[0];
  const iconMeta = TRUST_BADGE_ICON_OPTIONS.find((item) => item.id === iconKey);
  if (iconMeta) {
    const IconComp = iconMeta.Icon;
    return <IconComp className={`${sizeClass} ${colorMeta.className} shrink-0`} aria-hidden="true" />;
  }
  if (iconKey && typeof iconKey === "string") {
    return (
      <span className={`inline-flex items-center justify-center leading-none shrink-0 text-sm ${colorMeta.className}`} aria-hidden="true">
        {iconKey}
      </span>
    );
  }
  return <ShieldCheck className={`${sizeClass} ${colorMeta.className} shrink-0`} aria-hidden="true" />;
}

/**
 * Resolves the active Product Editorial configuration from themeConfig with clean defaults.
 */
export function resolveEditorialConfig(themeConfig) {
  const defaults = DEFAULT_THEME_CONFIG.productPage || {};
  const raw = themeConfig?.productPage || {};
  return {
    ...defaults,
    ...raw,
    editorialCards: Array.isArray(raw.editorialCards)
      ? raw.editorialCards
      : defaults.editorialCards || [],
    checkoutFields: Array.isArray(raw.checkoutFields)
      ? raw.checkoutFields
      : defaults.checkoutFields || [],
    trustBadges: Array.isArray(raw.trustBadges)
      ? raw.trustBadges
      : defaults.trustBadges || [],
    deliveryZones: Array.isArray(raw.deliveryZones)
      ? raw.deliveryZones
      : defaults.deliveryZones || [],
  };
}

/**
 * Dynamically resolves WooCommerce-style delivery zone, base cost, and effective fee
 * (with optional Free Shipping minimum order threshold) from Product Editorial settings.
 */
export function resolveDeliveryCost(district = "", subtotal = 0, editorialOrTheme = null) {
  const source =
    editorialOrTheme && Array.isArray(editorialOrTheme.deliveryZones)
      ? editorialOrTheme
      : resolveEditorialConfig(editorialOrTheme);

  const zones = Array.isArray(source.deliveryZones) ? source.deliveryZones : [];
  const enabledZones = zones.filter((z) => z && z.enabled !== false);
  const normDistrict = String(district || "").trim().toLowerCase();
  const orderSubtotal = Number(subtotal || 0);

  let matchedZone = null;

  // Pass 1: Match explicit district zones (non-fallback)
  for (const z of enabledZones) {
    if (z.isDefaultFallback) continue;
    const list = Array.isArray(z.districts)
      ? z.districts.map((d) => String(d || "").trim().toLowerCase()).filter(Boolean)
      : [];
    if (normDistrict && list.includes(normDistrict)) {
      matchedZone = z;
      break;
    }
  }

  // Pass 2: Fallback / Rest of Bangladesh zone
  if (!matchedZone) {
    for (const z of enabledZones) {
      const list = Array.isArray(z.districts)
        ? z.districts.map((d) => String(d || "").trim().toLowerCase()).filter(Boolean)
        : [];
      if (z.isDefaultFallback || list.length === 0) {
        matchedZone = z;
        break;
      }
    }
  }

  if (!matchedZone) {
    return {
      fee: 0,
      baseCost: 0,
      isFreeShipping: true,
      freeShippingMinOrder: 0,
      zoneName: "Free Delivery",
      zoneKey: "free",
      estimatedDays: "",
      matchedZone: null,
    };
  }

  const baseCost = Math.max(0, Math.round(Number(matchedZone.cost || 0)));
  const freeMin = Math.max(0, Number(matchedZone.freeShippingMinOrder || 0));
  const isFreeShipping = baseCost === 0 || (freeMin > 0 && orderSubtotal >= freeMin);
  const effectiveFee = isFreeShipping ? 0 : baseCost;

  return {
    fee: effectiveFee,
    baseCost,
    isFreeShipping,
    freeShippingMinOrder: freeMin,
    zoneName: matchedZone.name || "Standard Delivery",
    zoneKey: matchedZone.zoneKey || matchedZone.id || "custom_zone",
    estimatedDays: matchedZone.estimatedDays || "",
    matchedZone,
  };
}

/**
 * Replaces dynamic tokens like {{hotline}} inside editorial card descriptions.
 */
export function formatEditorialCardText(text, themeConfig) {
  const str = typeof text === "string" ? text : "";
  const hotline =
    themeConfig?.shop?.whatsappNumber ||
    themeConfig?.shop?.hotline ||
    "09612345678";
  return str.replace(/\{\{\s*hotline\s*\}\}/gi, hotline);
}

