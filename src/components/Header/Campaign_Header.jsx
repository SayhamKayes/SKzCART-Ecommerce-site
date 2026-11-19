import React, { useState } from "react";
import {
  PhoneCall,
  ShieldCheck,
  Truck,
  Zap,
  ShoppingBag,
  Package
} from "lucide-react";
import { useThemeConfig } from "../frontPanel/FrontPanelContext";
import { buildBgStyle, resolveThemeText } from "../../utils/themeHelper";

const Campaign_Header = ({
  onNavigateToView,
  scrollToCheckout,
  currentPrice,
  hotline,
  product
}) => {
  const { themeConfig, isThemeLoaded } = useThemeConfig();
  const headerConfig = themeConfig?.header || {};
  const activeHotline = isThemeLoaded
    ? (hotline !== undefined
        ? String(hotline).trim()
        : (headerConfig?.productHotline !== undefined && headerConfig.productHotline !== "09612345678"
            ? String(headerConfig.productHotline).trim()
            : (headerConfig?.hotline !== undefined
                ? String(headerConfig.hotline).trim()
                : (themeConfig?.shop?.hotline || ""))))
    : "";
  const shopLogo = isThemeLoaded
    ? (themeConfig?.shop?.headerLogoUrl || headerConfig?.headerLogoUrl || themeConfig?.shop?.logoUrl || "")
    : "";
  const headerLogoText = isThemeLoaded
    ? (headerConfig?.headerLogoText || themeConfig?.shop?.headerLogoText || themeConfig?.shop?.name || "")
    : "";
  const campaignBadge = isThemeLoaded
    ? (themeConfig?.campaign?.badgeText || "Special Campaign Offer")
    : "";
  const defaultAnnouncement = resolveThemeText(
    headerConfig.announcementText,
    headerConfig.announcementTextEn,
    "Inspect parcel upon delivery before payment",
    "Inspect parcel upon delivery before payment"
  );
  const cleanAnnouncement = isThemeLoaded
    ? resolveThemeText(
        headerConfig.productAnnouncementText,
        headerConfig.productAnnouncementTextEn,
        "Inspect parcel upon delivery before payment",
        defaultAnnouncement
      )
    : "";
  const defaultInspection = resolveThemeText(
    headerConfig.inspectionText,
    headerConfig.inspectionTextEn,
    "Inspect parcel before payment",
    "Inspect parcel before payment"
  );
  const activeInspectionText = isThemeLoaded
    ? resolveThemeText(
        headerConfig.productInspectionText,
        headerConfig.productInspectionTextEn,
        "Inspect parcel before payment",
        defaultInspection
      )
    : "";
  const activeTrackText = isThemeLoaded
    ? resolveThemeText(
        headerConfig.trackButtonText,
        headerConfig.trackButtonTextEn,
        "Track Order",
        "Track Order"
      )
    : "";
  const [mobileMenu, setMobileMenu] = useState(false);

  const pp = themeConfig?.themesColors?.productPage || {};
  const prodTopStyle = buildBgStyle(
    {
      bgType: pp.topBarBgType || "gradient",
      solidBg: pp.topBarSolidBg || "#022c22",
      gradientFrom: pp.topBarGradientFrom || "#022c22",
      gradientVia: pp.topBarGradientVia || "#064e3b",
      gradientTo: pp.topBarGradientTo || "#022c22",
      gradientDirection: pp.topBarGradientDirection || "to right",
    },
    "#022c22"
  );
  const prodMainHeaderStyle = buildBgStyle(
    {
      bgType: pp.mainHeaderBgType || "solid",
      solidBg: pp.mainHeaderSolidBg || "#ffffff",
      gradientFrom: pp.mainHeaderGradientFrom || "#ffffff",
      gradientTo: pp.mainHeaderGradientTo || "#f0fdf4",
      gradientDirection: "to right",
    },
    "#ffffff"
  );

  const handleGoToStore = () => {
    window.history.pushState({}, "", "/");
    if (onNavigateToView) onNavigateToView("store");
  };

  const handleGoToTrack = () => {
    window.history.pushState({}, "", "/track");
    if (onNavigateToView) onNavigateToView("track");
  };

  return (
    <>
      {/* 1. Top Trust & Announcement Bar */}
      {headerConfig.showAnnouncement !== false && (
        <div
          style={prodTopStyle}
          className="bg-gradient-to-r from-emerald-950 via-emerald-900 to-emerald-950 text-emerald-100 px-4 py-2 text-xs font-medium border-b border-emerald-800/60 shadow-xs"
        >
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 flex flex-wrap items-center justify-between gap-2">
            <div className="flex items-center gap-3 sm:gap-4 overflow-hidden">
              {!isThemeLoaded ? (
                <span className="inline-block h-3 w-48 rounded bg-white/15 animate-pulse" />
              ) : (
                <>
                  {campaignBadge && (
                    <span
                      style={{ color: pp.topBarNotice1Text || undefined }}
                      className="flex items-center gap-1.5 text-amber-400 font-bold truncate"
                    >
                      <Zap
                        style={{ color: pp.topBarNotice1Icon || undefined, fill: pp.topBarNotice1Icon || undefined }}
                        className="w-3.5 h-3.5 fill-amber-400"
                      />
                      <span>{campaignBadge}</span>
                    </span>
                  )}
                  {campaignBadge && cleanAnnouncement && (
                    <span className="hidden sm:inline-block text-emerald-700">|</span>
                  )}
                  {cleanAnnouncement && (
                    <span
                      style={{ color: pp.topBarNotice2Text || undefined }}
                      className="hidden sm:flex items-center gap-1.5 text-emerald-200 truncate"
                    >
                      <Truck
                        style={{ color: pp.topBarNotice2Icon || undefined }}
                        className="w-3.5 h-3.5 text-emerald-400 shrink-0"
                      />
                      <span className="truncate">{cleanAnnouncement}</span>
                    </span>
                  )}
                </>
              )}
            </div>

            <div className="flex items-center gap-3">
              {isThemeLoaded && activeInspectionText && (
                <span
                  style={{ color: pp.topBarNotice2Text || undefined }}
                  className="flex items-center gap-1 text-emerald-300"
                >
                  <ShieldCheck
                    style={{ color: pp.topBarNotice2Icon || undefined }}
                    className="w-3.5 h-3.5 text-emerald-400 shrink-0"
                  />
                  <span>{activeInspectionText}</span>
                </span>
              )}
              {isThemeLoaded && headerConfig.showHotline !== false && activeHotline && (
                <a
                  href={`tel:${activeHotline}`}
                  style={{ color: pp.topBarHotlineText || undefined }}
                  className="flex items-center gap-1 text-white bg-emerald-800/80 hover:bg-emerald-700 px-2.5 py-0.5 rounded-full font-bold transition-colors"
                >
                  <PhoneCall
                    style={{ color: pp.topBarHotlineIcon || undefined }}
                    className="w-3 h-3 text-amber-400"
                  />
                  <span>{activeHotline}</span>
                </a>
              )}
            </div>
          </div>
        </div>
      )}

      {/* 2. Branded Sticky Header */}
      <header
        style={{
          ...prodMainHeaderStyle,
          borderBottomColor: pp.mainHeaderBorderColor || undefined,
        }}
        className="sticky top-0 z-40 bg-white/95 backdrop-blur-md border-b border-neutral-200 shadow-xs"
      >
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-3 flex items-center justify-between gap-4">
          {/* Logo */}
          <button
            onClick={handleGoToStore}
            className="flex items-center gap-3 text-left group cursor-pointer"
          >
            {!isThemeLoaded ? (
              <span className="inline-block h-7 w-28 rounded-lg bg-neutral-200 animate-pulse" />
            ) : shopLogo ? (
              <img
                src={shopLogo}
                alt={headerLogoText}
                className="h-10 sm:h-11 w-auto object-contain transition-transform group-hover:scale-105"
              />
            ) : (
              <span
                style={{ color: pp.mainHeaderLogoTextColor || undefined }}
                className="text-xl sm:text-2xl font-black tracking-tight text-neutral-900 group-hover:text-emerald-700 transition-colors"
              >
                {headerLogoText}
              </span>
            )}
          </button>

          {/* Desktop Actions */}
          <div className="hidden md:flex items-center gap-3">
            <button
              onClick={handleGoToStore}
              style={{ color: pp.mainHeaderMenuTextColor || undefined }}
              className="px-4 py-2 rounded-xl text-xs font-semibold text-neutral-700 hover:text-emerald-800 hover:bg-neutral-100 transition-colors cursor-pointer"
            >
              ← View All Products
            </button>
            {headerConfig.showTrackOrder !== false && activeTrackText && (
              <button
                onClick={handleGoToTrack}
                style={{
                  backgroundColor: pp.mainHeaderBtnBg || undefined,
                  color: pp.mainHeaderBtnText || undefined,
                }}
                className="px-4 py-2 rounded-xl text-xs font-semibold border border-neutral-300 hover:bg-neutral-100 text-neutral-800 transition-colors flex items-center gap-1.5 cursor-pointer"
              >
                <Package
                  style={{ color: pp.mainHeaderIconColor || undefined }}
                  className="w-3.5 h-3.5 text-emerald-700"
                />
                <span>{activeTrackText}</span>
              </button>
            )}
            <button
              onClick={scrollToCheckout}
              style={{
                backgroundColor: pp.mainHeaderOrderBtnBg || undefined,
                color: pp.mainHeaderOrderBtnText || undefined,
              }}
              className="px-5 py-2.5 rounded-xl text-xs font-bold bg-emerald-700 hover:bg-emerald-800 active:scale-95 text-white shadow-md shadow-emerald-700/20 transition-all flex items-center gap-1.5 cursor-pointer"
            >
              <ShoppingBag className="w-3.5 h-3.5" />
              <span>Order Now{currentPrice ? ` (৳${currentPrice})` : ''}</span>
            </button>
          </div>

          {/* Mobile Menu Button */}
          <div className="flex md:hidden items-center gap-2">
            <button
              onClick={scrollToCheckout}
              style={{
                backgroundColor: pp.mainHeaderOrderBtnBg || undefined,
                color: pp.mainHeaderOrderBtnText || undefined,
              }}
              className="px-3.5 py-1.5 rounded-xl text-xs font-bold bg-emerald-700 text-white shadow-xs cursor-pointer"
            >
              Order Now
            </button>
            <button
              onClick={() => setMobileMenu(!mobileMenu)}
              className="p-2 rounded-xl border border-neutral-200 text-neutral-700 cursor-pointer"
              aria-label="Toggle menu"
            >
              {mobileMenu ? "✕" : "☰"}
            </button>
          </div>
        </div>

        {/* Mobile Dropdown */}
        {mobileMenu && (
          <div className="md:hidden border-t border-neutral-200 bg-white px-4 py-3 space-y-2 shadow-lg animate-in slide-in-from-top-2 duration-150">
            <button
              onClick={() => {
                setMobileMenu(false);
                handleGoToStore();
              }}
              className="w-full py-2 px-3 text-left rounded-lg text-xs font-semibold text-neutral-800 hover:bg-neutral-100 cursor-pointer"
            >
              ← View All Products
            </button>
            {headerConfig.showTrackOrder !== false && activeTrackText && (
              <button
                onClick={() => {
                  setMobileMenu(false);
                  handleGoToTrack();
                }}
                className="w-full py-2 px-3 text-left rounded-lg text-xs font-semibold text-neutral-800 hover:bg-neutral-100 flex items-center gap-2 cursor-pointer"
              >
                <Package className="w-4 h-4 text-emerald-700" />
                <span>{activeTrackText}</span>
              </button>
            )}
            <button
              onClick={() => {
                setMobileMenu(false);
                if (scrollToCheckout) scrollToCheckout();
              }}
              className="w-full py-2.5 px-3 text-center rounded-lg text-xs font-bold bg-emerald-700 text-white hover:bg-emerald-800 shadow-xs cursor-pointer"
            >
              Proceed to Order
            </button>
          </div>
        )}
      </header>
    </>
  );
};

export { Campaign_Header };
export default Campaign_Header;
