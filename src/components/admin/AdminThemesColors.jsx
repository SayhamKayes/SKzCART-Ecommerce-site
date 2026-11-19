import React, { useState, useEffect } from "react";
import {
  Palette,
  Type,
  LayoutTemplate,
  ShoppingBag,
  MessageSquareHeart,
  FileBox,
  PanelBottom,
  RotateCcw,
  Save,
  CheckCircle2,
  Loader2,
  Sparkles,
  Truck,
  ShieldCheck,
  PhoneCall,
  MapPin,
  Search,
  User,
  Star,
  ArrowUp,
  Layers,
} from "lucide-react";
import { useThemeConfig } from "../frontPanel/FrontPanelContext";
import { DEFAULT_THEME_CONFIG } from "../frontPanel/defaultThemeConfig";
import {
  deepMerge,
  buildBgStyle,
  GOOGLE_FONT_OPTIONS,
  TYPOGRAPHY_TAGS,
  FONT_WEIGHT_OPTIONS,
  THEME_PRESETS,
  getFontStack,
} from "../../utils/themeHelper";

const SECTION_TABS = [
  { id: "globalTheme", label: "Global & Page Theme", icon: Sparkles },
  { id: "topHeader", label: "Top Header", icon: LayoutTemplate },
  { id: "mainHeader", label: "Main Header & Menu", icon: Layers },
  { id: "typography", label: "Fonts & Typography", icon: Type },
  { id: "productsReviews", label: "Products & Reviews", icon: ShoppingBag },
  { id: "productPage", label: "Product Page & Header", icon: FileBox },
  { id: "footerWidgets", label: "Footer & Widgets", icon: PanelBottom },
];

const GRADIENT_DIRECTIONS = [
  { value: "to right", label: "Left → Right" },
  { value: "to left", label: "Right → Left" },
  { value: "to bottom", label: "Top → Bottom" },
  { value: "135deg", label: "Diagonal (135°)" },
];

const ColorField = ({ label, value, onChange, allowEmpty = false, placeholder = "#000000" }) => {
  const safeHex =
    typeof value === "string" && /^#[0-9a-fA-F]{3,8}$/.test(value.trim())
      ? value.trim().slice(0, 7)
      : placeholder;

  return (
    <div className="space-y-1">
      <div className="flex items-center justify-between gap-2">
        <label className="text-[11px] font-bold text-neutral-700 truncate">{label}</label>
        {allowEmpty && value ? (
          <button
            type="button"
            onClick={() => onChange("")}
            className="text-[10px] font-semibold text-rose-600 hover:underline cursor-pointer"
          >
            Clear
          </button>
        ) : null}
      </div>
      <div className="flex items-center gap-2 bg-white border border-neutral-300 rounded-xl px-2.5 py-1.5 focus-within:border-emerald-500">
        <input
          type="color"
          value={safeHex}
          onChange={(e) => onChange(e.target.value)}
          className="w-7 h-7 rounded-lg border border-neutral-200 cursor-pointer shrink-0 bg-transparent p-0"
        />
        <input
          type="text"
          value={value || ""}
          onChange={(e) => onChange(e.target.value)}
          placeholder={allowEmpty ? "Inherit / Default" : placeholder}
          className="w-full text-xs font-mono text-neutral-800 bg-transparent focus:outline-none"
        />
      </div>
    </div>
  );
};

const BgModeControl = ({
  title = "Background Style",
  bgType = "solid",
  solidBg = "#ffffff",
  gradientFrom = "#ffffff",
  gradientVia = "",
  gradientTo = "#f0fdf4",
  gradientDirection = "to right",
  showVia = false,
  onPatch,
  fieldMap = {
    bgType: "bgType",
    solidBg: "solidBg",
    gradientFrom: "gradientFrom",
    gradientVia: "gradientVia",
    gradientTo: "gradientTo",
    gradientDirection: "gradientDirection",
  },
}) => (
  <div className="p-4 rounded-2xl bg-neutral-50 border border-neutral-200 space-y-4">
    <div className="flex flex-wrap items-center justify-between gap-3">
      <span className="text-xs font-extrabold uppercase tracking-wider text-neutral-800">{title}</span>
      <div className="inline-flex rounded-xl bg-white border border-neutral-200 p-1">
        {["solid", "gradient"].map((mode) => (
          <button
            key={mode}
            type="button"
            onClick={() => onPatch({ [fieldMap.bgType]: mode })}
            className={`px-3 py-1 rounded-lg text-xs font-bold capitalize transition-all cursor-pointer ${bgType === mode
                ? "bg-emerald-600 text-white shadow-xs"
                : "text-neutral-600 hover:text-neutral-900"
              }`}
          >
            {mode}
          </button>
        ))}
      </div>
    </div>

    {bgType === "gradient" ? (
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
        <ColorField
          label="Gradient Start"
          value={gradientFrom}
          onChange={(v) => onPatch({ [fieldMap.gradientFrom]: v })}
        />
        {showVia && fieldMap.gradientVia && (
          <ColorField
            label="Gradient Middle (Via)"
            value={gradientVia}
            allowEmpty
            onChange={(v) => onPatch({ [fieldMap.gradientVia]: v })}
          />
        )}
        <ColorField
          label="Gradient End"
          value={gradientTo}
          onChange={(v) => onPatch({ [fieldMap.gradientTo]: v })}
        />
        <div className="space-y-1">
          <label className="text-[11px] font-bold text-neutral-700 block">Direction</label>
          <select
            value={gradientDirection}
            onChange={(e) => onPatch({ [fieldMap.gradientDirection]: e.target.value })}
            className="w-full h-[38px] px-3 rounded-xl bg-white border border-neutral-300 text-xs font-semibold text-neutral-800 focus:outline-none focus:border-emerald-500"
          >
            {GRADIENT_DIRECTIONS.map((d) => (
              <option key={d.value} value={d.value}>
                {d.label}
              </option>
            ))}
          </select>
        </div>
      </div>
    ) : (
      <div className="max-w-xs">
        <ColorField
          label="Solid Background Color"
          value={solidBg}
          onChange={(v) => onPatch({ [fieldMap.solidBg]: v })}
        />
      </div>
    )}
  </div>
);

