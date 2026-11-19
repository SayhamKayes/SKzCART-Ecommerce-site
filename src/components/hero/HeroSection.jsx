import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import {
  ShoppingBag,
  ArrowRight,
  Flame,
  Truck,
  RotateCcw,
  ShieldCheck,
  CheckCircle2,
  Sparkles,
  ChevronLeft,
  ChevronRight,
  Zap,
} from 'lucide-react';
import { useLanguage } from '../../Context/LanguageContext';
import { useThemeConfig } from '../frontPanel/FrontPanelContext';
import { DEFAULT_THEME_CONFIG } from '../frontPanel/defaultThemeConfig';
import { sanitizeText } from '../../utils/textSanitizer';

// Slide assets:
import lanternBgImg from '../../assets/retro_camping_lantern1.jpg';
import lanternProductImg from '../../assets/Glowing Olive Green Camping Lantern.png';
import brushHolderBgImg from '../../assets/rotating_makeup_brush_holder1.jpg';
import brushHolderProductImg from '../../assets/Amber Glass Makeup Brush Organizer.png';
import massageGunBgImg from '../../assets/facial_massage_gun_light_age1.jpg';
import massageGunProductImg from '../../assets/Blue Fascia Massage Gun Packaging.png';

export const HERO_SLIDES = [
  {
    id: 'slide-1',
    isActive: true,
    productId: 'prod-1',
    productSlug: '360-rotating-makeup-brush-organizer',
    bgImage: brushHolderBgImg,
    productImage: brushHolderProductImg,
    showProductImage: true,
    overlayOpacity: 70,
    showBadge: true,
    badge: '360° Rotating Organizer Collection 🔥',
    badgeEn: '360° Rotating Organizer Collection 🔥',
    showHeadline: true,
    headline: 'Smart Beauty & Makeup',
    headlineHighlight: 'Organizer Collection',
    headlineEnd: 'For Your Dressing Table',
    headlineEn: 'Smart Beauty & Makeup Organizer Collection',
    showSubheadline: true,
    subheadline: 'Air-tight dustproof & smooth rotation. Keep your cosmetics organized, clean and luxurious.',
    subheadlineEn: 'Air-tight dustproof & smooth rotation. Keep your cosmetics organized, clean and luxurious.',
    showPrimaryBtn: true,
    ctaText: 'Explore Collection',
    ctaTextEn: 'Explore Collection',
    showSecondaryBtn: true,
    campaignText: 'Special Offer',
    campaignTextEn: 'Special Offer',
    showTrustBadges: true,
  },
  {
    id: 'slide-2',
    isActive: true,
    productId: 'prod-2',
    productSlug: 'retro-rechargeable-camping-lantern',
    bgImage: lanternBgImg,
    productImage: lanternProductImg,
    showProductImage: true,
    overlayOpacity: 70,
    showBadge: true,
    badge: 'Home delivery & COD across all 64 districts in Bangladesh',
    badgeEn: 'Home delivery & COD across all 64 districts in Bangladesh',
    showHeadline: true,
    headline: "Bangladesh's #1 Trusted",
    headlineHighlight: 'Premium Gadgets & Lifestyle',
    headlineEnd: 'Store',
    headlineEn: "Bangladesh's #1 Trusted Premium Gadget & Lifestyle Store",
    showSubheadline: true,
    subheadline: '100% authentic gadgets with lightning-fast delivery and hassle-free returns. Inspect your parcel before paying.',
    subheadlineEn: '100% authentic gadgets with lightning-fast delivery and hassle-free returns. Inspect your parcel before paying.',
    showPrimaryBtn: true,
    ctaText: 'Shop Now',
    ctaTextEn: 'Shop Now',
    showSecondaryBtn: true,
    campaignText: 'Special Campaign Offer',
    campaignTextEn: 'Special Campaign Offer',
    showTrustBadges: true,
  },
  {
    id: 'slide-3',
    isActive: true,
    productId: 'prod-4',
    productSlug: 'facial-massage-gun-light-age',
    bgImage: massageGunBgImg,
    productImage: massageGunProductImg,
    showProductImage: true,
    overlayOpacity: 70,
    showBadge: true,
    badge: 'Health & Relaxation Gadget ⚡',
    badgeEn: 'Health & Relaxation Gadget ⚡',
    showHeadline: true,
    headline: 'Powerful Deep Tissue',
    headlineHighlight: 'Body Massage Gun',
    headlineEnd: '',
    headlineEn: 'Powerful Deep Tissue Body Massage Gun',
    showSubheadline: true,
    subheadline: 'Ultra-silent powerful motor with long battery life. Enjoy professional deep tissue relaxation anytime at home.',
    subheadlineEn: 'Ultra-silent powerful motor with long battery life. Enjoy professional deep tissue relaxation anytime at home.',
    showPrimaryBtn: true,
    ctaText: 'Order Now',
    ctaTextEn: 'Order Now',
    showSecondaryBtn: true,
    campaignText: 'Hot Deal Offer',
    campaignTextEn: 'Hot Deal Offer',
    showTrustBadges: true,
  },
];

