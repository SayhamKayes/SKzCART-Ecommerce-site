import React, { createContext, useContext, useState, useEffect, useCallback, useRef } from "react";
import { DEFAULT_THEME_CONFIG } from "./defaultThemeConfig";
import { realtimeService } from "../../services/realtime";
import { apiClient } from "../../services/api";
import { setActiveShopInfoCache } from "../../services/notifications";
import { sanitizeThemeConfig } from "../../utils/textSanitizer";
import { deepMerge, getGoogleFontsHref, buildDynamicThemeCss } from "../../utils/themeHelper";

const LEGACY_THEME_STORAGE_KEY = "amardokan_theme_config";
const DB_THEME_CACHE_KEY = "amardokan_db_theme_cache";

const pickDefined = (...vals) => {
  for (const v of vals) {
    if (v !== undefined && v !== null) return v;
  }
  return undefined;
};

const loadDbCachedTheme = () => {
  if (typeof window === "undefined") {
    return { config: DEFAULT_THEME_CONFIG, hasCache: false };
  }
  try {
    const raw = localStorage.getItem(DB_THEME_CACHE_KEY);
    if (!raw) return { config: DEFAULT_THEME_CONFIG, hasCache: false };
    const parsed = JSON.parse(raw);
    if (!parsed || typeof parsed !== "object") {
      return { config: DEFAULT_THEME_CONFIG, hasCache: false };
    }
    return {
      config: sanitizeThemeConfig(deepMerge(DEFAULT_THEME_CONFIG, parsed), DEFAULT_THEME_CONFIG),
      hasCache: true,
    };
  } catch {
    return { config: DEFAULT_THEME_CONFIG, hasCache: false };
  }
};

const saveDbCachedTheme = (serialized) => {
  if (typeof window === "undefined" || !serialized) return;
  try {
    localStorage.setItem(DB_THEME_CACHE_KEY, serialized);
  } catch { }
};

const FrontPanelContext = createContext(null);

