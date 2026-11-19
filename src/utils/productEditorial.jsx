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