const renderTrustIcon = (iconKey, isLightTheme = false) => {
  const baseClass = "w-3.5 h-3.5 sm:w-4 sm:h-4";
  switch (iconKey) {
    case "truck":
      return <Truck className={`${baseClass} ${isLightTheme ? "text-emerald-700" : "text-emerald-300"}`} />;
    case "rotate":
      return <RotateCcw className={`${baseClass} ${isLightTheme ? "text-amber-600" : "text-amber-300"}`} />;
    case "shield":
      return <ShieldCheck className={`${baseClass} ${isLightTheme ? "text-teal-700" : "text-teal-300"}`} />;
    case "sparkles":
      return <Sparkles className={`${baseClass} ${isLightTheme ? "text-amber-600" : "text-amber-300"}`} />;
    case "zap":
      return <Zap className={`${baseClass} ${isLightTheme ? "text-emerald-700" : "text-emerald-300"}`} />;
    case "flame":
      return <Flame className={`${baseClass} ${isLightTheme ? "text-orange-600" : "text-orange-300"}`} />;
    default:
      return <CheckCircle2 className={`${baseClass} ${isLightTheme ? "text-sky-700" : "text-sky-300"}`} />;
  }
};

const getPrimaryBtnClass = (variant = "gradient_emerald", isLightStyle = false) => {
  switch (variant) {
    case "solid_amber":
      return "bg-amber-400 hover:bg-amber-300 text-neutral-950 shadow-lg shadow-amber-500/25";
    case "solid_dark":
      return "bg-neutral-900 hover:bg-neutral-800 text-white border border-white/15 shadow-lg";
    case "solid_white":
      return isLightStyle
        ? "bg-emerald-700 hover:bg-emerald-800 text-white shadow-lg"
        : "bg-white hover:bg-neutral-100 text-neutral-950 shadow-lg";
    case "outline_glow":
      return isLightStyle
        ? "bg-emerald-50 hover:bg-emerald-100 text-emerald-900 border-2 border-emerald-600"
        : "bg-emerald-500/20 hover:bg-emerald-500/35 text-emerald-200 border border-emerald-400/60 backdrop-blur-md";
    default:
      return "bg-gradient-to-r from-emerald-500 via-emerald-600 to-teal-600 hover:from-emerald-600 hover:to-teal-700 text-white shadow-lg shadow-emerald-950/40";
  }
};

const getSecondaryBtnClass = (variant = "glass_outline", isLightStyle = false) => {
  switch (variant) {
    case "solid_dark":
      return "bg-neutral-900/90 hover:bg-neutral-900 text-white border border-white/15";
    case "amber_outline":
      return isLightStyle
        ? "bg-amber-50 hover:bg-amber-100 text-amber-900 border border-amber-400"
        : "bg-amber-400/10 hover:bg-amber-400/20 text-amber-300 border border-amber-400/50 backdrop-blur-sm";
    case "white_outline":
      return isLightStyle
        ? "bg-white hover:bg-neutral-100 text-neutral-900 border border-neutral-300"
        : "bg-transparent hover:bg-white/15 text-white border border-white/40";
    default:
      return isLightStyle
        ? "bg-neutral-100 hover:bg-neutral-200 text-neutral-900 border border-neutral-200"
        : "bg-white/10 hover:bg-white/20 text-white border border-white/20 backdrop-blur-sm";
  }
};

