import React, { useState, useEffect } from "react";
import {
  GalleryHorizontal,
  Plus,
  Trash2,
  ArrowUp,
  ArrowDown,
  Save,
  RotateCcw,
  Loader2,
  CheckCircle2,
  Images,
  Upload,
  Copy,
  Eye,
  EyeOff,
  Sparkles,
  LayoutTemplate,
  Sliders as SlidersIcon,
  X,
} from "lucide-react";
import { useThemeConfig } from "../frontPanel/FrontPanelContext";
import { HERO_SLIDES } from "../hero/HeroSection";
import { MediaPickerModal } from "./MediaPickerModal";
import { apiClient } from "../../services/api";
import { realtimeService } from "../../services/realtime";

export const SLIDER_STYLES = [
  {
    id: "style_1_glass_spotlight",
    name: "1. Emerald Spotlight (Classic Glass)",
    description: "Atmospheric backdrop with left bold copy & floating spotlight product showcase.",
    badge: "Classic",
    accent: "from-emerald-600 to-teal-700",
  },
  {
    id: "style_2_fullscreen_cinematic",
    name: "2. Fullscreen Cinematic Editorial",
    description: "Dramatic dark-vignette full-bleed hero with centered magazine typography & frosted CTAs.",
    badge: "Cinematic",
    accent: "from-neutral-900 to-slate-800",
  },
  {
    id: "style_3_minimal_swiss",
    name: "3. Minimalist Modern Studio",
    description: "Ultra-clean high-contrast editorial stage with sharp typographic framing & soft card shadows.",
    badge: "Modern",
    accent: "from-slate-100 to-neutral-200 text-neutral-900",
  },
  {
    id: "style_4_diagonal_gradient",
    name: "4. Dynamic Diagonal Split Banner",
    description: "Sleek angled brand gradient split merging expressive headlines on left with vivid visuals on right.",
    badge: "Dynamic",
    accent: "from-indigo-700 to-emerald-700",
  },
  {
    id: "style_5_bento_floating",
    name: "5. Floating Modern Bento Stage",
    description: "Contemporary dual-panel bento showcase card floating over textured ambient canvas.",
    badge: "Bento",
    accent: "from-amber-500 to-orange-600",
  },
];

const DEFAULT_TRUST_ITEMS = [
  { icon: "truck", text: "100% Original Products" },
  { icon: "rotate", text: "7 Days Replacement" },
  { icon: "shield", text: "Cash on Delivery" },
  { icon: "check", text: "100% Genuine" },
];

const TRUST_ICON_OPTIONS = [
  { id: "truck", label: "Truck (Delivery)" },
  { id: "rotate", label: "Return / Replace" },
  { id: "shield", label: "Shield (Guarantee)" },
  { id: "check", label: "Checkmark" },
  { id: "sparkles", label: "Sparkles" },
  { id: "zap", label: "Zap (Fast)" },
  { id: "flame", label: "Flame (Hot)" },
];

const PRIMARY_BTN_STYLES = [
  { id: "gradient_emerald", label: "Emerald Gradient" },
  { id: "solid_amber", label: "Amber Gold Solid" },
  { id: "solid_dark", label: "Obsidian Dark" },
  { id: "solid_white", label: "Crisp White" },
  { id: "outline_glow", label: "Glass Glow Border" },
];

const SECONDARY_BTN_STYLES = [
  { id: "glass_outline", label: "Frosted Glass" },
  { id: "solid_dark", label: "Dark Pill" },
  { id: "amber_outline", label: "Gold Accent Border" },
  { id: "white_outline", label: "Clean Border" },
];

const normalizeSlide = (s, idx) => ({
  id: s.id || `slide-${Date.now()}-${idx}`,
  isActive: s.isActive !== false,
  slideStyle: s.slideStyle || "inherit",
  productId: s.productId || "",
  productSlug: s.productSlug || "",
  bgImage: s.bgImage || "",
  overlayOpacity: s.overlayOpacity !== undefined ? Number(s.overlayOpacity) : 70,
  showProductImage: s.showProductImage !== false,
  productImage: s.productImage || "",
  showBadge: s.showBadge !== false,
  badge: s.badgeEn || s.badge || "",
  showHeadline: s.showHeadline !== false,
  headline: s.headline || "",
  headlineHighlight: s.headlineHighlight || "",
  headlineEnd: s.headlineEnd || "",
  showSubheadline: s.showSubheadline !== false,
  subheadline: s.subheadlineEn || s.subheadline || "",
  showPrimaryBtn: s.showPrimaryBtn !== false,
  ctaText: s.ctaTextEn || s.ctaText || "Shop Now",
  primaryBtnStyle: s.primaryBtnStyle || "gradient_emerald",
  primaryBtnAction: s.primaryBtnAction || "scroll_products",
  primaryBtnUrl: s.primaryBtnUrl || "",
  showSecondaryBtn: s.showSecondaryBtn !== false,
  campaignText: s.campaignTextEn || s.campaignText || "Special Offer",
  secondaryBtnStyle: s.secondaryBtnStyle || "glass_outline",
  secondaryBtnAction: s.secondaryBtnAction || "open_campaign",
  secondaryBtnUrl: s.secondaryBtnUrl || "",
  showTrustBadges: s.showTrustBadges !== false,
  trustItems: Array.isArray(s.trustItems) && s.trustItems.length > 0
    ? s.trustItems
    : DEFAULT_TRUST_ITEMS.map((item) => ({ ...item })),
});

