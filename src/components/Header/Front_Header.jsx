import { useState, useRef, useEffect } from "react";
import {
  ShoppingBag,
  Search,
  PhoneCall,
  ShieldCheck,
  Truck,
  Layers,
  MapPin,
  User,
  LogOut,
  ChevronDown,
  Package
} from "lucide-react";
import { useLanguage } from "../../Context/LanguageContext";
import { useThemeConfig } from "../frontPanel/FrontPanelContext";
import { buildBgStyle, resolveThemeText } from "../../utils/themeHelper";

const Front_Header = ({
  cartItems = [],
  onOpenCart,
  activeView,
  setActiveView,
  searchQuery,
  setSearchQuery,
  selectedCategory,
  setSelectedCategory,
  categories = [],
  currentUser,
  onOpenAuthModal,
  onLogoutUser
}) => {
  const { t, getCategoryName } = useLanguage();
  const { themeConfig, isThemeLoaded } = useThemeConfig();
  const headerConfig = themeConfig?.header || {};
  const [isAccountMenuOpen, setIsAccountMenuOpen] = useState(false);
  const [isScrolled, setIsScrolled] = useState(false);
  const accountMenuRef = useRef(null);

  useEffect(() => {
    const handleScroll = () => {
      // Top announcement bar collapses ONLY on mobile screens (< 768px). Tablet & Desktop stay permanently visible!
      const isMobile = window.innerWidth < 768;
      setIsScrolled(isMobile && window.scrollY > 25);
    };
    handleScroll();
    window.addEventListener("scroll", handleScroll, { passive: true });
    window.addEventListener("resize", handleScroll);
    return () => {
      window.removeEventListener("scroll", handleScroll);
      window.removeEventListener("resize", handleScroll);
    };
  }, []);

  useEffect(() => {
    const handleClickOutside = (e) => {
      if (accountMenuRef.current && !accountMenuRef.current.contains(e.target)) {
        setIsAccountMenuOpen(false);
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  const totalCartCount = (cartItems || []).reduce((acc, i) => acc + (i.quantity || 1), 0);
  const cleanAnnouncement = isThemeLoaded
    ? resolveThemeText(
        headerConfig.announcementText,
        headerConfig.announcementTextEn,
        "Inspect parcel upon delivery before payment",
        "Inspect parcel upon delivery before payment"
      )
    : "";

  const activeInspectionText = isThemeLoaded
    ? resolveThemeText(
        headerConfig.inspectionText,
        headerConfig.inspectionTextEn,
        "Inspect parcel before payment",
        "Inspect parcel before payment"
      )
    : "";

  const activeHotline = isThemeLoaded
    ? (headerConfig.hotline !== undefined
        ? String(headerConfig.hotline).trim()
        : (themeConfig?.shop?.hotline || ""))
    : "";
  const activeTrackText = isThemeLoaded
    ? resolveThemeText(
        headerConfig.trackButtonText,
        headerConfig.trackButtonTextEn,
        "Track Order",
        t("top_track") || "Track Order"
      )
    : "";
  const activeSearchPlaceholder = isThemeLoaded
    ? resolveThemeText(
        headerConfig.searchPlaceholder,
        headerConfig.searchPlaceholderEn,
        "Search product or model (e.g. smartwatch, earbuds)...",
        t("search_placeholder") || "Search products..."
      )
    : "Search...";
  const headerLogo = isThemeLoaded
    ? (themeConfig?.shop?.headerLogoUrl || headerConfig?.headerLogoUrl || themeConfig?.shop?.logoUrl || "")
    : "";
  const headerLogoText = isThemeLoaded
    ? (headerConfig?.headerLogoText || themeConfig?.shop?.headerLogoText || themeConfig?.shop?.name || "")
    : "";

  const tc = themeConfig?.themesColors || {};
  const topT = tc.topHeader || {};
  const mainT = tc.mainHeader || {};
  const pillT = tc.productCards || {};

  return (
    <header
      style={{
        ...buildBgStyle(mainT, "#ffffff"),
        borderBottomColor: mainT.borderBottomColor || undefined,
      }}
      className="sticky top-0 z-40 bg-white border-b border-neutral-200 shadow-xs"
    >
      {/* Top Bangladesh Trust & Notice Bar (Smoothly collapses on scroll) */}
      {headerConfig.showAnnouncement !== false && (
        <div
          style={{
            ...buildBgStyle(topT, "#022c22"),
            borderBottom: topT.borderBottomColor ? `1px solid ${topT.borderBottomColor}` : undefined,
          }}
          className={`bg-gradient-to-r from-emerald-950 via-emerald-900 to-emerald-950 text-emerald-100 text-xs font-medium transition-all duration-300 ease-in-out md:max-h-16 md:opacity-100 md:py-2 md:pointer-events-auto md:overflow-visible ${isScrolled
              ? "max-h-0 opacity-0 overflow-hidden py-0 pointer-events-none"
              : "max-h-16 opacity-100 py-2"
            }`}
        >
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 flex items-center justify-between gap-2">
            <div className="flex items-center gap-3 sm:gap-4 overflow-hidden">
              {!isThemeLoaded ? (
                <span className="inline-block h-3 w-48 rounded bg-white/15 animate-pulse" />
              ) : (
                <>
                  {cleanAnnouncement && (
                    <span
                      style={{ color: topT.notice1TextColor || undefined }}
                      className="flex items-center gap-1.5 text-amber-400 truncate"
                    >
                      <Truck
                        style={{ color: topT.notice1IconColor || undefined }}
                        className="w-3.5 h-3.5 text-amber-400 shrink-0"
                      />
                      <span className="truncate">{cleanAnnouncement}</span>
                    </span>
                  )}
                  {cleanAnnouncement && activeInspectionText && (
                    <span
                      style={{ color: topT.dividerColor || undefined }}
                      className="hidden sm:inline-block text-emerald-800"
                    >
                      |
                    </span>
                  )}
                  {activeInspectionText && (
                    <span
                      style={{ color: topT.notice2TextColor || undefined }}
                      className="hidden sm:flex items-center gap-1 text-emerald-200 truncate"
                    >
                      <ShieldCheck
                        style={{ color: topT.notice2IconColor || undefined }}
                        className="w-3.5 h-3.5 text-emerald-400 shrink-0"
                      />
                      <span className="truncate">{activeInspectionText}</span>
                    </span>
                  )}
                </>
              )}
            </div>

            <div className="flex items-center gap-3 sm:gap-4 shrink-0">
              {isThemeLoaded && headerConfig.showHotline !== false && activeHotline && (
                <a
                  href={`tel:${activeHotline}`}
                  style={{ color: topT.hotlineTextColor || undefined }}
                  className="hidden md:flex items-center gap-1.5 hover:text-white transition-colors"
                >
                  <PhoneCall
                    style={{ color: topT.hotlineIconColor || undefined }}
                    className="w-3.5 h-3.5 text-amber-400 shrink-0"
                  />
                  <span>{activeHotline}</span>
                </a>
              )}

              {isThemeLoaded && headerConfig.showTrackOrder !== false && activeTrackText && (
                <button
                  type="button"
                  onClick={() => {
                    window.history.pushState({}, "", "/track");
                    if (setActiveView) setActiveView("track");
                  }}
                  style={{
                    backgroundColor: activeView === "track"
                      ? (topT.trackBtnActiveBg || undefined)
                      : (topT.trackBtnBg && topT.trackBtnBg !== "transparent" ? topT.trackBtnBg : undefined),
                    color: activeView === "track"
                      ? (topT.trackBtnActiveText || undefined)
                      : (topT.trackBtnText || undefined),
                  }}
                  className={`text-xs px-2.5 py-1 rounded-lg transition-colors flex items-center gap-1 cursor-pointer ${activeView === "track"
                    ? "bg-emerald-700 text-white font-semibold shadow-xs"
                    : "text-emerald-200 hover:text-white hover:bg-emerald-900/60"
                    }`}
                >
                  <MapPin
                    style={{ color: activeView === "track" ? (topT.trackBtnActiveText || undefined) : (topT.trackBtnIconColor || undefined) }}
                    className="w-3.5 h-3.5 text-emerald-400 shrink-0"
                  />
                  <span>{activeTrackText}</span>
                </button>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Main Bar */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-3.5">
        <div className="flex items-center justify-between gap-4">
          {/* Logo & Brand */}
          <div className="flex items-center gap-6">
            <button
              onClick={() => {
                window.history.pushState({}, "", "/");
                if (setActiveView) setActiveView("store");
              }}
              className="flex items-center gap-2.5 text-left group cursor-pointer"
            >
              {!isThemeLoaded ? (
                <span className="inline-block h-7 w-28 rounded-lg bg-neutral-200 animate-pulse" />
              ) : headerLogo ? (
                <img
                  src={headerLogo}
                  alt={headerLogoText}
                  className="h-10 w-auto object-contain group-hover:scale-105 transition-transform"
                />
              ) : (
                <span
                  style={{ color: mainT.logoTextColor || undefined }}
                  className="text-xl sm:text-2xl font-black tracking-tight text-neutral-900 group-hover:text-emerald-700 transition-colors"
                >
                  {headerLogoText}
                </span>
              )}
            </button>
          </div>

          {/* Search Bar (When on store or shop view) */}
          {headerConfig.showSearchBar !== false && (activeView === "store" || activeView === "shop") && (
            <div className="flex-1 max-w-md hidden md:block">
              <div className="relative">
                <Search
                  style={{ color: mainT.searchIconColor || undefined }}
                  className="w-4 h-4 absolute left-3.5 top-1/2 -translate-y-1/2 text-neutral-400"
                />
                <input
                  type="text"
                  placeholder={activeSearchPlaceholder}
                  value={searchQuery || ""}
                  onChange={(e) => setSearchQuery && setSearchQuery(e.target.value)}
                  style={{
                    backgroundColor: mainT.searchBg || undefined,
                    borderColor: mainT.searchBorderColor || undefined,
                    color: mainT.searchTextColor || undefined,
                  }}
                  className="w-full pl-10 pr-4 py-2 bg-neutral-100 hover:bg-neutral-50 focus:bg-white text-sm rounded-xl border border-transparent focus:border-emerald-500 focus:outline-hidden transition-all placeholder:text-neutral-400"
                />
              </div>
            </div>
          )}

          {/* Right Action Icons: Cart first, then User Profile */}
          <div className="flex items-center gap-2 sm:gap-3">
            {/* Cart Button */}
            <button
              onClick={onOpenCart}
              style={{
                backgroundColor: mainT.cartBtnBg || undefined,
                color: mainT.cartBtnText || undefined,
              }}
              className="relative flex items-center gap-2 px-3.5 py-2 rounded-xl bg-neutral-100 hover:bg-neutral-200 text-neutral-800 transition-colors font-medium text-sm cursor-pointer"
              aria-label="Open Cart"
            >
              <ShoppingBag
                style={{ color: mainT.cartIconColor || undefined }}
                className="w-4 h-4 text-emerald-700"
              />
              <span className="hidden sm:inline">{t('bag')}</span>
              {totalCartCount > 0 && (
                <span
                  style={{
                    backgroundColor: mainT.cartBadgeBg || undefined,
                    color: mainT.cartBadgeText || undefined,
                  }}
                  className="bg-emerald-600 text-white text-[11px] font-bold px-1.5 py-0.5 rounded-full min-w-5 text-center"
                >
                  {totalCartCount}
                </span>
              )}
            </button>

            {/* User Account / Profile Button placed to the RIGHT of Cart - ONLY OPENS ON CLICK */}
            {currentUser ? (
              <div className="relative" ref={accountMenuRef}>
                <button
                  type="button"
                  onClick={() => setIsAccountMenuOpen((prev) => !prev)}
                  className="flex items-center gap-2 px-3 py-2 rounded-xl bg-emerald-50 hover:bg-emerald-100 border border-emerald-200 text-emerald-900 transition-colors font-medium text-xs sm:text-sm cursor-pointer"
                  aria-expanded={isAccountMenuOpen}
                >
                  <div className="w-6 h-6 rounded-full bg-emerald-600 text-white flex items-center justify-center font-bold text-xs">
                    {currentUser.name ? currentUser.name[0].toUpperCase() : "U"}
                  </div>
                  <span className="hidden sm:inline font-semibold max-w-[100px] truncate">
                    {currentUser.name}
                  </span>
                  <ChevronDown
                    className={`w-3.5 h-3.5 text-emerald-700 transition-transform duration-200 ${isAccountMenuOpen ? 'rotate-180' : ''
                      }`}
                  />
                </button>

                {/* Dropdown Menu - only visible when clicked */}
                {isAccountMenuOpen && (
                  <div className="absolute right-0 mt-1.5 w-48 bg-white border border-neutral-200 rounded-2xl shadow-xl py-2 z-50 animate-in fade-in zoom-in-95 duration-150">
                    <div className="px-3.5 py-2 border-b border-neutral-100">
                      <p className="font-bold text-xs text-neutral-900 truncate">{currentUser.name}</p>
                      <p className="text-[11px] text-neutral-500 font-mono truncate">{currentUser.phone}</p>
                    </div>
                    <button
                      type="button"
                      onClick={() => {
                        setIsAccountMenuOpen(false);
                        window.history.pushState({}, "", "/user");
                        if (setActiveView) setActiveView("user");
                      }}
                      className="w-full text-left px-3.5 py-2 text-xs font-semibold text-neutral-700 hover:bg-neutral-50 flex items-center gap-2 transition-colors cursor-pointer"
                    >
                      <Package className="w-3.5 h-3.5 text-emerald-600" />
                      <span>{t('my_orders')}</span>
                    </button>
                    <button
                      type="button"
                      onClick={() => {
                        setIsAccountMenuOpen(false);
                        if (onLogoutUser) onLogoutUser();
                      }}
                      className="w-full text-left px-3.5 py-2 text-xs font-semibold text-rose-600 hover:bg-rose-50 flex items-center gap-2 border-t border-neutral-100 transition-colors cursor-pointer"
                    >
                      <LogOut className="w-3.5 h-3.5" />
                      <span>{t('logout')}</span>
                    </button>
                  </div>
                )}
              </div>
            ) : (
              <button
                type="button"
                onClick={onOpenAuthModal}
                style={{
                  backgroundColor: mainT.accountBtnBg || undefined,
                  color: mainT.accountBtnText || undefined,
                }}
                className="flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-neutral-100 hover:bg-neutral-200 text-neutral-800 transition-colors font-medium text-xs sm:text-sm cursor-pointer"
              >
                <User
                  style={{ color: mainT.accountIconColor || undefined }}
                  className="w-4 h-4 text-emerald-700"
                />
                <span className="hidden sm:inline">{t('my_account')}</span>
              </button>
            )}
          </div>
        </div>

        {/* Category Horizontal Filter Bar (when in Store View - hidden on mobile as per user request) */}
        {activeView === "store" && categories && categories.length > 0 && (
          <div className="mt-3 pt-2.5 border-t border-neutral-100 hidden md:flex items-center gap-2 overflow-x-auto no-scrollbar pb-0.5">
            <span
              style={{ color: mainT.menuTextColor || undefined }}
              className="text-xs font-semibold text-neutral-400 uppercase tracking-wider flex items-center gap-1 mr-1 shrink-0"
            >
              <Layers className="w-3.5 h-3.5" style={{ color: mainT.menuTextColor || undefined }} /> {t('category_label')}
            </span>
            {categories.map((cat) => (
              <button
                key={cat}
                onClick={() => setSelectedCategory && setSelectedCategory(cat)}
                style={
                  selectedCategory === cat
                    ? {
                      backgroundColor: pillT.categoryPillActiveBg || undefined,
                      color: pillT.categoryPillActiveText || undefined,
                    }
                    : {
                      backgroundColor: pillT.categoryPillBg || undefined,
                      color: mainT.menuTextColor || pillT.categoryPillText || undefined,
                    }
                }
                className={`px-3 py-1 rounded-full text-xs font-medium whitespace-nowrap transition-colors cursor-pointer ${selectedCategory === cat
                  ? "bg-neutral-900 text-white"
                  : "bg-neutral-100 text-neutral-600 hover:bg-neutral-200"
                  }`}
              >
                {cat === 'ALL' ? t('all') : getCategoryName(cat)}
              </button>
            ))}
          </div>
        )}
      </div>
    </header>
  );
};

export { Front_Header };
export default Front_Header;