export const HeroSection = ({
  products = [],
  onNavigateToLanding,
  onNavigateToView,
  onSelectProduct,
  slides = HERO_SLIDES,
}) => {
  const { isEnglish } = useLanguage();
  const { themeConfig } = useThemeConfig();
  const homeConfig = themeConfig?.homePage || {};

  const [activeIndex, setActiveIndex] = useState(0);
  const [isAutoPlaying, setIsAutoPlaying] = useState(homeConfig.heroAutoPlay !== false);
  const [touchStart, setTouchStart] = useState(null);
  const [touchEnd, setTouchEnd] = useState(null);

  useEffect(() => {
    setIsAutoPlaying(homeConfig.heroAutoPlay !== false);
  }, [homeConfig.heroAutoPlay]);

  const minSwipeDistance = 45;

  const onTouchStart = (e) => {
    setTouchEnd(null);
    setTouchStart(e.targetTouches[0].clientX);
  };

  const onTouchMove = (e) => {
    setTouchEnd(e.targetTouches[0].clientX);
  };

  const onTouchEnd = () => {
    if (!touchStart || !touchEnd) return;
    const distance = touchStart - touchEnd;
    if (distance > minSwipeDistance) handleNext();
    else if (distance < -minSwipeDistance) handlePrev();
  };

  const configuredRaw = Array.isArray(homeConfig.heroSlides) && homeConfig.heroSlides.length > 0
    ? homeConfig.heroSlides
    : (slides && slides.length > 0 ? slides : HERO_SLIDES);

  const visibleConfigured = configuredRaw.filter((s) => s && s.isActive !== false);
  const finalBaseSlides = visibleConfigured.length > 0 ? visibleConfigured : HERO_SLIDES;

  const hasCustomHeadline = Boolean(
    homeConfig.heroHeadline &&
    homeConfig.heroHeadline.trim() &&
    homeConfig.heroHeadline.trim() !== DEFAULT_THEME_CONFIG.homePage.heroHeadline
  );
  const hasCustomSubheadline = Boolean(
    homeConfig.heroSubheadline &&
    homeConfig.heroSubheadline.trim() &&
    homeConfig.heroSubheadline.trim() !== DEFAULT_THEME_CONFIG.homePage.heroSubheadline
  );

  const activeSlides = finalBaseSlides.map((s, idx) => {
    if (idx === 0 && (hasCustomHeadline || hasCustomSubheadline) && (!Array.isArray(homeConfig.heroSlides) || homeConfig.heroSlides.length === 0)) {
      return {
        ...s,
        headline: hasCustomHeadline ? homeConfig.heroHeadline : s.headline,
        headlineEn: hasCustomHeadline ? homeConfig.heroHeadline : s.headlineEn,
        subheadline: hasCustomSubheadline ? homeConfig.heroSubheadline : s.subheadline,
        subheadlineEn: hasCustomSubheadline ? homeConfig.heroSubheadline : s.subheadlineEn,
      };
    }
    return s;
  });

  const safeIndex = activeSlides.length > 0 ? activeIndex % activeSlides.length : 0;
  const currentSlide = activeSlides[safeIndex] || activeSlides[0];
  const activeStyle = (currentSlide?.slideStyle && currentSlide.slideStyle !== "inherit")
    ? currentSlide.slideStyle
    : (homeConfig.heroStyle || "style_1_glass_spotlight");

  const intervalMs = Math.max(2500, Number(homeConfig.heroIntervalMs) || 6000);
  const showArrows = homeConfig.heroShowArrows !== false;
  const showDots = homeConfig.heroShowDots !== false;

  useEffect(() => {
    if (!isAutoPlaying || activeSlides.length <= 1) return;
    const interval = setInterval(() => {
      setActiveIndex((prev) => (prev + 1) % activeSlides.length);
    }, intervalMs);
    return () => clearInterval(interval);
  }, [isAutoPlaying, activeSlides.length, intervalMs]);

  const handleNext = () => setActiveIndex((prev) => (prev + 1) % activeSlides.length);
  const handlePrev = () => setActiveIndex((prev) => (prev - 1 + activeSlides.length) % activeSlides.length);

  const handleScrollToProducts = () => {
    const el = document.getElementById('trending-collection') || document.getElementById('products-grid');
    if (el) {
      const header = document.querySelector('header');
      const headerHeight = header ? header.offsetHeight : 120;
      const targetTop = el.getBoundingClientRect().top + window.scrollY - headerHeight - 16;
      window.scrollTo({ top: Math.max(0, targetTop), behavior: 'smooth' });
    }
  };

  const currentProduct = (products || []).find(
    (p) => (currentSlide.productId && p.id === currentSlide.productId) ||
      (currentSlide.productSlug && p.slug === currentSlide.productSlug)
  ) || (products || []).find((p) => p.id === currentSlide.id) || (products && products.length > 0 ? products[0] : null);

  const executeButtonAction = (actionType, customUrl) => {
    if (actionType === "custom_url" && customUrl) {
      if (customUrl.startsWith("http")) {
        window.open(customUrl, "_blank", "noopener,noreferrer");
      } else {
        window.history.pushState({}, "", customUrl);
        window.dispatchEvent(new PopStateEvent("popstate"));
      }
      return;
    }
    if (actionType === "open_shop") {
      if (onNavigateToView) onNavigateToView("shop");
      else {
        window.history.pushState({}, "", "/shop");
        window.dispatchEvent(new PopStateEvent("popstate"));
      }
      return;
    }
    if (actionType === "open_product") {
      if (onNavigateToLanding && currentProduct) {
        onNavigateToLanding(currentProduct);
      } else if (onSelectProduct && currentProduct) {
        onSelectProduct(currentProduct);
      } else {
        handleScrollToProducts();
      }
      return;
    }
    if (actionType === "open_campaign") {
      const rawCampaignId = themeConfig?.campaign?.activeProductId;
      const activeCampaignId =
        (rawCampaignId && rawCampaignId !== 'prod-1790503380337')
          ? rawCampaignId
          : (currentProduct?.id || (products && products[0]?.id) || 'prod-1');
      const activeCampaignProduct =
        (products || []).find((p) => p.id === activeCampaignId) || currentProduct || (products && products[0]);
      if (onNavigateToLanding) {
        onNavigateToLanding({ ...(activeCampaignProduct || {}), id: activeCampaignId, forceCampaign: true });
      } else {
        window.location.href = `/campaign-products?product=${activeCampaignProduct?.id || activeCampaignId}`;
      }
      return;
    }
    handleScrollToProducts();
  };

  // Resolve optional content flags
  const showBadge = currentSlide.showBadge !== false && Boolean(currentSlide.badgeEn || currentSlide.badge);
  const showHeadline = currentSlide.showHeadline !== false;
  const showSubheadline = currentSlide.showSubheadline !== false && Boolean(currentSlide.subheadlineEn || currentSlide.subheadline);
  const showPrimaryBtn = currentSlide.showPrimaryBtn !== false;
  const showSecondaryBtn = currentSlide.showSecondaryBtn !== false;
  const showRightProduct = currentSlide.showProductImage !== false && Boolean(currentSlide.productImage || currentSlide.productVideo);

  const trustItems = Array.isArray(currentSlide.trustItems) && currentSlide.trustItems.length > 0
    ? currentSlide.trustItems
    : [
        { icon: "truck", text: sanitizeText(homeConfig.trustBadge1, '100% Original Products') },
        { icon: "rotate", text: sanitizeText(homeConfig.trustBadge2, '7 Days Replacement') },
        { icon: "shield", text: sanitizeText(homeConfig.trustBadge3, 'Cash on Delivery') },
        { icon: "check", text: '100% Genuine' },
      ];
  const showTrustRow = currentSlide.showTrustBadges !== false && homeConfig.showTrustBadges !== false && trustItems.length > 0;

  const isMinimalLight = activeStyle === "style_3_minimal_swiss";
  const isCenteredCinematic = activeStyle === "style_2_fullscreen_cinematic";
  const overlayOp = currentSlide.overlayOpacity !== undefined ? Number(currentSlide.overlayOpacity) / 100 : 0.7;

  const renderCopyBlock = (isLight = false, centered = false) => (
    <div className={`space-y-4 sm:space-y-6 ${centered ? "text-center flex flex-col items-center mx-auto max-w-3xl" : "text-left"}`}>
      {showBadge && (
        <div
          className={`inline-flex items-center gap-2 px-3.5 py-1 sm:px-4 sm:py-1.5 rounded-full text-xs sm:text-sm font-semibold backdrop-blur-sm shadow-xs ${
            isLight
              ? "bg-emerald-50 border border-emerald-200 text-emerald-800"
              : "bg-emerald-500/20 border border-emerald-500/30 text-emerald-300"
          }`}
        >
          <span className="flex h-2 w-2 relative">
            <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75" />
            <span className="relative inline-flex rounded-full h-2 w-2 bg-emerald-500" />
          </span>
          <Flame className="w-3.5 h-3.5 sm:w-4 sm:h-4 text-amber-400 fill-amber-400" />
          <span className="truncate max-w-[280px] sm:max-w-none">
            {currentSlide.badge || currentSlide.badgeEn}
          </span>
        </div>
      )}

      {showHeadline && (
        <h1
          className={`text-2xl sm:text-4xl lg:text-6xl font-black tracking-tight leading-[1.16] ${
            isLight ? "text-neutral-950" : "text-white"
          }`}
        >
          {currentSlide.headline}{' '}
          {currentSlide.headlineHighlight && (
            <span
              className={`text-transparent bg-clip-text bg-gradient-to-r ${
                isLight ? "from-emerald-600 via-teal-600 to-emerald-700" : "from-emerald-400 via-teal-300 to-emerald-400"
              }`}
            >
              {currentSlide.headlineHighlight}
            </span>
          )}{' '}
          {currentSlide.headlineEnd}
        </h1>
      )}

      {showSubheadline && (
        <p
          className={`text-xs sm:text-base lg:text-lg font-normal leading-relaxed max-w-2xl ${
            isLight ? "text-neutral-600" : "text-neutral-300"
          }`}
        >
          {currentSlide.subheadline || currentSlide.subheadlineEn}
        </p>
      )}

      {(showPrimaryBtn || showSecondaryBtn) && (
        <div className={`flex flex-wrap items-center gap-2.5 sm:gap-3.5 pt-1 sm:pt-2 ${centered ? "justify-center" : ""}`}>
          {showPrimaryBtn && (
            <button
              type="button"
              onClick={() => executeButtonAction(currentSlide.primaryBtnAction || "scroll_products", currentSlide.primaryBtnUrl)}
              className={`group relative inline-flex items-center gap-2 sm:gap-3 px-5 sm:px-7 py-3 sm:py-3.5 rounded-xl sm:rounded-2xl font-bold text-xs sm:text-base transition-all duration-300 transform active:scale-95 cursor-pointer ${getPrimaryBtnClass(currentSlide.primaryBtnStyle, isLight)}`}
            >
              <ShoppingBag className="w-4 h-4 sm:w-5 sm:h-5 transition-transform duration-300 group-hover:scale-110" />
              <span>{currentSlide.ctaText || currentSlide.ctaTextEn || 'Shop Now'}</span>
              <ArrowRight className="w-4 h-4 sm:w-5 sm:h-5 transition-transform duration-300 group-hover:translate-x-1" />
            </button>
          )}

          {showSecondaryBtn && (
            <button
              type="button"
              onClick={() => executeButtonAction(currentSlide.secondaryBtnAction || "open_campaign", currentSlide.secondaryBtnUrl)}
              className={`group inline-flex items-center gap-2 sm:gap-2.5 px-4.5 sm:px-6 py-3 sm:py-3.5 rounded-xl sm:rounded-2xl font-bold text-xs sm:text-base transition-all duration-200 transform active:scale-95 cursor-pointer ${getSecondaryBtnClass(currentSlide.secondaryBtnStyle, isLight)}`}
            >
              <Flame className="w-4 h-4 sm:w-5 sm:h-5 text-amber-400 fill-amber-400 transition-transform duration-300 group-hover:scale-110" />
              <span>{currentSlide.campaignText || currentSlide.campaignTextEn || 'Campaign Offer'}</span>
            </button>
          )}
        </div>
      )}

      {showTrustRow && (
        <div
          className={`grid grid-cols-2 sm:grid-cols-4 gap-2 sm:gap-3 pt-4 sm:pt-6 border-t text-[11px] sm:text-sm font-medium ${
            isLight
              ? "border-neutral-200 text-neutral-700"
              : "border-white/10 text-neutral-300"
          } ${centered ? "w-full text-left" : ""}`}
        >
          {trustItems.map((item, tIdx) => (
            <div key={tIdx} className="flex items-center gap-2">
              <div
                className={`w-6 h-6 sm:w-7 sm:h-7 rounded-lg flex items-center justify-center shrink-0 ${
                  isLight ? "bg-emerald-50 border border-emerald-100" : "bg-white/10"
                }`}
              >
                {renderTrustIcon(item.icon, isLight)}
              </div>
              <span className="leading-tight">{item.text}</span>
            </div>
          ))}
        </div>
      )}
    </div>
  );

  const renderSpotlightVisual = (frameMode = "float") => {
    if (!showRightProduct) return null;
    const isCard = frameMode === "card" || frameMode === "bento";
    return (
      <div className="hidden lg:flex lg:col-span-5 relative flex-col items-center justify-center min-h-[360px] sm:min-h-[440px]">
        {!isMinimalLight && (
          <div className="absolute w-72 sm:w-96 h-72 sm:h-96 rounded-full bg-gradient-to-tr from-emerald-500/25 via-teal-500/20 to-amber-400/20 blur-3xl pointer-events-none" />
        )}
        <motion.div
          animate={frameMode === "float" ? { y: [-8, 8, -8] } : undefined}
          transition={{ repeat: Infinity, duration: 4.5, ease: 'easeInOut' }}
          className={`relative z-10 w-full flex items-center justify-center select-none ${
            isCard
              ? "p-6 rounded-3xl bg-white/95 border border-neutral-200/80 shadow-2xl"
              : ""
          }`}
        >
          {currentSlide.productVideo ? (
            <video
              src={currentSlide.productVideo}
              autoPlay
              loop
              muted
              playsInline
              className="w-full max-w-[400px] max-h-[460px] object-contain drop-shadow-[0_25px_40px_rgba(0,0,0,0.45)]"
            />
          ) : (
            <img
              src={currentSlide.productImage}
              alt={currentSlide.headline || 'Featured Product'}
              className="w-full max-w-[360px] sm:max-w-[420px] max-h-[460px] object-contain rounded-3xl drop-shadow-[0_25px_40px_rgba(0,0,0,0.45)]"
            />
          )}
        </motion.div>
      </div>
    );
  };

  return (
    <section
      className={`group relative w-full min-h-[calc(100svh-120px)] lg:min-h-[calc(100vh-145px)] flex items-center justify-center overflow-hidden py-6 sm:py-8 lg:py-12 select-none ${
        isMinimalLight ? "bg-slate-50" : "bg-neutral-950"
      }`}
      onMouseEnter={() => setIsAutoPlaying(false)}
      onMouseLeave={() => setIsAutoPlaying(homeConfig.heroAutoPlay !== false)}
      onTouchStart={onTouchStart}
      onTouchMove={onTouchMove}
      onTouchEnd={onTouchEnd}
    >
      {/* BACKGROUND LAYER */}
      {!isMinimalLight && (
        <div className="absolute inset-0 pointer-events-none overflow-hidden z-0 bg-neutral-950">
          {activeSlides.map((slide, idx) => (
            <div
              key={slide.id + '-bg'}
              className={`absolute inset-0 transition-opacity duration-1000 ease-in-out ${
                safeIndex === idx ? 'opacity-100 z-10' : 'opacity-0 z-0'
              }`}
            >
              {slide.bgImage && (
                <>
                  <img
                    src={slide.bgImage}
                    alt=""
                    className="w-full h-full object-cover object-center filter blur-2xl opacity-40 scale-110"
                  />
                  <img
                    src={slide.bgImage}
                    alt="Hero Background"
                    className="absolute inset-0 w-full h-full object-cover object-center opacity-75"
                  />
                </>
              )}
              {activeStyle === "style_4_diagonal_gradient" ? (
                <div
                  className="absolute inset-0 bg-gradient-to-br from-emerald-950 via-emerald-900/90 to-neutral-950/60"
                  style={{ opacity: Math.max(0.55, overlayOp) }}
                />
              ) : (
                <>
                  <div
                    className="absolute inset-0 bg-neutral-950"
                    style={{ opacity: overlayOp * 0.65 }}
                  />
                  <div className="absolute inset-0 bg-gradient-to-r from-neutral-950/85 via-neutral-950/50 to-neutral-950/25" />
                </>
              )}
            </div>
          ))}
        </div>
      )}

      {/* Minimal Studio (Style 3) clean architectural subtle grid & background */}
      {isMinimalLight && (
        <div className="absolute inset-0 pointer-events-none overflow-hidden z-0">
          {currentSlide.bgImage && (
            <img
              src={currentSlide.bgImage}
              alt=""
              className="w-full h-full object-cover opacity-15"
            />
          )}
          <div className="absolute inset-0 bg-gradient-to-br from-white/95 via-slate-50/90 to-emerald-50/80" />
        </div>
      )}

      {/* STYLE SWITCHER CONTAINER */}
      <div className="relative z-10 max-w-7xl w-full mx-auto px-4 sm:px-6 lg:px-8">
        <AnimatePresence mode="wait">
          <motion.div
            key={`${currentSlide.id}-${activeStyle}`}
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -10 }}
            transition={{ duration: 0.35, ease: 'easeOut' }}
          >
            {/* STYLE 5: FLOATING BENTO CARD */}
            {activeStyle === "style_5_bento_floating" ? (
              <div className="rounded-[2rem] bg-neutral-900/80 backdrop-blur-xl border border-white/15 shadow-2xl p-6 sm:p-10 lg:p-12 grid grid-cols-1 lg:grid-cols-12 gap-8 items-center">
                <div className={showRightProduct ? "lg:col-span-7" : "lg:col-span-12"}>
                  {renderCopyBlock(false, !showRightProduct)}
                </div>
                {renderSpotlightVisual("bento")}
              </div>
            ) : activeStyle === "style_3_minimal_swiss" ? (
              /* STYLE 3: MINIMALIST STUDIO */
              <div className="rounded-[2rem] bg-white/90 backdrop-blur-md border border-neutral-200/90 shadow-xl p-6 sm:p-10 lg:p-12 grid grid-cols-1 lg:grid-cols-12 gap-8 items-center">
                <div className={showRightProduct ? "lg:col-span-7" : "lg:col-span-12"}>
                  {renderCopyBlock(true, !showRightProduct)}
                </div>
                {renderSpotlightVisual("card")}
              </div>
            ) : activeStyle === "style_2_fullscreen_cinematic" ? (
              /* STYLE 2: FULLSCREEN CINEMATIC EDITORIAL */
              <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-center py-6">
                <div className={showRightProduct ? "lg:col-span-7" : "lg:col-span-12"}>
                  {renderCopyBlock(false, !showRightProduct || isCenteredCinematic && !showRightProduct)}
                </div>
                {renderSpotlightVisual("float")}
              </div>
            ) : activeStyle === "style_4_diagonal_gradient" ? (
              /* STYLE 4: DIAGONAL SPLIT BANNER */
              <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-center">
                <div className={`${showRightProduct ? "lg:col-span-7" : "lg:col-span-12"} p-6 sm:p-8 rounded-3xl bg-gradient-to-br from-black/45 to-emerald-950/40 backdrop-blur-md border border-white/10`}>
                  {renderCopyBlock(false, !showRightProduct)}
                </div>
                {renderSpotlightVisual("card")}
              </div>
            ) : (
              /* STYLE 1: EMERALD SPOTLIGHT (CLASSIC GLASS - DEFAULT) */
              <div className="grid grid-cols-1 lg:grid-cols-12 gap-10 lg:gap-8 items-center">
                <div className={`${showRightProduct ? "lg:col-span-7" : "lg:col-span-12 max-w-4xl mx-auto"} flex flex-col justify-center min-h-0 lg:min-h-[340px]`}>
                  {renderCopyBlock(false, !showRightProduct)}
                </div>
                {renderSpotlightVisual("float")}
              </div>
            )}
          </motion.div>
        </AnimatePresence>
      </div>

      {/* Navigation Arrows & Dots */}
      {activeSlides.length > 1 && (
        <>
          {showArrows && (
            <>
              <button
                type="button"
                onClick={handlePrev}
                className={`hidden md:flex absolute left-3 sm:left-6 top-1/2 -translate-y-1/2 z-20 w-10 sm:w-12 h-10 sm:h-12 rounded-full border items-center justify-center backdrop-blur-md transition-all duration-300 opacity-70 hover:opacity-100 hover:scale-105 cursor-pointer shadow-lg ${
                  isMinimalLight
                    ? "bg-white/90 border-neutral-200 text-neutral-800 hover:bg-white"
                    : "bg-black/40 hover:bg-black/70 border-white/10 hover:border-white/30 text-white/80 hover:text-white"
                }`}
                title="Previous Slide"
              >
                <ChevronLeft className="w-5 sm:w-6 h-5 sm:h-6" />
              </button>

              <button
                type="button"
                onClick={handleNext}
                className={`hidden md:flex absolute right-3 sm:right-6 top-1/2 -translate-y-1/2 z-20 w-10 sm:w-12 h-10 sm:h-12 rounded-full border items-center justify-center backdrop-blur-md transition-all duration-300 opacity-70 hover:opacity-100 hover:scale-105 cursor-pointer shadow-lg ${
                  isMinimalLight
                    ? "bg-white/90 border-neutral-200 text-neutral-800 hover:bg-white"
                    : "bg-black/40 hover:bg-black/70 border-white/10 hover:border-white/30 text-white/80 hover:text-white"
                }`}
                title="Next Slide"
              >
                <ChevronRight className="w-5 sm:w-6 h-5 sm:h-6" />
              </button>
            </>
          )}

          {showDots && (
            <div className="absolute bottom-4 left-1/2 -translate-x-1/2 z-20 flex items-center gap-2">
              {activeSlides.map((slide, idx) => (
                <button
                  key={slide.id}
                  type="button"
                  onClick={() => setActiveIndex(idx)}
                  className={`h-2 rounded-full transition-all duration-300 cursor-pointer ${
                    safeIndex === idx
                      ? 'w-8 bg-emerald-400 shadow-md shadow-emerald-400/50'
                      : isMinimalLight
                        ? 'w-2 bg-neutral-300 hover:bg-neutral-500'
                        : 'w-2 bg-white/30 hover:bg-white/60'
                  }`}
                  title={`Slide ${idx + 1}`}
                />
              ))}
            </div>
          )}
        </>
      )}
    </section>
  );
};

export default HeroSection;