export const FrontPanelProvider = ({ children }) => {
  const initialCacheRef = useRef(null);
  if (!initialCacheRef.current) {
    initialCacheRef.current = loadDbCachedTheme();
  }

  const lastLocalUpdateRef = useRef(0);
  const lastConfigJsonRef = useRef(
    initialCacheRef.current.hasCache ? JSON.stringify(initialCacheRef.current.config) : ""
  );
  const [isThemeLoaded, setIsThemeLoaded] = useState(initialCacheRef.current.hasCache);
  const [themeConfig, setThemeConfig] = useState(initialCacheRef.current.config);
  const themeConfigRef = useRef(initialCacheRef.current.config);

  useEffect(() => {
    themeConfigRef.current = themeConfig;
  }, [themeConfig]);

  // Clean up any legacy localStorage theme cache so all browsers use central DB strictly
  useEffect(() => {
    try {
      localStorage.removeItem(LEGACY_THEME_STORAGE_KEY);
    } catch { }
  }, []);

  // Sync theme/shop settings from backend DB so every device/browser gets identical state
  const syncShopSettingsFromBackend = useCallback(async (force = false) => {
    if (!force && Date.now() - lastLocalUpdateRef.current < 3000) {
      return;
    }
    try {
      const backendSettings = await apiClient.getShopSettings();
      if (!backendSettings) {
        setIsThemeLoaded(true);
        return;
      }
      if (!force && Date.now() - lastLocalUpdateRef.current < 3000) {
        return;
      }

      const extraFooter = (backendSettings.extraConfig && backendSettings.extraConfig.footer) || {};
      const extraHeader = (backendSettings.extraConfig && backendSettings.extraConfig.header) || {};
      const extraIdPrefixes = (backendSettings.extraConfig && backendSettings.extraConfig.idPrefixes) || {};

      setThemeConfig((prev) => {
        const mergedShop = {
          ...(prev.shop || DEFAULT_THEME_CONFIG.shop),
          name: pickDefined(backendSettings.shopName, prev.shop?.name) || DEFAULT_THEME_CONFIG.shop.name,
          tagline: pickDefined(backendSettings.shopTagline, prev.shop?.tagline),
          hotline: pickDefined(backendSettings.hotline, prev.shop?.hotline),
          whatsappNumber: pickDefined(backendSettings.whatsappNumber, prev.shop?.whatsappNumber),
          supportEmail: pickDefined(backendSettings.supportEmail, prev.shop?.supportEmail),
          address: pickDefined(backendSettings.address, prev.shop?.address),
          logoUrl: backendSettings.logoUrl !== undefined ? backendSettings.logoUrl : prev.shop?.logoUrl,
          headerLogoUrl: backendSettings.headerLogoUrl !== undefined ? backendSettings.headerLogoUrl : prev.shop?.headerLogoUrl,
          headerLogoText: extraHeader.headerLogoText !== undefined ? extraHeader.headerLogoText : (prev.shop?.headerLogoText || ""),
          footerLogoUrl: backendSettings.footerLogoUrl !== undefined ? backendSettings.footerLogoUrl : prev.shop?.footerLogoUrl,
          faviconUrl: backendSettings.faviconUrl !== undefined ? backendSettings.faviconUrl : prev.shop?.faviconUrl,
          whatsappProvider: backendSettings.whatsappProvider || prev.shop?.whatsappProvider,
          whatsappToken: backendSettings.whatsappToken !== undefined ? backendSettings.whatsappToken : prev.shop?.whatsappToken,
          whatsappPhoneNumberId: backendSettings.whatsappPhoneNumberId !== undefined ? backendSettings.whatsappPhoneNumberId : prev.shop?.whatsappPhoneNumberId,
          whatsappInstanceId: backendSettings.whatsappInstanceId !== undefined ? backendSettings.whatsappInstanceId : prev.shop?.whatsappInstanceId,
          adminAlertPhone: backendSettings.adminAlertPhone !== undefined ? backendSettings.adminAlertPhone : prev.shop?.adminAlertPhone,
          whatsappEnabled: typeof backendSettings.whatsappEnabled === 'boolean' ? backendSettings.whatsappEnabled : prev.shop?.whatsappEnabled,
          emailHost: backendSettings.emailHost !== undefined ? backendSettings.emailHost : prev.shop?.emailHost,
          emailPort: backendSettings.emailPort !== undefined ? backendSettings.emailPort : prev.shop?.emailPort,
          emailUseTls: typeof backendSettings.emailUseTls === 'boolean' ? backendSettings.emailUseTls : prev.shop?.emailUseTls,
          emailUseSsl: typeof backendSettings.emailUseSsl === 'boolean' ? backendSettings.emailUseSsl : prev.shop?.emailUseSsl,
          emailHostUser: backendSettings.emailHostUser !== undefined ? backendSettings.emailHostUser : prev.shop?.emailHostUser,
          emailHostPassword: backendSettings.emailHostPassword !== undefined ? backendSettings.emailHostPassword : prev.shop?.emailHostPassword,
          defaultFromEmail: backendSettings.defaultFromEmail !== undefined ? backendSettings.defaultFromEmail : prev.shop?.defaultFromEmail,
          emailEnabled: typeof backendSettings.emailEnabled === 'boolean' ? backendSettings.emailEnabled : prev.shop?.emailEnabled,
          shopLanguageMode: backendSettings.shopLanguageMode || prev.shop?.shopLanguageMode || 'en',
          defaultLanguage: backendSettings.defaultLanguage || prev.shop?.defaultLanguage || 'en',
          // Footer configurations persisted from database:
          footerNotice: pickDefined(backendSettings.footerNotice, extraFooter.footerNotice, prev.shop?.footerNotice, DEFAULT_THEME_CONFIG.shop.footerNotice),
          footerNoticeEn: pickDefined(backendSettings.footerNoticeEn, extraFooter.footerNoticeEn, prev.shop?.footerNoticeEn, DEFAULT_THEME_CONFIG.shop.footerNoticeEn),
          footerWorkingHours: pickDefined(backendSettings.footerWorkingHours, extraFooter.footerWorkingHours, prev.shop?.footerWorkingHours, DEFAULT_THEME_CONFIG.shop.footerWorkingHours),
          footerWorkingHoursEn: pickDefined(backendSettings.footerWorkingHoursEn, extraFooter.footerWorkingHoursEn, prev.shop?.footerWorkingHoursEn, DEFAULT_THEME_CONFIG.shop.footerWorkingHoursEn),
          footerHotline: pickDefined(backendSettings.footerHotline, extraFooter.footerHotline, prev.shop?.footerHotline, prev.shop?.hotline, DEFAULT_THEME_CONFIG.shop.footerHotline),
          footerEmail: pickDefined(backendSettings.footerEmail, extraFooter.footerEmail, prev.shop?.footerEmail, prev.shop?.supportEmail, DEFAULT_THEME_CONFIG.shop.footerEmail),
          footerCourier1: pickDefined(backendSettings.footerCourier1, extraFooter.footerCourier1, prev.shop?.footerCourier1, DEFAULT_THEME_CONFIG.shop.footerCourier1),
          footerCourier2: pickDefined(backendSettings.footerCourier2, extraFooter.footerCourier2, prev.shop?.footerCourier2, DEFAULT_THEME_CONFIG.shop.footerCourier2),
          footerCourier3: pickDefined(backendSettings.footerCourier3, extraFooter.footerCourier3, prev.shop?.footerCourier3, DEFAULT_THEME_CONFIG.shop.footerCourier3),
          footerCopyrightText: pickDefined(backendSettings.footerCopyrightText, extraFooter.footerCopyrightText, prev.shop?.footerCopyrightText, ""),
          footerPaymentColumns: Number(backendSettings.footerPaymentColumns || extraFooter.footerPaymentColumns || prev.shop?.footerPaymentColumns) || 4,
          idPrefixes: {
            orderSymbol: extraIdPrefixes.orderSymbol !== undefined ? extraIdPrefixes.orderSymbol : (prev.shop?.idPrefixes?.orderSymbol ?? '#'),
            orderIdPrefix: extraIdPrefixes.orderIdPrefix !== undefined ? extraIdPrefixes.orderIdPrefix : (prev.shop?.idPrefixes?.orderIdPrefix ?? 'BD'),
            transactionIdPrefix: extraIdPrefixes.transactionIdPrefix !== undefined ? extraIdPrefixes.transactionIdPrefix : (prev.shop?.idPrefixes?.transactionIdPrefix ?? 'AMAR'),
            reconciliationOrderPrefix: extraIdPrefixes.reconciliationOrderPrefix !== undefined ? extraIdPrefixes.reconciliationOrderPrefix : (prev.shop?.idPrefixes?.reconciliationOrderPrefix ?? ''),
            reconciliationTrxPrefix: extraIdPrefixes.reconciliationTrxPrefix !== undefined ? extraIdPrefixes.reconciliationTrxPrefix : (prev.shop?.idPrefixes?.reconciliationTrxPrefix ?? ''),
          },
        };

        const extraCampaign = (backendSettings.extraConfig && backendSettings.extraConfig.campaign) || {};
        const extraHomePage = (backendSettings.extraConfig && backendSettings.extraConfig.homePage) || {};
        const extraProductPage = (backendSettings.extraConfig && backendSettings.extraConfig.productPage) || {};
        const extraStorePage = (backendSettings.extraConfig && backendSettings.extraConfig.storePage) || {};
        const extraMarketingCampaigns = (backendSettings.extraConfig && backendSettings.extraConfig.marketingCampaigns) || {};
        const extraThemesColors = (backendSettings.extraConfig && backendSettings.extraConfig.themesColors) || {};

        const mergedHeader = {
          ...(prev.header || DEFAULT_THEME_CONFIG.header),
          ...(extraHeader || {}),
        };

        const mergedCampaign = {
          ...(prev.campaign || DEFAULT_THEME_CONFIG.campaign),
          ...(extraCampaign || {}),
        };

        const mergedHomePage = {
          ...(prev.homePage || DEFAULT_THEME_CONFIG.homePage),
          ...(extraHomePage || {}),
        };

        const mergedProductPage = {
          ...(prev.productPage || DEFAULT_THEME_CONFIG.productPage),
          ...(extraProductPage || {}),
        };

        const mergedStorePage = {
          ...(prev.storePage || DEFAULT_THEME_CONFIG.storePage),
          ...(extraStorePage || {}),
        };

        const mergedMarketingCampaigns = {
          ...(prev.marketingCampaigns || DEFAULT_THEME_CONFIG.marketingCampaigns),
          ...(extraMarketingCampaigns || {}),
        };

        const mergedThemesColors = deepMerge(
          DEFAULT_THEME_CONFIG.themesColors,
          extraThemesColors
        );

        const updated = {
          ...prev,
          shop: mergedShop,
          header: mergedHeader,
          campaign: mergedCampaign,
          homePage: mergedHomePage,
          productPage: mergedProductPage,
          storePage: mergedStorePage,
          marketingCampaigns: mergedMarketingCampaigns,
          themesColors: mergedThemesColors,
        };
        const sanitized = sanitizeThemeConfig(updated, DEFAULT_THEME_CONFIG);
        const serialized = JSON.stringify(sanitized);
        saveDbCachedTheme(serialized);
        themeConfigRef.current = sanitized;
        if (serialized === lastConfigJsonRef.current) {
          return prev;
        }
        lastConfigJsonRef.current = serialized;
        return sanitized;
      });
      setIsThemeLoaded(true);
    } catch (err) {
      console.warn("Failed to sync shop settings from backend:", err);
      setIsThemeLoaded(true);
    }
  }, []);

  // Fetch on mount + poll every 10s + refresh on window focus for cross-device consistency
  useEffect(() => {
    syncShopSettingsFromBackend(true);
    const interval = setInterval(() => {
      syncShopSettingsFromBackend(false);
    }, 10000);
    const onFocus = () => syncShopSettingsFromBackend(false);
    window.addEventListener("focus", onFocus);
    return () => {
      clearInterval(interval);
      window.removeEventListener("focus", onFocus);
    };
  }, [syncShopSettingsFromBackend]);

  // Dynamically update document title and favicon based on shop identity
  useEffect(() => {
    if (typeof document === "undefined" || !isThemeLoaded) return;
    const shopName = themeConfig.shop?.name;
    const tagline = themeConfig.shop?.tagline;
    if (shopName) {
      document.title = tagline ? `${shopName} | ${tagline}` : shopName;
    }

    const faviconUrl = themeConfig.shop?.faviconUrl;
    const existingIcons = document.querySelectorAll("link[rel~='icon']");
    if (faviconUrl && String(faviconUrl).trim()) {
      if (existingIcons.length > 0) {
        existingIcons.forEach((link) => {
          link.href = faviconUrl;
        });
      } else {
        const link = document.createElement("link");
        link.rel = "icon";
        link.href = faviconUrl;
        document.getElementsByTagName("head")[0].appendChild(link);
      }
    } else {
      existingIcons.forEach((link) => {
        if (link.parentNode) link.parentNode.removeChild(link);
      });
    }
  }, [isThemeLoaded, themeConfig.shop?.name, themeConfig.shop?.tagline, themeConfig.shop?.faviconUrl]);

  // Sync in-memory shop metadata for notification templates + dynamically inject Google Fonts & Typography/Theme CSS
  useEffect(() => {
    if (themeConfig?.shop) {
      setActiveShopInfoCache(themeConfig.shop);
    }
    if (typeof document === "undefined") return;

    const themesColors = themeConfig?.themesColors || DEFAULT_THEME_CONFIG.themesColors;
    const fontHref = getGoogleFontsHref(themesColors?.typography);
    let fontLink = document.getElementById("amardokan-dynamic-fonts");
    if (fontHref) {
      if (!fontLink) {
        fontLink = document.createElement("link");
        fontLink.id = "amardokan-dynamic-fonts";
        fontLink.rel = "stylesheet";
        document.head.appendChild(fontLink);
      }
      if (fontLink.getAttribute("href") !== fontHref) {
        fontLink.setAttribute("href", fontHref);
      }
    }

    let styleEl = document.getElementById("amardokan-dynamic-theme");
    if (!styleEl) {
      styleEl = document.createElement("style");
      styleEl.id = "amardokan-dynamic-theme";
      document.head.appendChild(styleEl);
    }
    const nextCss = buildDynamicThemeCss(themesColors);
    if (styleEl.textContent !== nextCss) {
      styleEl.textContent = nextCss;
    }
  }, [themeConfig]);

  // Listen for real-time cross-tab broadcasts (same origin tabs)
  useEffect(() => {
    const unsubscribe = realtimeService.subscribe((event) => {
      if (event.type === "THEME_CONFIG_UPDATED" && event.payload) {
        const nextSanitized = sanitizeThemeConfig(event.payload, DEFAULT_THEME_CONFIG);
        const serialized = JSON.stringify(nextSanitized);
        themeConfigRef.current = nextSanitized;
        lastConfigJsonRef.current = serialized;
        saveDbCachedTheme(serialized);
        setThemeConfig(nextSanitized);
        setIsThemeLoaded(true);
      }
    });

    return () => {
      unsubscribe();
    };
  }, []);

  // Build full backend payload from a sanitized themeConfig object
  const persistThemeConfigToBackend = useCallback(async (sanitized) => {
    lastLocalUpdateRef.current = Date.now();
    const res = await apiClient.updateShopSettings({
      shopName: sanitized.shop?.name !== undefined ? sanitized.shop.name : (sanitized.shop?.shopName || ""),
      shopTagline: sanitized.shop?.tagline !== undefined ? sanitized.shop.tagline : (sanitized.shop?.shopTagline ?? ""),
      hotline: sanitized.shop?.hotline,
      whatsappNumber: sanitized.shop?.whatsappNumber,
      supportEmail: sanitized.shop?.supportEmail,
      address: sanitized.shop?.address,
      logoUrl: sanitized.shop?.logoUrl,
      headerLogoUrl: sanitized.shop?.headerLogoUrl,
      footerLogoUrl: sanitized.shop?.footerLogoUrl,
      faviconUrl: sanitized.shop?.faviconUrl,
      whatsappProvider: sanitized.shop?.whatsappProvider,
      whatsappToken: sanitized.shop?.whatsappToken,
      whatsappPhoneNumberId: sanitized.shop?.whatsappPhoneNumberId,
      whatsappInstanceId: sanitized.shop?.whatsappInstanceId,
      adminAlertPhone: sanitized.shop?.adminAlertPhone,
      whatsappEnabled: sanitized.shop?.whatsappEnabled,
      emailHost: sanitized.shop?.emailHost,
      emailPort: sanitized.shop?.emailPort,
      emailUseTls: sanitized.shop?.emailUseTls,
      emailUseSsl: sanitized.shop?.emailUseSsl,
      emailHostUser: sanitized.shop?.emailHostUser,
      emailHostPassword: sanitized.shop?.emailHostPassword,
      defaultFromEmail: sanitized.shop?.defaultFromEmail,
      emailEnabled: sanitized.shop?.emailEnabled,
      shopLanguageMode: sanitized.shop?.shopLanguageMode || "en",
      defaultLanguage: sanitized.shop?.defaultLanguage || "en",
      footerNotice: sanitized.shop?.footerNotice,
      footerNoticeEn: sanitized.shop?.footerNoticeEn,
      footerWorkingHours: sanitized.shop?.footerWorkingHours,
      footerWorkingHoursEn: sanitized.shop?.footerWorkingHoursEn,
      footerHotline: sanitized.shop?.footerHotline,
      footerEmail: sanitized.shop?.footerEmail,
      footerCourier1: sanitized.shop?.footerCourier1,
      footerCourier2: sanitized.shop?.footerCourier2,
      footerCourier3: sanitized.shop?.footerCourier3,
      footerCopyrightText: sanitized.shop?.footerCopyrightText,
      footerPaymentColumns: sanitized.shop?.footerPaymentColumns,
      extraConfig: {
        header: sanitized.header,
        campaign: sanitized.campaign,
        homePage: sanitized.homePage,
        productPage: sanitized.productPage,
        storePage: sanitized.storePage,
        marketingCampaigns: sanitized.marketingCampaigns,
        themesColors: sanitized.themesColors,
        idPrefixes: sanitized.shop?.idPrefixes || {},
        footer: {
          footerNotice: sanitized.shop?.footerNotice,
          footerNoticeEn: sanitized.shop?.footerNoticeEn,
          footerWorkingHours: sanitized.shop?.footerWorkingHours,
          footerWorkingHoursEn: sanitized.shop?.footerWorkingHoursEn,
          footerHotline: sanitized.shop?.footerHotline,
          footerEmail: sanitized.shop?.footerEmail,
          footerCourier1: sanitized.shop?.footerCourier1,
          footerCourier2: sanitized.shop?.footerCourier2,
          footerCourier3: sanitized.shop?.footerCourier3,
          footerCopyrightText: sanitized.shop?.footerCopyrightText,
          footerPaymentColumns: sanitized.shop?.footerPaymentColumns,
        },
      },
    });
    lastLocalUpdateRef.current = Date.now();
    return res;
  }, []);

  // Update one or more sections synchronously and persist cleanly to central DB
  const updateThemeConfig = useCallback((sectionOrUpdates, values) => {
    lastLocalUpdateRef.current = Date.now();
    const prev = themeConfigRef.current || DEFAULT_THEME_CONFIG;
    const updatesMap =
      typeof sectionOrUpdates === "string"
        ? { [sectionOrUpdates]: values }
        : (sectionOrUpdates && typeof sectionOrUpdates === "object" ? sectionOrUpdates : {});

    const updated = { ...prev };
    for (const [secKey, secVal] of Object.entries(updatesMap)) {
      if (!secVal || typeof secVal !== "object") continue;
      updated[secKey] =
        secKey === "themesColors"
          ? deepMerge(prev.themesColors || DEFAULT_THEME_CONFIG.themesColors, secVal)
          : { ...(prev[secKey] || {}), ...secVal };
    }

    const sanitized = sanitizeThemeConfig(updated, DEFAULT_THEME_CONFIG);
    const serialized = JSON.stringify(sanitized);
    themeConfigRef.current = sanitized;
    lastConfigJsonRef.current = serialized;
    setThemeConfig(sanitized);
    setIsThemeLoaded(true);
    saveDbCachedTheme(serialized);

    try {
      realtimeService.broadcast("THEME_CONFIG_UPDATED", sanitized);
    } catch (err) {
      console.warn("Failed to broadcast theme config update", err);
    }

    return persistThemeConfigToBackend(sanitized);
  }, [persistThemeConfigToBackend]);

  // Reset all settings to defaults (persisting centrally)
  const resetThemeConfig = useCallback(() => {
    lastLocalUpdateRef.current = Date.now();
    const serialized = JSON.stringify(DEFAULT_THEME_CONFIG);
    themeConfigRef.current = DEFAULT_THEME_CONFIG;
    lastConfigJsonRef.current = serialized;
    setThemeConfig(DEFAULT_THEME_CONFIG);
    setIsThemeLoaded(true);
    saveDbCachedTheme(serialized);
    try {
      realtimeService.broadcast("THEME_CONFIG_UPDATED", DEFAULT_THEME_CONFIG);
    } catch { }
    return persistThemeConfigToBackend(DEFAULT_THEME_CONFIG);
  }, [persistThemeConfigToBackend]);

  return (
    <FrontPanelContext.Provider
      value={{
        themeConfig,
        isThemeLoaded,
        updateThemeConfig,
        resetThemeConfig,
        syncShopSettingsFromBackend,
      }}
    >
      {children}
    </FrontPanelContext.Provider>
  );
};

export const useThemeConfig = () => {
  const context = useContext(FrontPanelContext);
  if (!context) {
    return {
      themeConfig: DEFAULT_THEME_CONFIG,
      isThemeLoaded: true,
      updateThemeConfig: () => Promise.resolve(null),
      resetThemeConfig: () => Promise.resolve(null),
      syncShopSettingsFromBackend: () => Promise.resolve(null),
    };
  }
  return context;
};