export const AdminThemesColors = () => {
  const { themeConfig, updateThemeConfig } = useThemeConfig();
  const [activeSubTab, setActiveSubTab] = useState("globalTheme");
  const [draft, setDraft] = useState(() =>
    deepMerge(DEFAULT_THEME_CONFIG.themesColors, themeConfig?.themesColors || {})
  );
  const [isSaving, setIsSaving] = useState(false);
  const [saveFeedback, setSaveFeedback] = useState(null);

  useEffect(() => {
    setDraft(deepMerge(DEFAULT_THEME_CONFIG.themesColors, themeConfig?.themesColors || {}));
  }, [themeConfig?.themesColors]);

  const updateSection = (sectionKey, patch) => {
    setDraft((prev) => ({
      ...prev,
      [sectionKey]: {
        ...(prev[sectionKey] || {}),
        ...patch,
      },
    }));
  };

  const updateTypographyTag = (tagKey, patch) => {
    setDraft((prev) => ({
      ...prev,
      typography: {
        ...(prev.typography || {}),
        [tagKey]: {
          ...((prev.typography && prev.typography[tagKey]) || {}),
          ...patch,
        },
      },
    }));
  };

  const persistDraft = async (nextState, successMsg = "Themes & Colors published to Central Database across all devices!") => {
    setIsSaving(true);
    setSaveFeedback(null);
    try {
      await updateThemeConfig("themesColors", nextState);
      setSaveFeedback({ type: "success", text: successMsg });
      setTimeout(() => setSaveFeedback(null), 4000);
    } catch (err) {
      console.error("Failed to save Themes & Colors:", err);
      setSaveFeedback({ type: "error", text: "Failed to save to database. Please retry." });
    } finally {
      setIsSaving(false);
    }
  };

  const handleApplyPreset = (preset) => {
    const base = deepMerge(DEFAULT_THEME_CONFIG.themesColors, preset.patch || {});
    base.activePreset = preset.id;
    setDraft(base);
    persistDraft(base, `Theme "${preset.name}" saved & synced live across all browsers!`);
  };

  const handleResetAll = () => {
    const resetCopy = deepMerge(DEFAULT_THEME_CONFIG.themesColors, {});
    setDraft(resetCopy);
    persistDraft(resetCopy, "Reset to Default Emerald Luxe theme across all devices!");
  };

  const topH = draft.topHeader || {};
  const mainH = draft.mainHeader || {};
  const globalT = draft.globalTheme || {};
  const typo = draft.typography || {};
  const prodCards = draft.productCards || {};
  const reviews = draft.reviews || {};
  const prodPage = draft.productPage || {};
  const footer = draft.footer || {};
  const widgets = draft.widgets || {};

  return (
    <div className="space-y-6 pb-12">
      {/* Header Bar */}
      <div className="bg-white rounded-3xl border border-neutral-200/80 shadow-xs p-5 sm:p-6 flex flex-col lg:flex-row lg:items-center justify-between gap-4">
        <div className="space-y-1">
          <div className="flex items-center gap-2.5">
            <div className="w-10 h-10 rounded-2xl bg-emerald-50 border border-emerald-200 flex items-center justify-center text-emerald-700">
              <Palette className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-lg sm:text-xl font-black text-neutral-900">
                Themes & Colors Studio
              </h2>
              <p className="text-xs text-neutral-500">
                100% Central Database synced — customize headers, fonts (H1–H6, P), product cards, reviews, product page, footer & widgets for all devices.
              </p>
            </div>
          </div>
        </div>

        <div className="flex flex-wrap items-center gap-2.5">
          <button
            type="button"
            disabled={isSaving}
            onClick={handleResetAll}
            className="px-4 py-2.5 rounded-xl border border-neutral-300 bg-white hover:bg-neutral-50 text-neutral-700 text-xs font-bold flex items-center gap-1.5 cursor-pointer transition-colors disabled:opacity-50"
          >
            <RotateCcw className="w-3.5 h-3.5" />
            <span>Reset Defaults</span>
          </button>
          <button
            type="button"
            disabled={isSaving}
            onClick={() => persistDraft(draft)}
            className="px-5 py-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-extrabold shadow-md shadow-emerald-600/20 flex items-center gap-2 cursor-pointer transition-all disabled:opacity-60"
          >
            {isSaving ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
            <span>{isSaving ? "Publishing..." : "Save & Publish Across All Devices"}</span>
          </button>
        </div>
      </div>

      {saveFeedback && (
        <div
          className={`p-3.5 rounded-2xl border text-xs font-bold flex items-center gap-2 animate-in fade-in ${saveFeedback.type === "success"
              ? "bg-emerald-50 border-emerald-200 text-emerald-800"
              : "bg-rose-50 border-rose-200 text-rose-800"
            }`}
        >
          <CheckCircle2 className="w-4 h-4 shrink-0" />
          <span>{saveFeedback.text}</span>
        </div>
      )}

      {/* 1-Click Theme Presets */}
      <div className="bg-white rounded-3xl border border-neutral-200/80 shadow-xs p-5 space-y-3">
        <div className="flex items-center justify-between">
          <h3 className="text-xs font-extrabold uppercase tracking-wider text-neutral-700 flex items-center gap-1.5">
            <Sparkles className="w-3.5 h-3.5 text-emerald-600" />
            <span>1-Click Complete Storefront Theme Presets</span>
          </h3>
          <span className="text-[11px] text-neutral-400">Stored directly in Backend DB</span>
        </div>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
          {THEME_PRESETS.map((preset) => {
            const isActive = draft.activePreset === preset.id;
            return (
              <button
                key={preset.id}
                type="button"
                disabled={isSaving}
                onClick={() => handleApplyPreset(preset)}
                className={`p-3.5 rounded-2xl border text-left transition-all cursor-pointer ${isActive
                    ? "border-emerald-500 bg-emerald-50/50 ring-2 ring-emerald-500/20"
                    : "border-neutral-200 hover:border-neutral-300 bg-white"
                  }`}
              >
                <div className="flex items-center justify-between gap-2 mb-2">
                  <div className="flex items-center -space-x-1">
                    {preset.swatch.map((hex, i) => (
                      <span
                        key={i}
                        className="w-5 h-5 rounded-full border-2 border-white shadow-xs"
                        style={{ backgroundColor: hex }}
                      />
                    ))}
                  </div>
                  {isActive && (
                    <span className="text-[10px] font-bold text-emerald-700 bg-emerald-100 px-2 py-0.5 rounded-full">
                      Active
                    </span>
                  )}
                </div>
                <div className="text-xs font-extrabold text-neutral-900">{preset.name}</div>
                <p className="text-[11px] text-neutral-500 mt-0.5 line-clamp-2">{preset.description}</p>
              </button>
            );
          })}
        </div>
      </div>

      {/* Category Sub-Tabs */}
      <div className="bg-white rounded-3xl border border-neutral-200/80 shadow-xs overflow-hidden">
        <div className="flex items-center gap-1.5 overflow-x-auto no-scrollbar p-3 bg-neutral-50 border-b border-neutral-200">
          {SECTION_TABS.map((tab) => {
            const Icon = tab.icon;
            const active = activeSubTab === tab.id;
            return (
              <button
                key={tab.id}
                type="button"
                onClick={() => setActiveSubTab(tab.id)}
                className={`px-3.5 py-2 rounded-xl text-xs font-bold whitespace-nowrap flex items-center gap-1.5 transition-all cursor-pointer ${active
                    ? "bg-neutral-900 text-white shadow-xs"
                    : "text-neutral-600 hover:bg-white hover:text-neutral-900"
                  }`}
              >
                <Icon className="w-3.5 h-3.5" />
                <span>{tab.label}</span>
              </button>
            );
          })}
        </div>

        <div className="p-5 sm:p-6 space-y-6">
          {/* TAB 1: GLOBAL & PAGE THEME */}
          {activeSubTab === "globalTheme" && (
            <div className="space-y-5">
              <BgModeControl
                title="Storefront Full Page Background"
                bgType={globalT.pageBgType}
                solidBg={globalT.pageBgColor}
                gradientFrom={globalT.pageGradientFrom}
                gradientTo={globalT.pageGradientTo}
                gradientDirection={globalT.gradientDirection}
                onPatch={(p) => updateSection("globalTheme", p)}
                fieldMap={{
                  bgType: "pageBgType",
                  solidBg: "pageBgColor",
                  gradientFrom: "pageGradientFrom",
                  gradientTo: "pageGradientTo",
                  gradientDirection: "gradientDirection",
                }}
              />

              <div className="p-4 rounded-2xl bg-neutral-50 border border-neutral-200 space-y-3">
                <h4 className="text-xs font-extrabold uppercase tracking-wider text-neutral-800">
                  Core Palette, Surfaces & Selection Colors
                </h4>
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
                  <ColorField label="Primary Brand Color" value={globalT.primaryColor} onChange={(v) => updateSection("globalTheme", { primaryColor: v })} />
                  <ColorField label="Secondary Deep Color" value={globalT.secondaryColor} onChange={(v) => updateSection("globalTheme", { secondaryColor: v })} />
                  <ColorField label="Accent / Highlight Color" value={globalT.accentColor} onChange={(v) => updateSection("globalTheme", { accentColor: v })} />
                  <ColorField label="Surface / Card BG" value={globalT.surfaceBgColor} onChange={(v) => updateSection("globalTheme", { surfaceBgColor: v })} />
                  <ColorField label="Default Heading Color" value={globalT.headingColor} onChange={(v) => updateSection("globalTheme", { headingColor: v })} />
                  <ColorField label="Default Body Text Color" value={globalT.bodyTextColor} onChange={(v) => updateSection("globalTheme", { bodyTextColor: v })} />
                  <ColorField label="Global Border Color" value={globalT.borderColor} onChange={(v) => updateSection("globalTheme", { borderColor: v })} />
                  <ColorField label="Text Highlight Selection BG" value={globalT.selectionBg} onChange={(v) => updateSection("globalTheme", { selectionBg: v })} />
                  <ColorField label="Text Highlight Selection Text" value={globalT.selectionText} onChange={(v) => updateSection("globalTheme", { selectionText: v })} />
                </div>
              </div>
            </div>
          )}

          {/* TAB 2: TOP HEADER */}
          {activeSubTab === "topHeader" && (
            <div className="space-y-5">
              {/* Live Top Header Preview */}
              <div className="space-y-2">
                <span className="text-[11px] font-bold uppercase tracking-wider text-neutral-500">
                  Live Top Header Preview
                </span>
                <div
                  className="rounded-2xl px-4 py-2.5 text-xs font-medium flex flex-wrap items-center justify-between gap-3 border shadow-sm"
                  style={{
                    ...buildBgStyle(topH, "#022c22"),
                    borderColor: topH.borderBottomColor || "#065f46",
                  }}
                >
                  <div className="flex items-center gap-3 flex-wrap">
                    <span className="flex items-center gap-1.5" style={{ color: topH.notice1TextColor }}>
                      <Truck className="w-3.5 h-3.5" style={{ color: topH.notice1IconColor }} />
                      <span>{"Inspect parcel upon delivery before payment"}</span>
                    </span>
                    <span style={{ color: topH.dividerColor }}>|</span>
                    <span className="flex items-center gap-1.5" style={{ color: topH.notice2TextColor }}>
                      <ShieldCheck className="w-3.5 h-3.5" style={{ color: topH.notice2IconColor }} />
                      <span>{"Inspect parcel before payment"}</span>
                    </span>
                  </div>
                  <div className="flex items-center gap-3">
                    <span className="flex items-center gap-1.5" style={{ color: topH.hotlineTextColor }}>
                      <PhoneCall className="w-3.5 h-3.5" style={{ color: topH.hotlineIconColor }} />
                      <span>{themeConfig?.shop?.hotline || "09612345678"}</span>
                    </span>
                    <span
                      className="px-2.5 py-1 rounded-lg flex items-center gap-1"
                      style={{
                        backgroundColor: topH.trackBtnBg || "transparent",
                        color: topH.trackBtnText,
                      }}
                    >
                      <MapPin className="w-3.5 h-3.5" style={{ color: topH.trackBtnIconColor }} />
                      <span>{"Track Order"}</span>
                    </span>
                  </div>
                </div>
              </div>

              <BgModeControl
                title="Top Header Background (Solid or Gradient)"
                bgType={topH.bgType}
                solidBg={topH.solidBg}
                gradientFrom={topH.gradientFrom}
                gradientVia={topH.gradientVia}
                gradientTo={topH.gradientTo}
                gradientDirection={topH.gradientDirection}
                showVia
                onPatch={(p) => updateSection("topHeader", p)}
              />

              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3 p-4 rounded-2xl bg-neutral-50 border border-neutral-200">
                <ColorField label="1st Notice Text Color" value={topH.notice1TextColor} onChange={(v) => updateSection("topHeader", { notice1TextColor: v })} />
                <ColorField label="1st Notice Icon Color" value={topH.notice1IconColor} onChange={(v) => updateSection("topHeader", { notice1IconColor: v })} />
                <ColorField label="2nd Notice Text Color" value={topH.notice2TextColor} onChange={(v) => updateSection("topHeader", { notice2TextColor: v })} />
                <ColorField label="2nd Notice Icon Color" value={topH.notice2IconColor} onChange={(v) => updateSection("topHeader", { notice2IconColor: v })} />
                <ColorField label="Hotline Number Color" value={topH.hotlineTextColor} onChange={(v) => updateSection("topHeader", { hotlineTextColor: v })} />
                <ColorField label="Hotline Phone Icon Color" value={topH.hotlineIconColor} onChange={(v) => updateSection("topHeader", { hotlineIconColor: v })} />
                <ColorField label="Track Order Button Text" value={topH.trackBtnText} onChange={(v) => updateSection("topHeader", { trackBtnText: v })} />
                <ColorField label="Track Order Icon Color" value={topH.trackBtnIconColor} onChange={(v) => updateSection("topHeader", { trackBtnIconColor: v })} />
                <ColorField label="Track Order Button BG" value={topH.trackBtnBg} allowEmpty onChange={(v) => updateSection("topHeader", { trackBtnBg: v })} />
                <ColorField label="Track Order Active BG" value={topH.trackBtnActiveBg} onChange={(v) => updateSection("topHeader", { trackBtnActiveBg: v })} />
                <ColorField label="Track Order Active Text" value={topH.trackBtnActiveText} onChange={(v) => updateSection("topHeader", { trackBtnActiveText: v })} />
                <ColorField label="Divider & Border Color" value={topH.borderBottomColor} onChange={(v) => updateSection("topHeader", { borderBottomColor: v, dividerColor: v })} />
              </div>
            </div>
          )}

          {/* TAB 3: MAIN HEADER & MENU */}
          {activeSubTab === "mainHeader" && (
            <div className="space-y-5">
              {/* Live Main Header Preview */}
              <div className="space-y-2">
                <span className="text-[11px] font-bold uppercase tracking-wider text-neutral-500">
                  Live Main Header Preview
                </span>
                <div
                  className="rounded-2xl px-5 py-3.5 border flex items-center justify-between gap-4 shadow-sm"
                  style={{
                    ...buildBgStyle(mainH, "#ffffff"),
                    borderColor: mainH.borderBottomColor || "#e5e5e5",
                  }}
                >
                  <span className="text-lg font-black tracking-tight" style={{ color: mainH.logoTextColor }}>
                    {themeConfig?.shop?.headerLogoText || themeConfig?.shop?.name || "AmarDokan"}
                  </span>
                  <div
                    className="flex-1 max-w-xs hidden sm:flex items-center gap-2 px-3 py-2 rounded-xl border text-xs"
                    style={{
                      backgroundColor: mainH.searchBg,
                      borderColor: mainH.searchBorderColor,
                      color: mainH.searchTextColor,
                    }}
                  >
                    <Search className="w-3.5 h-3.5 shrink-0" style={{ color: mainH.searchIconColor }} />
                    <span className="opacity-60 truncate">Search products...</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <span
                      className="px-3 py-1.5 rounded-xl text-xs font-semibold flex items-center gap-1.5"
                      style={{ backgroundColor: mainH.cartBtnBg, color: mainH.cartBtnText }}
                    >
                      <ShoppingBag className="w-3.5 h-3.5" style={{ color: mainH.cartIconColor }} />
                      <span>Bag</span>
                      <span
                        className="px-1.5 py-0.2 rounded-full text-[10px] font-bold"
                        style={{ backgroundColor: mainH.cartBadgeBg, color: mainH.cartBadgeText }}
                      >
                        2
                      </span>
                    </span>
                    <span
                      className="px-3 py-1.5 rounded-xl text-xs font-semibold flex items-center gap-1.5"
                      style={{ backgroundColor: mainH.accountBtnBg, color: mainH.accountBtnText }}
                    >
                      <User className="w-3.5 h-3.5" style={{ color: mainH.accountIconColor }} />
                      <span>Account</span>
                    </span>
                  </div>
                </div>
              </div>

              <BgModeControl
                title="Main Header Background (Solid or Gradient)"
                bgType={mainH.bgType}
                solidBg={mainH.solidBg}
                gradientFrom={mainH.gradientFrom}
                gradientVia={mainH.gradientVia}
                gradientTo={mainH.gradientTo}
                gradientDirection={mainH.gradientDirection}
                showVia
                onPatch={(p) => updateSection("mainHeader", p)}
              />

              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3 p-4 rounded-2xl bg-neutral-50 border border-neutral-200">
                <ColorField label="Header Bottom Border" value={mainH.borderBottomColor} onChange={(v) => updateSection("mainHeader", { borderBottomColor: v })} />
                <ColorField label="Logo Text Color" value={mainH.logoTextColor} onChange={(v) => updateSection("mainHeader", { logoTextColor: v })} />
                <ColorField label="Menu Links Text Color" value={mainH.menuTextColor} onChange={(v) => updateSection("mainHeader", { menuTextColor: v })} />
                <ColorField label="Menu Hover Color" value={mainH.menuHoverColor} onChange={(v) => updateSection("mainHeader", { menuHoverColor: v })} />
                <ColorField label="Search Bar Background" value={mainH.searchBg} onChange={(v) => updateSection("mainHeader", { searchBg: v })} />
                <ColorField label="Search Bar Border" value={mainH.searchBorderColor} onChange={(v) => updateSection("mainHeader", { searchBorderColor: v })} />
                <ColorField label="Search Input Text Color" value={mainH.searchTextColor} onChange={(v) => updateSection("mainHeader", { searchTextColor: v })} />
                <ColorField label="Search Icon Color" value={mainH.searchIconColor} onChange={(v) => updateSection("mainHeader", { searchIconColor: v })} />
                <ColorField label="Cart Button BG" value={mainH.cartBtnBg} onChange={(v) => updateSection("mainHeader", { cartBtnBg: v })} />
                <ColorField label="Cart Button Text Color" value={mainH.cartBtnText} onChange={(v) => updateSection("mainHeader", { cartBtnText: v })} />
                <ColorField label="Cart Icon Color" value={mainH.cartIconColor} onChange={(v) => updateSection("mainHeader", { cartIconColor: v })} />
                <ColorField label="Cart Count Badge BG" value={mainH.cartBadgeBg} onChange={(v) => updateSection("mainHeader", { cartBadgeBg: v })} />
                <ColorField label="Cart Count Badge Text" value={mainH.cartBadgeText} onChange={(v) => updateSection("mainHeader", { cartBadgeText: v })} />
                <ColorField label="Account Button BG" value={mainH.accountBtnBg} onChange={(v) => updateSection("mainHeader", { accountBtnBg: v })} />
                <ColorField label="Account Button Text" value={mainH.accountBtnText} onChange={(v) => updateSection("mainHeader", { accountBtnText: v })} />
                <ColorField label="Account Icon Color" value={mainH.accountIconColor} onChange={(v) => updateSection("mainHeader", { accountIconColor: v })} />
              </div>
            </div>
          )}

          {/* TAB 4: TYPOGRAPHY & FONTS (H1-H6 + PARAGRAPH) */}
          {activeSubTab === "typography" && (
            <div className="space-y-5">
              <div className="p-4 rounded-2xl bg-neutral-50 border border-neutral-200 grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="space-y-1.5">
                  <label className="text-xs font-bold text-neutral-800 block">
                    Global Primary Font (Storefront & Product Page)
                  </label>
                  <select
                    value={typo.primaryFont || "Plus Jakarta Sans"}
                    onChange={(e) => updateSection("typography", { primaryFont: e.target.value })}
                    className="w-full px-3.5 py-2.5 rounded-xl bg-white border border-neutral-300 text-xs font-semibold text-neutral-900 focus:outline-none focus:border-emerald-500"
                  >
                    {GOOGLE_FONT_OPTIONS.map((f) => (
                      <option key={f.id} value={f.id}>
                        {f.label}
                      </option>
                    ))}
                  </select>
                </div>

                <div className="space-y-1.5">
                  <label className="text-xs font-bold text-neutral-800 block">
                    Bengali Content Font Family
                  </label>
                  <select
                    value={typo.banglaFont || "Hind Siliguri"}
                    onChange={(e) => updateSection("typography", { banglaFont: e.target.value })}
                    className="w-full px-3.5 py-2.5 rounded-xl bg-white border border-neutral-300 text-xs font-semibold text-neutral-900 focus:outline-none focus:border-emerald-500"
                  >
                    {GOOGLE_FONT_OPTIONS.map((f) => (
                      <option key={f.id} value={f.id}>
                        {f.label}
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              {/* H1 - H6 and Paragraph Grid */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {TYPOGRAPHY_TAGS.map((tag) => {
                  const cfg = typo[tag.key] || {};
                  const sampleText =
                    tag.key === "p"
                      ? "Fastest nationwide delivery with Cash on Delivery across Bangladesh."
                      : `${tag.key.toUpperCase()} Sample Heading Preview`;
                  return (
                    <div key={tag.key} className="p-4 rounded-2xl bg-neutral-50 border border-neutral-200 space-y-3">
                      <div className="flex items-center justify-between border-b border-neutral-200 pb-2">
                        <span className="text-xs font-extrabold text-neutral-900">{tag.label}</span>
                        <span className="text-[10px] font-mono bg-white px-2 py-0.5 rounded-md border border-neutral-200 text-neutral-600">
                          &lt;{tag.key}&gt;
                        </span>
                      </div>

                      <div className="grid grid-cols-2 gap-2.5">
                        <div className="space-y-1">
                          <label className="text-[11px] font-bold text-neutral-700">Font Family</label>
                          <select
                            value={cfg.fontFamily || ""}
                            onChange={(e) => updateTypographyTag(tag.key, { fontFamily: e.target.value })}
                            className="w-full px-2.5 py-2 rounded-xl bg-white border border-neutral-300 text-xs text-neutral-800"
                          >
                            <option value="">Inherit Primary ({typo.primaryFont || "Default"})</option>
                            {GOOGLE_FONT_OPTIONS.map((f) => (
                              <option key={f.id} value={f.id}>
                                {f.id}
                              </option>
                            ))}
                          </select>
                        </div>

                        <div className="space-y-1">
                          <label className="text-[11px] font-bold text-neutral-700">Font Style</label>
                          <select
                            value={cfg.fontStyle || "normal"}
                            onChange={(e) => updateTypographyTag(tag.key, { fontStyle: e.target.value })}
                            className="w-full px-2.5 py-2 rounded-xl bg-white border border-neutral-300 text-xs text-neutral-800"
                          >
                            <option value="normal">Normal</option>
                            <option value="italic">Italic</option>
                          </select>
                        </div>

                        <div className="space-y-1">
                          <label className="text-[11px] font-bold text-neutral-700">Font Weight</label>
                          <select
                            value={cfg.fontWeight || ""}
                            onChange={(e) => updateTypographyTag(tag.key, { fontWeight: e.target.value })}
                            className="w-full px-2.5 py-2 rounded-xl bg-white border border-neutral-300 text-xs text-neutral-800"
                          >
                            {FONT_WEIGHT_OPTIONS.map((w) => (
                              <option key={w.value} value={w.value}>
                                {w.label}
                              </option>
                            ))}
                          </select>
                        </div>

                        <div className="space-y-1">
                          <label className="text-[11px] font-bold text-neutral-700">Font Size (Optional)</label>
                          <input
                            type="text"
                            value={cfg.fontSize || ""}
                            onChange={(e) => updateTypographyTag(tag.key, { fontSize: e.target.value })}
                            placeholder="e.g. 28px or 1.5rem"
                            className="w-full px-2.5 py-2 rounded-xl bg-white border border-neutral-300 text-xs text-neutral-800"
                          />
                        </div>
                      </div>

                      <ColorField
                        label={`${tag.key.toUpperCase()} Text Color Override`}
                        value={cfg.color}
                        allowEmpty
                        onChange={(v) => updateTypographyTag(tag.key, { color: v })}
                      />

                      {/* Live tag specimen */}
                      <div className="p-2.5 rounded-xl bg-white border border-neutral-200 truncate">
                        <span
                          style={{
                            fontFamily: getFontStack(cfg.fontFamily || typo.primaryFont || "Plus Jakarta Sans"),
                            fontStyle: cfg.fontStyle || "normal",
                            fontWeight: cfg.fontWeight || (tag.key === "p" ? "400" : "700"),
                            fontSize: cfg.fontSize || (tag.key === "p" ? "13px" : "15px"),
                            color: cfg.color || "#171717",
                          }}
                        >
                          {sampleText}
                        </span>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          )}

          {/* TAB 5: PRODUCTS, BUTTONS & REVIEWS */}
          {activeSubTab === "productsReviews" && (
            <div className="space-y-6">
              <div className="p-4 rounded-2xl bg-neutral-50 border border-neutral-200 space-y-4">
                <h4 className="text-xs font-extrabold uppercase tracking-wider text-neutral-800">
                  Product Cards, Product Name, Prices, Add to Cart & Buy Buttons
                </h4>
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
                  <ColorField label="Card Background" value={prodCards.cardBg} onChange={(v) => updateSection("productCards", { cardBg: v })} />
                  <ColorField label="Card Border Color" value={prodCards.cardBorderColor} onChange={(v) => updateSection("productCards", { cardBorderColor: v })} />
                  <ColorField label="Category Label Color" value={prodCards.categoryLabelColor} onChange={(v) => updateSection("productCards", { categoryLabelColor: v })} />
                  <ColorField label="Product Name Text Color" value={prodCards.productNameColor} onChange={(v) => updateSection("productCards", { productNameColor: v })} />
                  <ColorField label="Offer Price Color" value={prodCards.priceColor} onChange={(v) => updateSection("productCards", { priceColor: v })} />
                  <ColorField label="Regular Price (Strike) Color" value={prodCards.regularPriceColor} onChange={(v) => updateSection("productCards", { regularPriceColor: v })} />
                  <ColorField label="Discount Badge BG" value={prodCards.discountBadgeBg} onChange={(v) => updateSection("productCards", { discountBadgeBg: v })} />
                  <ColorField label="Discount Badge Text" value={prodCards.discountBadgeText} onChange={(v) => updateSection("productCards", { discountBadgeText: v })} />
                  <ColorField label="Add to Cart Button BG" value={prodCards.addToCartBg} onChange={(v) => updateSection("productCards", { addToCartBg: v })} />
                  <ColorField label="Add to Cart Text Color" value={prodCards.addToCartText} onChange={(v) => updateSection("productCards", { addToCartText: v })} />
                  <ColorField label="Add to Cart Border" value={prodCards.addToCartBorder} onChange={(v) => updateSection("productCards", { addToCartBorder: v })} />
                  <ColorField label="Add to Cart Icon Color" value={prodCards.addToCartIconColor} onChange={(v) => updateSection("productCards", { addToCartIconColor: v })} />
                  <ColorField label="Order Now Button BG" value={prodCards.buyNowBg} onChange={(v) => updateSection("productCards", { buyNowBg: v })} />
                  <ColorField label="Order Now Text Color" value={prodCards.buyNowText} onChange={(v) => updateSection("productCards", { buyNowText: v })} />
                  <ColorField label="Category Pill BG" value={prodCards.categoryPillBg} onChange={(v) => updateSection("productCards", { categoryPillBg: v })} />
                  <ColorField label="Category Pill Text" value={prodCards.categoryPillText} onChange={(v) => updateSection("productCards", { categoryPillText: v })} />
                  <ColorField label="Active Category Pill BG" value={prodCards.categoryPillActiveBg} onChange={(v) => updateSection("productCards", { categoryPillActiveBg: v })} />
                  <ColorField label="Active Category Pill Text" value={prodCards.categoryPillActiveText} onChange={(v) => updateSection("productCards", { categoryPillActiveText: v })} />
                  <ColorField label="View More Button BG" value={prodCards.viewMoreBtnBg} onChange={(v) => updateSection("productCards", { viewMoreBtnBg: v })} />
                  <ColorField label="View More Button Text" value={prodCards.viewMoreBtnText} onChange={(v) => updateSection("productCards", { viewMoreBtnText: v })} />
                </div>
              </div>

              <div className="space-y-4">
                <BgModeControl
                  title="Customer Reviews Section Background (Solid or Gradient)"
                  bgType={reviews.bgType}
                  solidBg={reviews.solidBg}
                  gradientFrom={reviews.gradientFrom}
                  gradientVia={reviews.gradientVia}
                  gradientTo={reviews.gradientTo}
                  gradientDirection={reviews.gradientDirection}
                  showVia
                  onPatch={(p) => updateSection("reviews", p)}
                />
                <div className="p-4 rounded-2xl bg-neutral-50 border border-neutral-200 space-y-3">
                  <div className="flex items-center justify-between">
                    <h4 className="text-xs font-extrabold uppercase tracking-wider text-neutral-800 flex items-center gap-1.5">
                      <MessageSquareHeart className="w-3.5 h-3.5 text-emerald-600" />
                      <span>Customer Reviews Colors</span>
                    </h4>
                    <div className="flex items-center gap-1 text-xs">
                      <Star className="w-3.5 h-3.5" style={{ color: reviews.starColor, fill: reviews.starColor }} />
                      <span className="font-semibold text-neutral-600">Preview Star</span>
                    </div>
                  </div>
                  <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
                    <ColorField label="Section Heading Color" value={reviews.headingColor} onChange={(v) => updateSection("reviews", { headingColor: v })} />
                    <ColorField label="Section Subtitle Color" value={reviews.subtitleColor} onChange={(v) => updateSection("reviews", { subtitleColor: v })} />
                    <ColorField label="Review Card BG" value={reviews.cardBg} onChange={(v) => updateSection("reviews", { cardBg: v })} />
                    <ColorField label="Review Card Border" value={reviews.cardBorderColor} onChange={(v) => updateSection("reviews", { cardBorderColor: v })} />
                    <ColorField label="Active Review Card Border" value={reviews.activeCardBorderColor} onChange={(v) => updateSection("reviews", { activeCardBorderColor: v })} />
                    <ColorField label="Star Icon Color" value={reviews.starColor} onChange={(v) => updateSection("reviews", { starColor: v })} />
                    <ColorField label="Review Quote Text Color" value={reviews.reviewTextColor} onChange={(v) => updateSection("reviews", { reviewTextColor: v })} />
                    <ColorField label="Reviewer Name Color" value={reviews.reviewerNameColor} onChange={(v) => updateSection("reviews", { reviewerNameColor: v })} />
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* TAB 6: PRODUCT PAGE & ITS HEADER */}
          {activeSubTab === "productPage" && (
            <div className="space-y-6">
              <BgModeControl
                title="Product Page — Top Header Background"
                bgType={prodPage.topBarBgType}
                solidBg={prodPage.topBarSolidBg}
                gradientFrom={prodPage.topBarGradientFrom}
                gradientVia={prodPage.topBarGradientVia}
                gradientTo={prodPage.topBarGradientTo}
                gradientDirection={prodPage.topBarGradientDirection}
                showVia
                onPatch={(p) => updateSection("productPage", p)}
                fieldMap={{
                  bgType: "topBarBgType",
                  solidBg: "topBarSolidBg",
                  gradientFrom: "topBarGradientFrom",
                  gradientVia: "topBarGradientVia",
                  gradientTo: "topBarGradientTo",
                  gradientDirection: "topBarGradientDirection",
                }}
              />

              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3 p-4 rounded-2xl bg-neutral-50 border border-neutral-200">
                <ColorField label="Top Bar Notice 1 Text" value={prodPage.topBarNotice1Text} onChange={(v) => updateSection("productPage", { topBarNotice1Text: v })} />
                <ColorField label="Top Bar Notice 1 Icon" value={prodPage.topBarNotice1Icon} onChange={(v) => updateSection("productPage", { topBarNotice1Icon: v })} />
                <ColorField label="Top Bar Notice 2 Text" value={prodPage.topBarNotice2Text} onChange={(v) => updateSection("productPage", { topBarNotice2Text: v })} />
                <ColorField label="Top Bar Notice 2 Icon" value={prodPage.topBarNotice2Icon} onChange={(v) => updateSection("productPage", { topBarNotice2Icon: v })} />
                <ColorField label="Top Bar Hotline Text" value={prodPage.topBarHotlineText} onChange={(v) => updateSection("productPage", { topBarHotlineText: v })} />
                <ColorField label="Top Bar Hotline Icon" value={prodPage.topBarHotlineIcon} onChange={(v) => updateSection("productPage", { topBarHotlineIcon: v })} />
                <ColorField label="Top Bar Track Text" value={prodPage.topBarTrackText} onChange={(v) => updateSection("productPage", { topBarTrackText: v })} />
                <ColorField label="Top Bar Track Icon" value={prodPage.topBarTrackIcon} onChange={(v) => updateSection("productPage", { topBarTrackIcon: v })} />
              </div>

              <BgModeControl
                title="Product Page — Main Header Background"
                bgType={prodPage.mainHeaderBgType}
                solidBg={prodPage.mainHeaderSolidBg}
                gradientFrom={prodPage.mainHeaderGradientFrom}
                gradientTo={prodPage.mainHeaderGradientTo}
                onPatch={(p) => updateSection("productPage", p)}
                fieldMap={{
                  bgType: "mainHeaderBgType",
                  solidBg: "mainHeaderSolidBg",
                  gradientFrom: "mainHeaderGradientFrom",
                  gradientTo: "mainHeaderGradientTo",
                  gradientDirection: "topBarGradientDirection",
                }}
              />

              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3 p-4 rounded-2xl bg-neutral-50 border border-neutral-200">
                <ColorField label="Header Logo Text Color" value={prodPage.mainHeaderLogoTextColor} onChange={(v) => updateSection("productPage", { mainHeaderLogoTextColor: v })} />
                <ColorField label="Header Menu Text Color" value={prodPage.mainHeaderMenuTextColor} onChange={(v) => updateSection("productPage", { mainHeaderMenuTextColor: v })} />
                <ColorField label="Header Search BG" value={prodPage.searchBg} onChange={(v) => updateSection("productPage", { searchBg: v })} />
                <ColorField label="Header Search Text Color" value={prodPage.searchTextColor} onChange={(v) => updateSection("productPage", { searchTextColor: v })} />
                <ColorField label="Header Search Icon Color" value={prodPage.searchIconColor} onChange={(v) => updateSection("productPage", { searchIconColor: v })} />
                <ColorField label="Header Action Button BG" value={prodPage.mainHeaderBtnBg} onChange={(v) => updateSection("productPage", { mainHeaderBtnBg: v })} />
                <ColorField label="Header Action Button Text" value={prodPage.mainHeaderBtnText} onChange={(v) => updateSection("productPage", { mainHeaderBtnText: v })} />
                <ColorField label="Header Icon Color" value={prodPage.mainHeaderIconColor} onChange={(v) => updateSection("productPage", { mainHeaderIconColor: v })} />
                <ColorField label="Header CTA Button BG" value={prodPage.mainHeaderOrderBtnBg} onChange={(v) => updateSection("productPage", { mainHeaderOrderBtnBg: v })} />
                <ColorField label="Header CTA Button Text" value={prodPage.mainHeaderOrderBtnText} onChange={(v) => updateSection("productPage", { mainHeaderOrderBtnText: v })} />
              </div>

              <BgModeControl
                title="Product Page — Full Page Background"
                bgType={prodPage.pageBgType}
                solidBg={prodPage.pageBgColor}
                gradientFrom={prodPage.pageGradientFrom}
                gradientTo={prodPage.pageGradientTo}
                onPatch={(p) => updateSection("productPage", p)}
                fieldMap={{
                  bgType: "pageBgType",
                  solidBg: "pageBgColor",
                  gradientFrom: "pageGradientFrom",
                  gradientTo: "pageGradientTo",
                  gradientDirection: "topBarGradientDirection",
                }}
              />

              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3 p-4 rounded-2xl bg-neutral-50 border border-neutral-200">
                <ColorField label="Section Card BG" value={prodPage.cardBg} onChange={(v) => updateSection("productPage", { cardBg: v })} />
                <ColorField label="Section Card Border" value={prodPage.cardBorderColor} onChange={(v) => updateSection("productPage", { cardBorderColor: v })} />
                <ColorField label="Product Title Color" value={prodPage.titleColor} onChange={(v) => updateSection("productPage", { titleColor: v })} />
                <ColorField label="Subtitle / Copy Color" value={prodPage.subtitleColor} onChange={(v) => updateSection("productPage", { subtitleColor: v })} />
                <ColorField label="Badge BG Color" value={prodPage.badgeBg} onChange={(v) => updateSection("productPage", { badgeBg: v })} />
                <ColorField label="Badge Text Color" value={prodPage.badgeText} onChange={(v) => updateSection("productPage", { badgeText: v })} />
                <ColorField label="Price Box BG" value={prodPage.priceBoxBg} onChange={(v) => updateSection("productPage", { priceBoxBg: v })} />
                <ColorField label="Price Box Border" value={prodPage.priceBoxBorder} onChange={(v) => updateSection("productPage", { priceBoxBorder: v })} />
                <ColorField label="Price Text Color" value={prodPage.priceTextColor} onChange={(v) => updateSection("productPage", { priceTextColor: v })} />
                <ColorField label="Primary CTA Button BG" value={prodPage.primaryBtnBg} onChange={(v) => updateSection("productPage", { primaryBtnBg: v })} />
                <ColorField label="Primary CTA Button Text" value={prodPage.primaryBtnText} onChange={(v) => updateSection("productPage", { primaryBtnText: v })} />
                <ColorField label="Secondary Button BG" value={prodPage.secondaryBtnBg} onChange={(v) => updateSection("productPage", { secondaryBtnBg: v })} />
                <ColorField label="Secondary Button Text" value={prodPage.secondaryBtnText} onChange={(v) => updateSection("productPage", { secondaryBtnText: v })} />
                <ColorField label="Active Tab Text Color" value={prodPage.tabActiveColor} onChange={(v) => updateSection("productPage", { tabActiveColor: v })} />
                <ColorField label="Active Tab Underline" value={prodPage.tabActiveBorderColor} onChange={(v) => updateSection("productPage", { tabActiveBorderColor: v })} />
                <ColorField label="Inactive Tab Text Color" value={prodPage.tabInactiveColor} onChange={(v) => updateSection("productPage", { tabInactiveColor: v })} />
                <ColorField label="Offer Banner Start BG" value={prodPage.ctaBannerBg} onChange={(v) => updateSection("productPage", { ctaBannerBg: v })} />
                <ColorField label="Offer Banner End BG" value={prodPage.ctaBannerGradientTo} onChange={(v) => updateSection("productPage", { ctaBannerGradientTo: v })} />
                <ColorField label="Checkout Box BG" value={prodPage.checkoutCardBg} onChange={(v) => updateSection("productPage", { checkoutCardBg: v })} />
                <ColorField label="Submit Order Button BG" value={prodPage.checkoutSubmitBtnBg} onChange={(v) => updateSection("productPage", { checkoutSubmitBtnBg: v })} />
                <ColorField label="Submit Order Button Text" value={prodPage.checkoutSubmitBtnText} onChange={(v) => updateSection("productPage", { checkoutSubmitBtnText: v })} />
              </div>
            </div>
          )}

          {/* TAB 7: FOOTER & WIDGETS */}
          {activeSubTab === "footerWidgets" && (
            <div className="space-y-6">
              <BgModeControl
                title="Footer Background (Solid or Gradient)"
                bgType={footer.bgType}
                solidBg={footer.solidBg}
                gradientFrom={footer.gradientFrom}
                gradientVia={footer.gradientVia}
                gradientTo={footer.gradientTo}
                gradientDirection={footer.gradientDirection}
                showVia
                onPatch={(p) => updateSection("footer", p)}
              />

              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3 p-4 rounded-2xl bg-neutral-50 border border-neutral-200">
                <ColorField label="Footer Headings Color" value={footer.headingColor} onChange={(v) => updateSection("footer", { headingColor: v })} />
                <ColorField label="Footer Text Logo Color" value={footer.logoTextColor} onChange={(v) => updateSection("footer", { logoTextColor: v })} />
                <ColorField label="Footer Text Color (Hours/Number/Email)" value={footer.textColor} onChange={(v) => updateSection("footer", { textColor: v })} />
                <ColorField label="Footer Icon Color" value={footer.iconColor} onChange={(v) => updateSection("footer", { iconColor: v })} />
                <ColorField label="Footer Top Border" value={footer.borderTopColor} onChange={(v) => updateSection("footer", { borderTopColor: v })} />
                <ColorField label="Copyright Divider Line" value={footer.dividerColor} onChange={(v) => updateSection("footer", { dividerColor: v })} />
                <ColorField label="Copyright Text Color" value={footer.copyrightTextColor} onChange={(v) => updateSection("footer", { copyrightTextColor: v })} />
                <ColorField label="Developer Link Color" value={footer.linkColor} onChange={(v) => updateSection("footer", { linkColor: v })} />
              </div>

              {/* Back to Top Widget */}
              <div className="p-4 rounded-2xl bg-neutral-50 border border-neutral-200 space-y-4">
                <div className="flex flex-wrap items-center justify-between gap-3">
                  <div className="flex items-center gap-2">
                    <ArrowUp className="w-4 h-4 text-emerald-600" />
                    <h4 className="text-xs font-extrabold uppercase tracking-wider text-neutral-800">
                      Back-to-Top Floating Widget
                    </h4>
                  </div>
                  <label className="inline-flex items-center gap-2 text-xs font-bold text-neutral-700 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={widgets.backToTopEnabled !== false}
                      onChange={(e) => updateSection("widgets", { backToTopEnabled: e.target.checked })}
                      className="rounded border-neutral-300 text-emerald-600 focus:ring-emerald-500"
                    />
                    <span>Show Back-to-Top Widget</span>
                  </label>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3 items-end">
                  <ColorField label="Button Background" value={widgets.backToTopBg} onChange={(v) => updateSection("widgets", { backToTopBg: v })} />
                  <ColorField label="Arrow Icon Color" value={widgets.backToTopIconColor} onChange={(v) => updateSection("widgets", { backToTopIconColor: v })} />
                  <ColorField label="Button Border Color" value={widgets.backToTopBorderColor} onChange={(v) => updateSection("widgets", { backToTopBorderColor: v })} />
                  <div className="space-y-1">
                    <label className="text-[11px] font-bold text-neutral-700 block">Widget Shape</label>
                    <select
                      value={widgets.backToTopShape || "rounded-full"}
                      onChange={(e) => updateSection("widgets", { backToTopShape: e.target.value })}
                      className="w-full h-[38px] px-3 rounded-xl bg-white border border-neutral-300 text-xs font-semibold text-neutral-800"
                    >
                      <option value="rounded-full">Circle (Rounded Full)</option>
                      <option value="rounded-xl">Squircle (Rounded XL)</option>
                      <option value="rounded-lg">Soft Square</option>
                    </select>
                  </div>
                  <ColorField label="Tooltip Background" value={widgets.backToTopTooltipBg} onChange={(v) => updateSection("widgets", { backToTopTooltipBg: v })} />
                  <ColorField label="Tooltip Text Color" value={widgets.backToTopTooltipText} onChange={(v) => updateSection("widgets", { backToTopTooltipText: v })} />
                </div>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default AdminThemesColors;