export const AdminSliders = ({ products = [] }) => {
  const { themeConfig, updateThemeConfig } = useThemeConfig();
  const home = themeConfig?.homePage || {};

  const [heroStyle, setHeroStyle] = useState(home.heroStyle || "style_1_glass_spotlight");
  const [heroAutoPlay, setHeroAutoPlay] = useState(home.heroAutoPlay !== false);
  const [heroIntervalMs, setHeroIntervalMs] = useState(Number(home.heroIntervalMs) || 6000);
  const [heroShowArrows, setHeroShowArrows] = useState(home.heroShowArrows !== false);
  const [heroShowDots, setHeroShowDots] = useState(home.heroShowDots !== false);

  const [slides, setSlides] = useState(() => {
    const existing = Array.isArray(home.heroSlides) && home.heroSlides.length > 0 ? home.heroSlides : HERO_SLIDES;
    return existing.map(normalizeSlide);
  });

  const [selectedSlideIdx, setSelectedSlideIdx] = useState(0);
  const [mediaTarget, setMediaTarget] = useState(null); // { slideIdx, field: 'bgImage' | 'productImage' }
  const [uploadingField, setUploadingField] = useState(null);
  const [isSaving, setIsSaving] = useState(false);
  const [feedback, setFeedback] = useState(null);

  useEffect(() => {
    const h = themeConfig?.homePage;
    if (!h) return;
    if (h.heroStyle) setHeroStyle(h.heroStyle);
    if (typeof h.heroAutoPlay === "boolean") setHeroAutoPlay(h.heroAutoPlay);
    if (h.heroIntervalMs) setHeroIntervalMs(Number(h.heroIntervalMs));
    if (typeof h.heroShowArrows === "boolean") setHeroShowArrows(h.heroShowArrows);
    if (typeof h.heroShowDots === "boolean") setHeroShowDots(h.heroShowDots);
    if (Array.isArray(h.heroSlides) && h.heroSlides.length > 0) {
      setSlides(h.heroSlides.map(normalizeSlide));
    }
  }, [themeConfig?.homePage]);

  const activeSlide = slides[selectedSlideIdx] || slides[0] || null;

  const updateSlide = (idx, patch) => {
    setSlides((prev) =>
      prev.map((s, i) => (i === idx ? { ...s, ...patch } : s))
    );
  };

  const handleAddSlide = () => {
    const newSlide = normalizeSlide(
      {
        id: `slide-${Date.now()}`,
        isActive: true,
        badge: "New Arrival Collection ✨",
        headline: "Discover Premium",
        headlineHighlight: "Trending Products",
        headlineEnd: "Today",
        subheadline: "Fastest delivery across Bangladesh with 100% genuine quality guarantee.",
        ctaText: "Shop Now",
        campaignText: "Special Offer",
        showBadge: true,
        showHeadline: true,
        showSubheadline: true,
        showPrimaryBtn: true,
        showSecondaryBtn: true,
        showProductImage: true,
        showTrustBadges: true,
      },
      slides.length
    );
    setSlides((prev) => [...prev, newSlide]);
    setSelectedSlideIdx(slides.length);
  };

  const handleDuplicateSlide = (idx) => {
    const src = slides[idx];
    if (!src) return;
    const copy = normalizeSlide({ ...src, id: `slide-${Date.now()}`, headline: `${src.headline} (Copy)` }, slides.length);
    setSlides((prev) => [...prev.slice(0, idx + 1), copy, ...prev.slice(idx + 1)]);
    setSelectedSlideIdx(idx + 1);
  };

  const handleDeleteSlide = async (idx) => {
    if (slides.length <= 1) {
      setFeedback({ type: "error", text: "At least 1 slide must remain. You can toggle visibility off or edit it." });
      return;
    }
    const targetSlide = slides[idx];
    const remaining = slides.filter((_, i) => i !== idx);
    setSlides(remaining);
    setSelectedSlideIdx((prev) => Math.max(0, Math.min(prev, remaining.length - 1)));

    if (targetSlide) {
      try {
        const formattedSlides = remaining.map((s) => ({
          ...s,
          badgeEn: s.badge,
          headlineEn: [s.headline, s.headlineHighlight, s.headlineEnd].filter(Boolean).join(" ").trim(),
          subheadlineEn: s.subheadline,
          ctaTextEn: s.ctaText,
          campaignTextEn: s.campaignText,
        }));
        await updateThemeConfig("homePage", {
          heroStyle,
          heroAutoPlay,
          heroIntervalMs,
          heroShowArrows,
          heroShowDots,
          heroSlides: formattedSlides,
        });
        await apiClient.addToRecycleBin({
          item_type: "SLIDER",
          original_id: targetSlide.id || `slide-${idx + 1}`,
          title: [targetSlide.headline, targetSlide.headlineHighlight, targetSlide.headlineEnd].filter(Boolean).join(" ").trim() || `Hero Slide #${idx + 1}`,
          subtitle: targetSlide.badge || targetSlide.subheadline || "Homepage Hero Slider",
          thumbnail_url: targetSlide.productImage || targetSlide.bgImage || "",
          payload: targetSlide,
          deleted_by: "Admin",
        });
        try {
          realtimeService.broadcast("RECYCLE_BIN_UPDATED", { itemType: "SLIDER" });
        } catch {}
        setFeedback({ type: "success", text: "Slide moved to Recycle Bin and published to live storefront." });
        setTimeout(() => setFeedback(null), 3500);
      } catch (err) {
        console.warn("Failed to archive deleted slide:", err);
      }
    }
  };

  const handleMoveSlide = (idx, dir) => {
    const target = idx + dir;
    if (target < 0 || target >= slides.length) return;
    setSlides((prev) => {
      const next = [...prev];
      const [moved] = next.splice(idx, 1);
      next.splice(target, 0, moved);
      return next;
    });
    setSelectedSlideIdx(target);
  };

  const handleUploadSlideImage = async (e, idx, field) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setUploadingField(`${idx}-${field}`);
    try {
      const res = await apiClient.uploadProductImage(file, "sliders");
      if (res?.url) {
        updateSlide(idx, { [field]: res.url });
      }
    } catch (err) {
      setFeedback({ type: "error", text: err.message || "Image upload failed" });
    } finally {
      setUploadingField(null);
      e.target.value = "";
    }
  };

  const handleSaveAll = async () => {
    setIsSaving(true);
    setFeedback(null);
    try {
      const formattedSlides = slides.map((s) => ({
        ...s,
        badgeEn: s.badge,
        headlineEn: [s.headline, s.headlineHighlight, s.headlineEnd].filter(Boolean).join(" ").trim(),
        subheadlineEn: s.subheadline,
        ctaTextEn: s.ctaText,
        campaignTextEn: s.campaignText,
      }));

      await updateThemeConfig("homePage", {
        heroStyle,
        heroAutoPlay,
        heroIntervalMs,
        heroShowArrows,
        heroShowDots,
        heroSlides: formattedSlides,
      });

      setFeedback({
        type: "success",
        text: "Sliders & 5-Style configuration published to Central Database across all devices!",
      });
      setTimeout(() => setFeedback(null), 4000);
    } catch (err) {
      setFeedback({ type: "error", text: err.message || "Failed to save sliders." });
    } finally {
      setIsSaving(false);
    }
  };

  const handleResetDefaultSlides = async () => {
    const defaults = HERO_SLIDES.map(normalizeSlide);
    setSlides(defaults);
    setSelectedSlideIdx(0);
    setHeroStyle("style_1_glass_spotlight");
    setHeroAutoPlay(true);
    setHeroIntervalMs(6000);
    setHeroShowArrows(true);
    setHeroShowDots(true);
    await updateThemeConfig("homePage", {
      heroStyle: "style_1_glass_spotlight",
      heroAutoPlay: true,
      heroIntervalMs: 6000,
      heroShowArrows: true,
      heroShowDots: true,
      heroSlides: defaults.map((s) => ({
        ...s,
        badgeEn: s.badge,
        headlineEn: [s.headline, s.headlineHighlight, s.headlineEnd].filter(Boolean).join(" ").trim(),
        subheadlineEn: s.subheadline,
        ctaTextEn: s.ctaText,
        campaignTextEn: s.campaignText,
      })),
    });
    setFeedback({ type: "success", text: "Restored default hero slides & style." });
  };

  return (
    <div className="space-y-6 pb-12">
      {/* Top Action Header */}
      <div className="bg-white rounded-3xl border border-neutral-200/80 shadow-xs p-5 sm:p-6 flex flex-col lg:flex-row lg:items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <div className="w-11 h-11 rounded-2xl bg-emerald-50 border border-emerald-200 flex items-center justify-center text-emerald-700 shrink-0">
            <GalleryHorizontal className="w-6 h-6" />
          </div>
          <div>
            <h2 className="text-lg sm:text-xl font-black text-neutral-900">
              Hero Sliders Studio (5 Styles)
            </h2>
            <p className="text-xs text-neutral-500">
              Add unlimited slides, pick from 5 modern/classic layouts, toggle every badge/headline/image/trust item, and sync via Central DB.
            </p>
          </div>
        </div>

        <div className="flex flex-wrap items-center gap-2.5">
          <button
            type="button"
            disabled={isSaving}
            onClick={handleResetDefaultSlides}
            className="px-4 py-2.5 rounded-xl border border-neutral-300 bg-white hover:bg-neutral-50 text-neutral-700 text-xs font-bold flex items-center gap-1.5 cursor-pointer"
          >
            <RotateCcw className="w-3.5 h-3.5" />
            <span>Reset Defaults</span>
          </button>
          <button
            type="button"
            onClick={handleAddSlide}
            className="px-4 py-2.5 rounded-xl bg-neutral-900 hover:bg-neutral-800 text-white text-xs font-bold flex items-center gap-1.5 cursor-pointer"
          >
            <Plus className="w-4 h-4" />
            <span>Add New Slide</span>
          </button>
          <button
            type="button"
            disabled={isSaving}
            onClick={handleSaveAll}
            className="px-5 py-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-extrabold shadow-md shadow-emerald-600/20 flex items-center gap-2 cursor-pointer disabled:opacity-60"
          >
            {isSaving ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
            <span>{isSaving ? "Publishing..." : "Save & Publish Sliders"}</span>
          </button>
        </div>
      </div>

      {feedback && (
        <div
          className={`p-3.5 rounded-2xl border text-xs font-bold flex items-center gap-2 ${
            feedback.type === "success"
              ? "bg-emerald-50 border-emerald-200 text-emerald-800"
              : "bg-rose-50 border-rose-200 text-rose-800"
          }`}
        >
          <CheckCircle2 className="w-4 h-4 shrink-0" />
          <span>{feedback.text}</span>
        </div>
      )}

      {/* 5 Slider Design Styles Picker */}
      <div className="bg-white rounded-3xl border border-neutral-200/80 shadow-xs p-5 space-y-4">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <h3 className="text-xs font-extrabold uppercase tracking-wider text-neutral-800 flex items-center gap-1.5">
              <LayoutTemplate className="w-4 h-4 text-emerald-600" />
              <span>Select Hero Slider Style (5 Modern & Classic Layouts)</span>
            </h3>
            <p className="text-[11px] text-neutral-500 mt-0.5">
              Controls the visual architecture of your Storefront Hero Slider across Desktop, Tablet & Mobile.
            </p>
          </div>

          {/* Playback controls */}
          <div className="flex flex-wrap items-center gap-3 text-xs">
            <label className="inline-flex items-center gap-1.5 font-bold text-neutral-700 cursor-pointer">
              <input
                type="checkbox"
                checked={heroAutoPlay}
                onChange={(e) => setHeroAutoPlay(e.target.checked)}
                className="rounded border-neutral-300 text-emerald-600"
              />
              <span>Autoplay</span>
            </label>
            <label className="inline-flex items-center gap-1.5 font-bold text-neutral-700 cursor-pointer">
              <input
                type="checkbox"
                checked={heroShowArrows}
                onChange={(e) => setHeroShowArrows(e.target.checked)}
                className="rounded border-neutral-300 text-emerald-600"
              />
              <span>Arrows</span>
            </label>
            <label className="inline-flex items-center gap-1.5 font-bold text-neutral-700 cursor-pointer">
              <input
                type="checkbox"
                checked={heroShowDots}
                onChange={(e) => setHeroShowDots(e.target.checked)}
                className="rounded border-neutral-300 text-emerald-600"
              />
              <span>Dots</span>
            </label>
            <select
              value={heroIntervalMs}
              onChange={(e) => setHeroIntervalMs(Number(e.target.value))}
              className="px-2.5 py-1 rounded-lg border border-neutral-300 bg-white text-xs font-semibold"
              title="Autoplay slide speed"
            >
              <option value={4000}>Fast (4s)</option>
              <option value={6000}>Standard (6s)</option>
              <option value={9000}>Relaxed (9s)</option>
            </select>
          </div>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-3">
          {SLIDER_STYLES.map((st) => {
            const active = heroStyle === st.id;
            return (
              <button
                key={st.id}
                type="button"
                onClick={() => setHeroStyle(st.id)}
                className={`p-3.5 rounded-2xl border text-left transition-all cursor-pointer flex flex-col justify-between ${
                  active
                    ? "border-emerald-600 bg-emerald-50/50 ring-2 ring-emerald-500/20 shadow-xs"
                    : "border-neutral-200 hover:border-neutral-300 bg-white"
                }`}
              >
                <div className="space-y-2">
                  <div className={`h-14 rounded-xl bg-gradient-to-br ${st.accent} p-2 flex items-end justify-between`}>
                    <span className="text-[9px] font-black uppercase px-2 py-0.5 rounded-full bg-black/30 text-white backdrop-blur-xs">
                      {st.badge}
                    </span>
                    {active && <CheckCircle2 className="w-4 h-4 text-white drop-shadow" />}
                  </div>
                  <div className="text-xs font-extrabold text-neutral-900 leading-snug">
                    {st.name}
                  </div>
                  <p className="text-[11px] text-neutral-500 leading-relaxed line-clamp-3">
                    {st.description}
                  </p>
                </div>
              </button>
            );
          })}
        </div>
      </div>

      {/* Main Split: Slides Roster + Active Slide Full Editor */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
        {/* Left Slides List */}
        <div className="lg:col-span-4 bg-white rounded-3xl border border-neutral-200/80 shadow-xs p-4 space-y-3">
          <div className="flex items-center justify-between px-1">
            <h3 className="text-xs font-extrabold uppercase tracking-wider text-neutral-700">
              Slides Queue ({slides.length})
            </h3>
            <button
              type="button"
              onClick={handleAddSlide}
              className="text-xs font-bold text-emerald-700 hover:underline flex items-center gap-1 cursor-pointer"
            >
              <Plus className="w-3.5 h-3.5" />
              <span>Add Slide</span>
            </button>
          </div>

          <div className="space-y-2.5 max-h-[650px] overflow-y-auto pr-1">
            {slides.map((slide, idx) => {
              const isSelected = idx === selectedSlideIdx;
              return (
                <div
                  key={slide.id}
                  onClick={() => setSelectedSlideIdx(idx)}
                  className={`p-3 rounded-2xl border transition-all cursor-pointer space-y-2 ${
                    isSelected
                      ? "border-emerald-600 bg-emerald-50/40 shadow-xs"
                      : "border-neutral-200 hover:border-neutral-300 bg-white"
                  }`}
                >
                  <div className="flex items-center gap-2.5">
                    <div className="w-14 h-11 rounded-xl overflow-hidden bg-neutral-900 border border-neutral-200 shrink-0">
                      {slide.bgImage ? (
                        <img src={slide.bgImage} alt="" className="w-full h-full object-cover" />
                      ) : (
                        <div className="w-full h-full flex items-center justify-center text-neutral-500">
                          <Images className="w-4 h-4" />
                        </div>
                      )}
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-1.5">
                        <span className="text-[10px] font-black text-neutral-400">#{idx + 1}</span>
                        {!slide.isActive && (
                          <span className="text-[9px] font-bold px-1.5 py-0.2 rounded bg-neutral-200 text-neutral-600">
                            Hidden
                          </span>
                        )}
                      </div>
                      <p className="text-xs font-bold text-neutral-900 truncate">
                        {slide.headline || slide.badge || "Untitled Slide"}
                      </p>
                    </div>
                  </div>

                  <div className="flex items-center justify-between gap-1 pt-1 border-t border-neutral-100" onClick={(e) => e.stopPropagation()}>
                    <div className="flex items-center gap-1">
                      <button
                        type="button"
                        disabled={idx === 0}
                        onClick={() => handleMoveSlide(idx, -1)}
                        className="p-1 rounded-lg hover:bg-neutral-100 text-neutral-500 disabled:opacity-30 cursor-pointer"
                        title="Move Up"
                      >
                        <ArrowUp className="w-3.5 h-3.5" />
                      </button>
                      <button
                        type="button"
                        disabled={idx === slides.length - 1}
                        onClick={() => handleMoveSlide(idx, 1)}
                        className="p-1 rounded-lg hover:bg-neutral-100 text-neutral-500 disabled:opacity-30 cursor-pointer"
                        title="Move Down"
                      >
                        <ArrowDown className="w-3.5 h-3.5" />
                      </button>
                      <button
                        type="button"
                        onClick={() => updateSlide(idx, { isActive: !slide.isActive })}
                        className={`p-1 rounded-lg hover:bg-neutral-100 cursor-pointer ${
                          slide.isActive ? "text-emerald-600" : "text-neutral-400"
                        }`}
                        title={slide.isActive ? "Hide Slide" : "Show Slide"}
                      >
                        {slide.isActive ? <Eye className="w-3.5 h-3.5" /> : <EyeOff className="w-3.5 h-3.5" />}
                      </button>
                    </div>
                    <div className="flex items-center gap-1">
                      <button
                        type="button"
                        onClick={() => handleDuplicateSlide(idx)}
                        className="p-1 rounded-lg hover:bg-neutral-100 text-neutral-600 cursor-pointer"
                        title="Duplicate Slide"
                      >
                        <Copy className="w-3.5 h-3.5" />
                      </button>
                      <button
                        type="button"
                        onClick={() => handleDeleteSlide(idx)}
                        className="p-1 rounded-lg hover:bg-rose-50 text-rose-600 cursor-pointer"
                        title="Delete Slide"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {/* Right Selected Slide Editor */}
        {activeSlide && (
          <div className="lg:col-span-8 bg-white rounded-3xl border border-neutral-200/80 shadow-xs p-5 sm:p-6 space-y-6">
            <div className="flex flex-wrap items-center justify-between gap-3 border-b border-neutral-100 pb-4">
              <div>
                <span className="text-[11px] font-bold uppercase tracking-wider text-emerald-700">
                  Editing Slide #{selectedSlideIdx + 1}
                </span>
                <h3 className="text-base font-black text-neutral-900">
                  {activeSlide.headline || "Untitled Slide"}
                </h3>
              </div>

              <div className="flex items-center gap-3">
                <select
                  value={activeSlide.slideStyle || "inherit"}
                  onChange={(e) => updateSlide(selectedSlideIdx, { slideStyle: e.target.value })}
                  className="px-3 py-1.5 rounded-xl border border-neutral-300 bg-neutral-50 text-xs font-bold text-neutral-800"
                  title="Optional per-slide layout override"
                >
                  <option value="inherit">Use Global Slider Style</option>
                  {SLIDER_STYLES.map((st) => (
                    <option key={st.id} value={st.id}>
                      Override: {st.name}
                    </option>
                  ))}
                </select>
                <label className="inline-flex items-center gap-1.5 text-xs font-bold text-neutral-700 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={activeSlide.isActive}
                    onChange={(e) => updateSlide(selectedSlideIdx, { isActive: e.target.checked })}
                    className="rounded border-neutral-300 text-emerald-600"
                  />
                  <span>Active</span>
                </label>
              </div>
            </div>

            {/* 1. Background Image & Right Spotlight Product Image */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
              {/* Background Image */}
              <div className="p-4 rounded-2xl bg-neutral-50 border border-neutral-200 space-y-3">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-extrabold text-neutral-800">
                    Slide Background Image
                  </span>
                  {activeSlide.bgImage && (
                    <button
                      type="button"
                      onClick={() => updateSlide(selectedSlideIdx, { bgImage: "" })}
                      className="text-[11px] font-bold text-rose-600 hover:underline cursor-pointer"
                    >
                      Remove
                    </button>
                  )}
                </div>

                <div className="h-28 rounded-xl overflow-hidden bg-neutral-900 border border-neutral-200 flex items-center justify-center relative">
                  {activeSlide.bgImage ? (
                    <>
                      <img src={activeSlide.bgImage} alt="" className="w-full h-full object-cover" />
                      <div
                        className="absolute inset-0 bg-neutral-950"
                        style={{ opacity: (activeSlide.overlayOpacity ?? 70) / 100 }}
                      />
                    </>
                  ) : (
                    <span className="text-xs text-neutral-400">No background image selected</span>
                  )}
                </div>

                <div className="flex gap-2">
                  <button
                    type="button"
                    onClick={() => setMediaTarget({ slideIdx: selectedSlideIdx, field: "bgImage" })}
                    className="flex-1 py-2 px-3 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold flex items-center justify-center gap-1.5 cursor-pointer"
                  >
                    <Images className="w-3.5 h-3.5" />
                    <span>Media Library</span>
                  </button>
                  <label className="py-2 px-3 rounded-xl border border-neutral-300 bg-white hover:bg-neutral-100 text-neutral-800 text-xs font-bold flex items-center gap-1.5 cursor-pointer">
                    {uploadingField === `${selectedSlideIdx}-bgImage` ? (
                      <Loader2 className="w-3.5 h-3.5 animate-spin" />
                    ) : (
                      <Upload className="w-3.5 h-3.5" />
                    )}
                    <span>Upload</span>
                    <input
                      type="file"
                      accept="image/*"
                      className="hidden"
                      onChange={(e) => handleUploadSlideImage(e, selectedSlideIdx, "bgImage")}
                    />
                  </label>
                </div>

                <div className="space-y-1">
                  <div className="flex justify-between text-[11px] font-bold text-neutral-600">
                    <span>Backdrop Overlay Darkness</span>
                    <span>{activeSlide.overlayOpacity ?? 70}%</span>
                  </div>
                  <input
                    type="range"
                    min="0"
                    max="90"
                    value={activeSlide.overlayOpacity ?? 70}
                    onChange={(e) => updateSlide(selectedSlideIdx, { overlayOpacity: Number(e.target.value) })}
                    className="w-full accent-emerald-600"
                  />
                </div>
              </div>

              {/* Right-Side Spotlight Product Image (OPTIONAL!) */}
              <div className="p-4 rounded-2xl bg-neutral-50 border border-neutral-200 space-y-3">
                <div className="flex items-center justify-between gap-2">
                  <label className="inline-flex items-center gap-2 text-xs font-extrabold text-neutral-800 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={activeSlide.showProductImage !== false}
                      onChange={(e) => updateSlide(selectedSlideIdx, { showProductImage: e.target.checked })}
                      className="rounded border-neutral-300 text-emerald-600"
                    />
                    <span>Show Right-Side Product Image</span>
                  </label>
                  {activeSlide.productImage && (
                    <button
                      type="button"
                      onClick={() => updateSlide(selectedSlideIdx, { productImage: "" })}
                      className="text-[11px] font-bold text-rose-600 hover:underline cursor-pointer"
                    >
                      Remove
                    </button>
                  )}
                </div>

                {activeSlide.showProductImage !== false ? (
                  <>
                    <div className="h-28 rounded-xl overflow-hidden bg-neutral-900 border border-neutral-200 flex items-center justify-center p-2">
                      {activeSlide.productImage ? (
                        <img src={activeSlide.productImage} alt="" className="max-h-full max-w-full object-contain" />
                      ) : (
                        <span className="text-xs text-neutral-400">No right spotlight image</span>
                      )}
                    </div>

                    <div className="flex gap-2">
                      <button
                        type="button"
                        onClick={() => setMediaTarget({ slideIdx: selectedSlideIdx, field: "productImage" })}
                        className="flex-1 py-2 px-3 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold flex items-center justify-center gap-1.5 cursor-pointer"
                      >
                        <Images className="w-3.5 h-3.5" />
                        <span>Media Library</span>
                      </button>
                      <label className="py-2 px-3 rounded-xl border border-neutral-300 bg-white hover:bg-neutral-100 text-neutral-800 text-xs font-bold flex items-center gap-1.5 cursor-pointer">
                        {uploadingField === `${selectedSlideIdx}-productImage` ? (
                          <Loader2 className="w-3.5 h-3.5 animate-spin" />
                        ) : (
                          <Upload className="w-3.5 h-3.5" />
                        )}
                        <span>Upload</span>
                        <input
                          type="file"
                          accept="image/*"
                          className="hidden"
                          onChange={(e) => handleUploadSlideImage(e, selectedSlideIdx, "productImage")}
                        />
                      </label>
                    </div>
                  </>
                ) : (
                  <div className="h-40 rounded-xl border-2 border-dashed border-neutral-300 flex items-center justify-center text-center p-4">
                    <p className="text-xs text-neutral-500 font-medium">
                      Right-side spotlight image is hidden for this slide. Left content will expand cleanly.
                    </p>
                  </div>
                )}
              </div>
            </div>

            {/* 2. Optional Top Badge / Header Pill */}
            <div className="p-4 rounded-2xl bg-neutral-50 border border-neutral-200 space-y-2.5">
              <div className="flex items-center justify-between">
                <label className="inline-flex items-center gap-2 text-xs font-extrabold text-neutral-800 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={activeSlide.showBadge !== false}
                    onChange={(e) => updateSlide(selectedSlideIdx, { showBadge: e.target.checked })}
                    className="rounded border-neutral-300 text-emerald-600"
                  />
                  <span>Show Top Pill Header (e.g. 360° Rotating Organizer Collection)</span>
                </label>
              </div>
              {activeSlide.showBadge !== false && (
                <input
                  type="text"
                  value={activeSlide.badge || ""}
                  onChange={(e) => updateSlide(selectedSlideIdx, { badge: e.target.value })}
                  placeholder="Optional top badge / collection label..."
                  className="w-full px-3.5 py-2.5 rounded-xl bg-white border border-neutral-300 text-xs font-semibold"
                />
              )}
            </div>

            {/* 3. Headline & Short Description */}
            <div className="p-4 rounded-2xl bg-neutral-50 border border-neutral-200 space-y-3">
              <div className="flex flex-wrap items-center justify-between gap-2">
                <label className="inline-flex items-center gap-2 text-xs font-extrabold text-neutral-800 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={activeSlide.showHeadline !== false}
                    onChange={(e) => updateSlide(selectedSlideIdx, { showHeadline: e.target.checked })}
                    className="rounded border-neutral-300 text-emerald-600"
                  />
                  <span>Show Main Headline</span>
                </label>
                <label className="inline-flex items-center gap-2 text-xs font-extrabold text-neutral-800 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={activeSlide.showSubheadline !== false}
                    onChange={(e) => updateSlide(selectedSlideIdx, { showSubheadline: e.target.checked })}
                    className="rounded border-neutral-300 text-emerald-600"
                  />
                  <span>Show Short Description</span>
                </label>
              </div>

              {activeSlide.showHeadline !== false && (
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                  <div className="space-y-1">
                    <label className="text-[11px] font-bold text-neutral-600">Headline Part 1</label>
                    <input
                      type="text"
                      value={activeSlide.headline || ""}
                      onChange={(e) => updateSlide(selectedSlideIdx, { headline: e.target.value })}
                      placeholder="Smart Beauty & Makeup"
                      className="w-full px-3 py-2 rounded-xl bg-white border border-neutral-300 text-xs font-bold"
                    />
                  </div>
                  <div className="space-y-1">
                    <label className="text-[11px] font-bold text-emerald-700">Highlighted Words</label>
                    <input
                      type="text"
                      value={activeSlide.headlineHighlight || ""}
                      onChange={(e) => updateSlide(selectedSlideIdx, { headlineHighlight: e.target.value })}
                      placeholder="Organizer Collection"
                      className="w-full px-3 py-2 rounded-xl bg-white border border-neutral-300 text-xs font-bold"
                    />
                  </div>
                  <div className="space-y-1">
                    <label className="text-[11px] font-bold text-neutral-600">Headline End (Optional)</label>
                    <input
                      type="text"
                      value={activeSlide.headlineEnd || ""}
                      onChange={(e) => updateSlide(selectedSlideIdx, { headlineEnd: e.target.value })}
                      placeholder="For Your Home"
                      className="w-full px-3 py-2 rounded-xl bg-white border border-neutral-300 text-xs font-bold"
                    />
                  </div>
                </div>
              )}

              {activeSlide.showSubheadline !== false && (
                <div className="space-y-1">
                  <label className="text-[11px] font-bold text-neutral-600">Short Description</label>
                  <textarea
                    rows={2}
                    value={activeSlide.subheadline || ""}
                    onChange={(e) => updateSlide(selectedSlideIdx, { subheadline: e.target.value })}
                    className="w-full px-3 py-2 rounded-xl bg-white border border-neutral-300 text-xs"
                  />
                </div>
              )}
            </div>

            {/* 4. Two Action Buttons + Linked Product */}
            <div className="p-4 rounded-2xl bg-neutral-50 border border-neutral-200 space-y-4">
              <div className="flex flex-wrap items-center justify-between gap-2">
                <span className="text-xs font-extrabold uppercase tracking-wider text-neutral-800">
                  CTA Buttons & Product Link
                </span>
                <div className="flex items-center gap-2">
                  <span className="text-[11px] font-bold text-neutral-600">Linked Product:</span>
                  <select
                    value={activeSlide.productId || ""}
                    onChange={(e) => {
                      const prod = products.find((p) => p.id === e.target.value);
                      updateSlide(selectedSlideIdx, {
                        productId: e.target.value,
                        productSlug: prod?.slug || "",
                      });
                    }}
                    className="px-3 py-1.5 rounded-xl bg-white border border-neutral-300 text-xs font-semibold max-w-[220px]"
                  >
                    <option value="">-- Optional Linked Product --</option>
                    {products.map((p) => (
                      <option key={p.id} value={p.id}>
                        {p.name}
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {/* Primary Button */}
                <div className="p-3.5 rounded-xl bg-white border border-neutral-200 space-y-2.5">
                  <label className="inline-flex items-center gap-2 text-xs font-extrabold text-neutral-800 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={activeSlide.showPrimaryBtn !== false}
                      onChange={(e) => updateSlide(selectedSlideIdx, { showPrimaryBtn: e.target.checked })}
                      className="rounded border-neutral-300 text-emerald-600"
                    />
                    <span>Show Button #1 (Primary CTA)</span>
                  </label>

                  {activeSlide.showPrimaryBtn !== false && (
                    <div className="space-y-2">
                      <input
                        type="text"
                        value={activeSlide.ctaText || ""}
                        onChange={(e) => updateSlide(selectedSlideIdx, { ctaText: e.target.value })}
                        placeholder="Button Label (e.g. Shop Now)"
                        className="w-full px-3 py-2 rounded-xl border border-neutral-300 text-xs font-bold"
                      />
                      <div className="grid grid-cols-2 gap-2">
                        <select
                          value={activeSlide.primaryBtnStyle || "gradient_emerald"}
                          onChange={(e) => updateSlide(selectedSlideIdx, { primaryBtnStyle: e.target.value })}
                          className="px-2.5 py-1.5 rounded-xl border border-neutral-300 text-xs font-semibold bg-white"
                        >
                          {PRIMARY_BTN_STYLES.map((st) => (
                            <option key={st.id} value={st.id}>{st.label}</option>
                          ))}
                        </select>
                        <select
                          value={activeSlide.primaryBtnAction || "scroll_products"}
                          onChange={(e) => updateSlide(selectedSlideIdx, { primaryBtnAction: e.target.value })}
                          className="px-2.5 py-1.5 rounded-xl border border-neutral-300 text-xs font-semibold bg-white"
                        >
                          <option value="scroll_products">Scroll to Products</option>
                          <option value="open_product">Open Linked Product</option>
                          <option value="open_shop">Go to Shop Catalog</option>
                          <option value="open_campaign">Open Campaign Page</option>
                          <option value="custom_url">Custom URL</option>
                        </select>
                      </div>
                      {activeSlide.primaryBtnAction === "custom_url" && (
                        <input
                          type="text"
                          value={activeSlide.primaryBtnUrl || ""}
                          onChange={(e) => updateSlide(selectedSlideIdx, { primaryBtnUrl: e.target.value })}
                          placeholder="/shop or https://..."
                          className="w-full px-3 py-1.5 rounded-xl border border-neutral-300 text-xs font-mono"
                        />
                      )}
                    </div>
                  )}
                </div>

                {/* Secondary Button */}
                <div className="p-3.5 rounded-xl bg-white border border-neutral-200 space-y-2.5">
                  <label className="inline-flex items-center gap-2 text-xs font-extrabold text-neutral-800 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={activeSlide.showSecondaryBtn !== false}
                      onChange={(e) => updateSlide(selectedSlideIdx, { showSecondaryBtn: e.target.checked })}
                      className="rounded border-neutral-300 text-emerald-600"
                    />
                    <span>Show Button #2 (Secondary CTA)</span>
                  </label>

                  {activeSlide.showSecondaryBtn !== false && (
                    <div className="space-y-2">
                      <input
                        type="text"
                        value={activeSlide.campaignText || ""}
                        onChange={(e) => updateSlide(selectedSlideIdx, { campaignText: e.target.value })}
                        placeholder="Button Label (e.g. Special Offer)"
                        className="w-full px-3 py-2 rounded-xl border border-neutral-300 text-xs font-bold"
                      />
                      <div className="grid grid-cols-2 gap-2">
                        <select
                          value={activeSlide.secondaryBtnStyle || "glass_outline"}
                          onChange={(e) => updateSlide(selectedSlideIdx, { secondaryBtnStyle: e.target.value })}
                          className="px-2.5 py-1.5 rounded-xl border border-neutral-300 text-xs font-semibold bg-white"
                        >
                          {SECONDARY_BTN_STYLES.map((st) => (
                            <option key={st.id} value={st.id}>{st.label}</option>
                          ))}
                        </select>
                        <select
                          value={activeSlide.secondaryBtnAction || "open_campaign"}
                          onChange={(e) => updateSlide(selectedSlideIdx, { secondaryBtnAction: e.target.value })}
                          className="px-2.5 py-1.5 rounded-xl border border-neutral-300 text-xs font-semibold bg-white"
                        >
                          <option value="open_campaign">Open Campaign Page</option>
                          <option value="open_product">Open Linked Product</option>
                          <option value="open_shop">Go to Shop Catalog</option>
                          <option value="scroll_products">Scroll to Products</option>
                          <option value="custom_url">Custom URL</option>
                        </select>
                      </div>
                      {activeSlide.secondaryBtnAction === "custom_url" && (
                        <input
                          type="text"
                          value={activeSlide.secondaryBtnUrl || ""}
                          onChange={(e) => updateSlide(selectedSlideIdx, { secondaryBtnUrl: e.target.value })}
                          placeholder="/products/... or https://..."
                          className="w-full px-3 py-1.5 rounded-xl border border-neutral-300 text-xs font-mono"
                        />
                      )}
                    </div>
                  )}
                </div>
              </div>
            </div>

            {/* 5. Bottom Trust Items (Optional + Customizable Variations) */}
            <div className="p-4 rounded-2xl bg-neutral-50 border border-neutral-200 space-y-3">
              <div className="flex flex-wrap items-center justify-between gap-2">
                <label className="inline-flex items-center gap-2 text-xs font-extrabold text-neutral-800 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={activeSlide.showTrustBadges !== false}
                    onChange={(e) => updateSlide(selectedSlideIdx, { showTrustBadges: e.target.checked })}
                    className="rounded border-neutral-300 text-emerald-600"
                  />
                  <span>Show Bottom Highlights (e.g. 100% Original Products, 7 Days Replacement)</span>
                </label>

                {activeSlide.showTrustBadges !== false && (
                  <button
                    type="button"
                    onClick={() => {
                      const nextItems = [...(activeSlide.trustItems || []), { icon: "sparkles", text: "Fast Nationwide Delivery" }];
                      updateSlide(selectedSlideIdx, { trustItems: nextItems });
                    }}
                    className="px-2.5 py-1 rounded-lg bg-emerald-600 hover:bg-emerald-700 text-white text-[11px] font-bold flex items-center gap-1 cursor-pointer"
                  >
                    <Plus className="w-3 h-3" />
                    <span>Add Item</span>
                  </button>
                )}
              </div>

              {activeSlide.showTrustBadges !== false && (
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                  {(activeSlide.trustItems || []).map((item, tIdx) => (
                    <div key={tIdx} className="flex items-center gap-1.5 bg-white p-2 rounded-xl border border-neutral-200">
                      <select
                        value={item.icon || "check"}
                        onChange={(e) => {
                          const next = [...(activeSlide.trustItems || [])];
                          next[tIdx] = { ...next[tIdx], icon: e.target.value };
                          updateSlide(selectedSlideIdx, { trustItems: next });
                        }}
                        className="px-2 py-1.5 rounded-lg bg-neutral-50 border border-neutral-200 text-[11px] font-semibold"
                      >
                        {TRUST_ICON_OPTIONS.map((opt) => (
                          <option key={opt.id} value={opt.id}>{opt.label}</option>
                        ))}
                      </select>
                      <input
                        type="text"
                        value={item.text || ""}
                        onChange={(e) => {
                          const next = [...(activeSlide.trustItems || [])];
                          next[tIdx] = { ...next[tIdx], text: e.target.value };
                          updateSlide(selectedSlideIdx, { trustItems: next });
                        }}
                        placeholder="Highlight text..."
                        className="flex-1 min-w-0 px-2.5 py-1.5 rounded-lg border border-neutral-200 text-xs font-medium"
                      />
                      <button
                        type="button"
                        onClick={() => {
                          const next = (activeSlide.trustItems || []).filter((_, i) => i !== tIdx);
                          updateSlide(selectedSlideIdx, { trustItems: next });
                        }}
                        className="p-1.5 rounded-lg hover:bg-rose-50 text-rose-500 cursor-pointer shrink-0"
                        title="Remove item"
                      >
                        <X className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        )}
      </div>

      {/* Centralized Media Library Picker Modal */}
      <MediaPickerModal
        isOpen={Boolean(mediaTarget)}
        onClose={() => setMediaTarget(null)}
        defaultFolder="sliders"
        uploadFolder="sliders"
        title={
          mediaTarget?.field === "productImage"
            ? "Select Right Spotlight Product Image"
            : "Select Slide Background Image"
        }
        onSelect={(url) => {
          if (mediaTarget && url && typeof url === "string") {
            updateSlide(mediaTarget.slideIdx, { [mediaTarget.field]: url });
          }
        }}
      />
    </div>
  );
};

export default AdminSliders;

