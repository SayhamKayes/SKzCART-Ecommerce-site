import { useState, useEffect, useMemo, Fragment } from "react";
import {
  Zap,
  Target,
  Save,
  CheckCircle2,
  AlertCircle,
  RefreshCw,
  Globe,
  Package,
  Layers,
  ShieldCheck,
  Eye,
  EyeOff,
  Flame,
  Activity,
  ChevronLeft,
  ChevronRight,
  Plus,
  Search,
  Copy,
  Check,
  Filter,
  TrendingUp,
  BarChart3,
  ExternalLink,
  X,
  Share2,
  Tag,
  BookOpen,
  HelpCircle,
  Lightbulb,
  ArrowUpRight,
  Sparkles,
  Trash2,
  Power,
  ChevronDown,
  Rocket,
  Facebook,
  AlertTriangle,
  SlidersHorizontal
} from "lucide-react";
import MetaConnectionBar from "./MetaConnectionBar";
import MetaBoostWizardDrawer from "./MetaBoostWizardDrawer";
import { apiClient, API_BASE_URL } from "../../services/api";
import { marketingTracker } from "../../services/marketing";
import { realtimeService } from "../../services/realtime";
import { formatBDT } from "../../utils/bangladesh";
import { useLanguage } from "../../Context/LanguageContext";
import { useThemeConfig } from "../frontPanel/FrontPanelContext";

/**
 * Universal date parser that handles ISO strings, local strings,
 * and legacy UTC timestamps lacking timezone designator ("YYYY-MM-DD HH:MM:SS").
 */
const parseEventDate = (timestamp) => {
  if (!timestamp) return new Date();
  if (typeof timestamp === "string") {
    // If string has format "YYYY-MM-DD HH:MM:SS" or lacks timezone offset, append 'Z'
    // since backend generates it from UTC
    if (!timestamp.includes("Z") && !timestamp.includes("+") && !timestamp.slice(-6).match(/[+-]\d\d:\d\d/)) {
      const normalized = timestamp.replace(" ", "T") + "Z";
      const parsed = new Date(normalized);
      if (!isNaN(parsed.getTime())) return parsed;
    }
  }
  const date = new Date(timestamp);
  return isNaN(date.getTime()) ? new Date() : date;
};

const formatEventTimes = (timestamp, isEnglish, nowTime) => {
  const date = parseEventDate(timestamp);
  const diffSec = Math.max(0, Math.floor((nowTime - date.getTime()) / 1000));

  let relativeStr = "";
  if (diffSec < 5) {
    relativeStr = "Just now";
  } else if (diffSec < 60) {
    relativeStr = `${diffSec}s ago`;
  } else if (diffSec < 3600) {
    const mins = Math.floor(diffSec / 60);
    relativeStr = `${mins}m ago`;
  } else if (diffSec < 86400) {
    const hours = Math.floor(diffSec / 3600);
    relativeStr = `${hours}h ago`;
  } else {
    relativeStr = date.toLocaleDateString();
  }

  const exactTimeStr = date.toLocaleTimeString([], {
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit",
    hour12: true,
  });

  return { exactTimeStr, relativeStr };
};

const AdminMarketing = ({
  products = [],
  landingPages = [],
  orders = [],
  sectionMode = "pixel",
  onNavigateTab,
  onSelectCampaignProduct,
  onNavigateToView,
}) => {
  const isCampaignsView = sectionMode === "campaigns";
  const { isEnglish, getProductName } = useLanguage();
  const { themeConfig, updateThemeConfig } = useThemeConfig();

  // Configuration States
  const [pixelId, setPixelId] = useState("");
  const [capiToken, setCapiToken] = useState("");
  const [ga4Id, setGa4Id] = useState("");
  const [adAccountId, setAdAccountId] = useState("");
  const [testEventCode, setTestEventCode] = useState("");
  const [targetScope, setTargetScope] = useState("GLOBAL");
  const [targetProductId, setTargetProductId] = useState("");
  const [targetLandingSlug, setTargetLandingSlug] = useState("");
  const [isActive, setIsActive] = useState(true);

  // UI States
  const [showToken, setShowToken] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [saveSuccessMsg, setSaveSuccessMsg] = useState("");
  const [saveErrorMsg, setSaveErrorMsg] = useState("");

  // Meta Live Sync States
  const [isSyncingMeta, setIsSyncingMeta] = useState(false);
  const [metaSyncMsg, setMetaSyncMsg] = useState("");
  const [copiedCatalogXml, setCopiedCatalogXml] = useState(false);

  // Meta Setup Guidance States (both hidden by default; toggled on click)
  const [showPixelGuide, setShowPixelGuide] = useState(false);
  const [showAdsGuide, setShowAdsGuide] = useState(false);
  const [adsGuideTab, setAdsGuideTab] = useState("commerce"); // 'commerce' | 'tips'

  // Test Event Dispatcher States
  const [testEventName, setTestEventName] = useState("Purchase");
  const [testValue, setTestValue] = useState(2500);
  const [testStatus, setTestStatus] = useState("");
  const [isFiringTest, setIsFiringTest] = useState(false);

  // Live Events Stream & Product Pixel Insights
  const [recentEvents, setRecentEvents] = useState([]);
  const [serverProductStats, setServerProductStats] = useState([]);
  const [hasLoadedServerBundle, setHasLoadedServerBundle] = useState(false);
  const [savedPixelId, setSavedPixelId] = useState("");
  const [rightPanelTab, setRightPanelTab] = useState("stream"); // "stream" | "chart"
  const [chartMetricTab, setChartMetricTab] = useState("ALL"); // ALL | VIEWS | CLICKS | PURCHASES
  const [nowTime, setNowTime] = useState(Date.now());

  // Single-Store Meta Ads States (declared early before useMemo hooks)
  const [activeTenantId] = useState("default");
  const [metaConnection, setMetaConnection] = useState(null);
  const [hasServerOAuthApp, setHasServerOAuthApp] = useState(false);
  const [saasCampaigns, setSaasCampaigns] = useState([]);
  const [expandedCampaignIds, setExpandedCampaignIds] = useState({});
  const [adSetBudgetEdits, setAdSetBudgetEdits] = useState({});
  const [savingAdSetId, setSavingAdSetId] = useState("");
  const [isBoostWizardOpen, setIsBoostWizardOpen] = useState(false);
  const [boostWizardMode, setBoostWizardMode] = useState("QUICK_BOOST_PRODUCT");

  // 1-second interval to update live relative time (e.g. Just now, 5s ago, 6s ago, etc.)
  useEffect(() => {
    const timer = setInterval(() => setNowTime(Date.now()), 1000);
    return () => clearInterval(timer);
  }, []);

  // Real-time polling & BroadcastChannel sync
  useEffect(() => {
    let isMounted = true;

    const fetchEvents = async () => {
      try {
        const bundle = await apiClient.getMarketingEventsBundle();
        if (isMounted && bundle) {
          setHasLoadedServerBundle(true);
          if (Array.isArray(bundle.events)) {
            setRecentEvents(bundle.events);
          }
          if (Array.isArray(bundle.productAnalytics)) {
            setServerProductStats(bundle.productAnalytics);
          }
          if (bundle.activePixelId !== undefined) {
            setSavedPixelId(bundle.activePixelId || "");
          }
        }
      } catch (e) {
        // silent fail
      }
    };

    // Poll every 3 seconds for new live events from other sessions / orders
    const pollInterval = setInterval(fetchEvents, 3000);

    // Cross-tab / instant real-time broadcast listener
    const unsubscribe = realtimeService.subscribe((msg) => {
      if (msg.type === "MARKETING_EVENT_FIRED" && msg.payload) {
        setRecentEvents((prev) => {
          const exists = prev.some(
            (e) => e.eventId === msg.payload.eventId || e.id === msg.payload.id
          );
          if (exists) return prev;
          return [msg.payload, ...prev];
        });
      }
    });

    return () => {
      isMounted = false;
      clearInterval(pollInterval);
      if (typeof unsubscribe === "function") unsubscribe();
    };
  }, []);

  // Fetch Saved Config & Events on Mount
  useEffect(() => {
    let mounted = true;

    async function loadData() {
      setIsLoading(true);
      try {
        const config = await apiClient.getMarketingConfig();
        if (mounted && config) {
          setPixelId(config.pixelId || "");
          setSavedPixelId(config.pixelId || "");
          setCapiToken(config.capiToken || "");
          setGa4Id(config.ga4Id || "");
          setAdAccountId(config.adAccountId || "");
          setTestEventCode(config.testEventCode || "");
          setTargetScope(config.targetScope === "PRODUCT" ? "PRODUCT" : "GLOBAL");
          setTargetProductId(config.targetProductId || (products[0]?.id || ""));
          setIsActive(config.isActive !== false);

          marketingTracker.applyConfig(config);
        }

        const bundle = await apiClient.getMarketingEventsBundle();
        if (mounted && bundle) {
          setHasLoadedServerBundle(true);
          setRecentEvents(Array.isArray(bundle.events) ? bundle.events : []);
          if (Array.isArray(bundle.productAnalytics)) {
            setServerProductStats(bundle.productAnalytics);
          }
        }
      } catch (err) {
        console.warn("Failed to load marketing settings:", err);
        if (mounted) {
          setRecentEvents(marketingTracker.getRecentEvents());
        }
      } finally {
        if (mounted) setIsLoading(false);
      }
    }

    loadData();
    return () => {
      mounted = false;
    };
  }, []);

  // Save Dedicated Button Handler
  const handleSaveConfig = async (e) => {
    e.preventDefault();
    setIsSaving(true);
    setSaveSuccessMsg("");
    setSaveErrorMsg("");

    const payload = {
      pixelId: pixelId.trim(),
      capiToken: capiToken.trim(),
      testEventCode: testEventCode.trim(),
      targetScope: targetScope === "PRODUCT" ? "PRODUCT" : "GLOBAL",
      targetProductId: targetScope === "PRODUCT" ? targetProductId : "",
      targetLandingSlug: "",
      isActive,
    };

    try {
      const res = await apiClient.updateMarketingConfig(payload);
      if (res && res.success) {
        setSavedPixelId(payload.pixelId);
        marketingTracker.applyConfig(payload);
        realtimeService.broadcast({
          type: "MARKETING_CONFIG_UPDATED",
          payload,
        });
        setSaveSuccessMsg(
          "Marketing & CAPI Configuration saved and synced with Meta runtime!"
        );
        setTimeout(() => setSaveSuccessMsg(""), 5000);
      } else {
        setSaveErrorMsg(res?.message || ("Failed to save configuration"));
      }
    } catch (err) {
      setSaveErrorMsg(err.message || ("Connection error occurred"));
    } finally {
      setIsSaving(false);
    }
  };

  // Immediate Active / Paused Toggle Handler (persists + hides/shows live tracking instantly)
  const handleToggleActive = async (nextActive) => {
    setIsActive(nextActive);
    const nextConfig = {
      pixelId: pixelId.trim(),
      capiToken: capiToken.trim(),
      testEventCode: testEventCode.trim(),
      targetScope: targetScope === "PRODUCT" ? "PRODUCT" : "GLOBAL",
      targetProductId: targetScope === "PRODUCT" ? targetProductId : "",
      targetLandingSlug: "",
      isActive: nextActive,
    };
    marketingTracker.applyConfig(nextConfig);
    realtimeService.broadcast({
      type: "MARKETING_CONFIG_UPDATED",
      payload: nextConfig,
    });
    if (!nextActive) {
      setRecentEvents([]);
      setServerProductStats([]);
    }
    try {
      const res = await apiClient.updateMarketingConfig({ isActive: nextActive });
      if (res && res.success) {
        setSaveSuccessMsg(
          nextActive
            ? "Meta Pixel & CAPI activated!"
            : "Meta Pixel & CAPI deactivated (Paused). Tracking and streams are now hidden."
        );
        setTimeout(() => setSaveSuccessMsg(""), 4000);
        if (nextActive) {
          const bundle = await apiClient.getMarketingEventsBundle();
          if (bundle) {
            setHasLoadedServerBundle(true);
            setRecentEvents(Array.isArray(bundle.events) ? bundle.events : []);
            if (Array.isArray(bundle.productAnalytics)) {
              setServerProductStats(bundle.productAnalytics);
            }
          }
        }
      }
    } catch {}
  };

  // Dedicated Fire Test Event Handler
  const handleFireTestEvent = async () => {
    if (!isActive) {
      setTestStatus("[PAUSED] Meta Pixel & CAPI is deactivated. Check Active above to test & track events.");
      return;
    }
    setIsFiringTest(true);
    setTestStatus("");

    const eventPayload = {
      value: Number(testValue) || 2500,
      currency: "BDT",
      source: "admin_test_console",
      campaign: "test_verification",
    };

    if (targetScope === "PRODUCT" && targetProductId) {
      const p = products.find((item) => item.id === targetProductId);
      if (p) {
        eventPayload.productId = p.id;
        eventPayload.name = p.name;
        eventPayload.productName = p.name;
      }
    } else if (products && products.length > 0) {
      eventPayload.productId = products[0].id;
      eventPayload.name = products[0].name;
      eventPayload.productName = products[0].name;
    } else {
      eventPayload.name = "Storewide Catalog Product";
      eventPayload.productName = "Storewide Catalog Product";
    }

    const eventId = marketingTracker.track(testEventName, eventPayload, {
      source: "admin_test_console",
      productId: eventPayload.productId || targetProductId,
    });

    setTestStatus(
      `[DISPATCHED] Event: ${testEventName} | ID: ${eventId} | Synced with Browser Pixel & Server CAPI`
    );

    // Refresh event stream & product analytics after dispatch
    setTimeout(async () => {
      try {
        const bundle = await apiClient.getMarketingEventsBundle();
        if (bundle?.events?.length > 0) {
          setRecentEvents(bundle.events);
        } else {
          setRecentEvents([...marketingTracker.getRecentEvents()]);
        }
        if (Array.isArray(bundle?.productAnalytics)) {
          setServerProductStats(bundle.productAnalytics);
        }
      } catch {
        setRecentEvents([...marketingTracker.getRecentEvents()]);
      }
      setIsFiringTest(false);
    }, 800);
  };

  const activePixelValue = (savedPixelId || pixelId).trim();

  const selectedScopeProduct = useMemo(
    () => products.find((p) => String(p.id) === String(targetProductId)) || null,
    [products, targetProductId]
  );

  // Lookup maps strictly for products currently present in the Store catalog
  const activeProductsMap = useMemo(() => {
    const byId = new Map();
    const byName = new Map();
    for (const p of Array.isArray(products) ? products : []) {
      if (!p) continue;
      if (p.id) byId.set(String(p.id).trim(), p);
      if (p.name) byName.set(String(p.name).trim().toLowerCase(), p);
    }
    return { byId, byName };
  }, [products]);

  const matchActiveStoreProduct = useMemo(() => {
    return (pid, pname) => {
      const cleanId = String(pid || "").trim();
      if (cleanId && activeProductsMap.byId.has(cleanId)) {
        return activeProductsMap.byId.get(cleanId);
      }
      const cleanName = String(pname || "").split(" (x")[0].trim().toLowerCase();
      if (cleanName && activeProductsMap.byName.has(cleanName)) {
        return activeProductsMap.byName.get(cleanName);
      }
      return null;
    };
  }, [activeProductsMap]);

  // Scoped Live Events (Strictly active store products; Entire Store vs Specific Product)
  const filteredRecentEvents = useMemo(() => {
    const list = Array.isArray(recentEvents) ? recentEvents : [];
    if (!isActive || !activePixelValue) return [];

    const activeOnly = list.filter((ev) => {
      if (!ev || String(ev.eventName || "") === "PageView") return false;
      const matched = matchActiveStoreProduct(ev.productId, ev.productName || ev.name || ev.content_name);
      return Boolean(matched);
    });

    if (targetScope === "PRODUCT" && targetProductId) {
      const targetIdStr = String(targetProductId).trim();
      return activeOnly.filter((ev) => {
        const matched = matchActiveStoreProduct(ev.productId, ev.productName || ev.name || ev.content_name);
        return matched && String(matched.id) === targetIdStr;
      });
    }
    return activeOnly;
  }, [recentEvents, activePixelValue, targetScope, targetProductId, matchActiveStoreProduct]);

  // Dynamic Pixel Product Analytics (Views, Clicks & Purchases strictly for active Store products)
  const pixelProductInsights = useMemo(() => {
    const emptyRes = {
      rows: [],
      topViewed: null,
      topClicked: null,
      topPurchased: null,
      totals: { views: 0, clicks: 0, purchases: 0, revenue: 0 },
    };
    if (!isActive || !activePixelValue) return emptyRes;

    const map = new Map();

    const getBucket = (pid, pname) => {
      const matchedProd = matchActiveStoreProduct(pid, pname);
      if (!matchedProd) return null; // Ignore deleted / non-existent store products
      if (targetScope === "PRODUCT" && targetProductId && String(matchedProd.id) !== String(targetProductId)) {
        return null;
      }
      const key = String(matchedProd.id);
      if (!map.has(key)) {
        map.set(key, {
          key,
          productId: key,
          productName: getProductName(matchedProd),
          views: 0,
          clicks: 0,
          purchases: 0,
          revenue: 0,
        });
      }
      return map.get(key);
    };

    const useServerStats = hasLoadedServerBundle || (Array.isArray(serverProductStats) && serverProductStats.length > 0);
    if (useServerStats) {
      for (const row of Array.isArray(serverProductStats) ? serverProductStats : []) {
        const b = getBucket(row.productId, row.productName);
        if (!b) continue;
        b.views = Number(row.views || 0);
        b.clicks = Number(row.clicks || 0);
        b.purchases = Number(row.purchases || 0);
        b.revenue = Number(row.revenue || 0);
      }

      // Merge ONLY unsynced real-time client BroadcastChannel events not yet present on the server
      const serverEventIds = new Set(
        (Array.isArray(recentEvents) ? recentEvents : [])
          .filter((e) => Boolean(e && !e._isClientPending))
          .map((e) => String(e.eventId || e.id))
      );
      for (const ev of Array.isArray(recentEvents) ? recentEvents : []) {
        if (
          ev &&
          ev._isClientPending === true &&
          !ev.serverSynced &&
          !ev.created_at &&
          !serverEventIds.has(String(ev.eventId || ev.id))
        ) {
          const evName = String(ev?.eventName || "").trim();
          if (!evName || evName === "PageView") continue;
          const b = getBucket(ev.productId, ev.productName || ev.name);
          if (!b) continue;
          if (evName === "ViewContent") b.views += 1;
          else if (evName === "ProductClick" || evName === "AddToCart" || evName === "InitiateCheckout") {
            b.clicks += 1;
          } else if (evName === "Purchase") {
            b.purchases += 1;
            b.revenue += Number(ev.value || 0);
          }
        }
      }
    } else {
      for (const ev of Array.isArray(recentEvents) ? recentEvents : []) {
        const evName = String(ev?.eventName || "").trim();
        if (!evName || evName === "PageView") continue;
        const b = getBucket(ev.productId, ev.productName || ev.name || ev.content_name);
        if (!b) continue;
        if (evName === "ViewContent") b.views += 1;
        else if (evName === "ProductClick" || evName === "AddToCart" || evName === "InitiateCheckout") {
          b.clicks += 1;
        } else if (evName === "Purchase") {
          b.purchases += 1;
          b.revenue += Number(ev.value || 0);
        }
      }

      for (const ord of Array.isArray(orders) ? orders : []) {
        const st = String(ord?.status || "").toUpperCase();
        if (st === "CANCELLED" || st === "FAILED" || st === "RETURNED") continue;
        for (const it of Array.isArray(ord?.items) ? ord.items : []) {
          const b = getBucket(it.productId || it.id, it.name);
          if (!b) continue;
          const qty = Number(it.quantity || 1);
          b.purchases += qty;
          b.revenue += Number(it.price || 0) * qty;
        }
      }
    }

    const list = Array.from(map.values());
    const topViewed = [...list].sort((a, b) => b.views - a.views)[0] || null;
    const topClicked = [...list].sort((a, b) => b.clicks - a.clicks)[0] || null;
    const topPurchased = [...list].sort((a, b) => b.purchases - a.purchases)[0] || null;

    const sortedRows = [...list].sort((a, b) => {
      if (chartMetricTab === "VIEWS") return b.views - a.views;
      if (chartMetricTab === "CLICKS") return b.clicks - a.clicks;
      if (chartMetricTab === "PURCHASES") return b.purchases - a.purchases;
      return (b.purchases * 10 + b.clicks * 2 + b.views) - (a.purchases * 10 + a.clicks * 2 + a.views);
    });

    const totals = list.reduce(
      (acc, r) => ({
        views: acc.views + r.views,
        clicks: acc.clicks + r.clicks,
        purchases: acc.purchases + r.purchases,
        revenue: acc.revenue + r.revenue,
      }),
      { views: 0, clicks: 0, purchases: 0, revenue: 0 }
    );

    return {
      rows: sortedRows.slice(0, 6),
      topViewed,
      topClicked,
      topPurchased,
      totals,
    };
  }, [
    activePixelValue,
    targetScope,
    targetProductId,
    hasLoadedServerBundle,
    serverProductStats,
    recentEvents,
    orders,
    matchActiveStoreProduct,
    chartMetricTab,
    getProductName,
  ]);

  // Campaign Table & Pagination States
  const [currentPage, setCurrentPage] = useState(1);
  const [pageSize, setPageSize] = useState(5);
  const [sourceFilter, setSourceFilter] = useState("ALL");
  const [campaignSearch, setCampaignSearch] = useState("");
  const [copiedLinkIndex, setCopiedLinkIndex] = useState(null);

  // New Campaign Modal States
  const [isAddCampaignOpen, setIsAddCampaignOpen] = useState(false);
  const [newCampName, setNewCampName] = useState("");
  const [newCampSource, setNewCampSource] = useState("facebook");
  const [newCampProductId, setNewCampProductId] = useState("all");
  const [newCampSpend, setNewCampSpend] = useState("");
  const [newCampClicks, setNewCampClicks] = useState("");

  // Persistent Custom Campaigns (Backend DB synced via themeConfig.marketingCampaigns)
  const mktCfg = themeConfig?.marketingCampaigns || {};

  const customCampaigns = useMemo(() => {
    if (Array.isArray(mktCfg.customCampaigns) && mktCfg.customCampaigns.length > 0) {
      return mktCfg.customCampaigns;
    }
    try {
      const saved = localStorage.getItem("amardokan_custom_campaigns");
      return saved ? JSON.parse(saved) : [];
    } catch {
      return [];
    }
  }, [mktCfg.customCampaigns]);

  const deletedCampaignIds = useMemo(() => {
    if (Array.isArray(mktCfg.deletedCampaignIds) && mktCfg.deletedCampaignIds.length > 0) {
      return mktCfg.deletedCampaignIds;
    }
    try {
      const saved = localStorage.getItem("amardokan_deleted_campaigns");
      return saved ? JSON.parse(saved) : [];
    } catch {
      return [];
    }
  }, [mktCfg.deletedCampaignIds]);

  const pausedCampaignIds = useMemo(() => {
    if (Array.isArray(mktCfg.pausedCampaignIds) && mktCfg.pausedCampaignIds.length > 0) {
      return mktCfg.pausedCampaignIds;
    }
    try {
      const saved = localStorage.getItem("amardokan_paused_campaigns");
      return saved ? JSON.parse(saved) : [];
    } catch {
      return [];
    }
  }, [mktCfg.pausedCampaignIds]);

  const persistMarketingCampaigns = (nextPartial) => {
    const nextState = {
      customCampaigns: nextPartial.customCampaigns ?? customCampaigns,
      deletedCampaignIds: nextPartial.deletedCampaignIds ?? deletedCampaignIds,
      pausedCampaignIds: nextPartial.pausedCampaignIds ?? pausedCampaignIds,
    };
    updateThemeConfig("marketingCampaigns", nextState);
    try {
      localStorage.setItem("amardokan_custom_campaigns", JSON.stringify(nextState.customCampaigns));
      localStorage.setItem("amardokan_deleted_campaigns", JSON.stringify(nextState.deletedCampaignIds));
      localStorage.setItem("amardokan_paused_campaigns", JSON.stringify(nextState.pausedCampaignIds));
    } catch {}
  };

  const saveCustomCampaigns = (updated) => {
    persistMarketingCampaigns({ customCampaigns: updated });
  };

  // Delete Campaign Confirmation Modal state
  const [campaignToDelete, setCampaignToDelete] = useState(null);
  const [actionSuccessMsg, setActionSuccessMsg] = useState("");

  // Toggle Campaign On / Off (Active / Paused)
  const handleToggleCampaignStatus = (camp) => {
    const targetId = camp.id;
    const isCurrentlyPaused = pausedCampaignIds.includes(targetId) || camp.status === "paused";
    let nextPaused;

    if (isCurrentlyPaused) {
      // Turn ON
      nextPaused = pausedCampaignIds.filter((id) => id !== targetId);
      setActionSuccessMsg(
        `Campaign "${camp.name}" turned ON (Active)!`
      );
    } else {
      // Turn OFF
      nextPaused = Array.from(new Set([...pausedCampaignIds, targetId]));
      setActionSuccessMsg(
        `Campaign "${camp.name}" turned OFF (Paused)!`
      );
    }

    let updatedCustom = customCampaigns;
    if (camp.isCustom || camp.id.startsWith("camp-custom-") || camp.id.startsWith("meta-")) {
      updatedCustom = customCampaigns.map((c) =>
        c.id === targetId ? { ...c, status: isCurrentlyPaused ? "active" : "paused" } : c
      );
    }

    persistMarketingCampaigns({
      pausedCampaignIds: nextPaused,
      customCampaigns: updatedCustom,
    });

    setTimeout(() => setActionSuccessMsg(""), 4000);
  };

  // Confirm and permanently delete campaign
  const confirmDeleteCampaign = () => {
    if (!campaignToDelete) return;
    if (campaignToDelete.isSaasCampaign) {
      handleDeleteSaasCampaign(campaignToDelete);
      return;
    }
    const targetId = campaignToDelete.id;

    const updatedCustom = customCampaigns.filter((c) => c.id !== targetId);
    const nextDeleted = Array.from(new Set([...deletedCampaignIds, targetId]));
    const nextPaused = pausedCampaignIds.filter((id) => id !== targetId);

    persistMarketingCampaigns({
      customCampaigns: updatedCustom,
      deletedCampaignIds: nextDeleted,
      pausedCampaignIds: nextPaused,
    });

    setActionSuccessMsg(
      `Campaign "${campaignToDelete.name}" deleted successfully!`
    );
    setTimeout(() => setActionSuccessMsg(""), 4000);
    setCampaignToDelete(null);
  };

  // Dynamic product funnel campaigns (100% live data—no hardcoded static clicks, orders, or revenue)
  const baseCampaigns = useMemo(() => {
    return (Array.isArray(products) ? products : []).slice(0, 5).map((p, idx) => ({
      id: `camp-prod-${p.id || idx + 1}`,
      campaignNumber: idx + 1,
      name: `Product Campaign ${idx + 1}: ${p.name} (Meta Funnel)`,
      source: "facebook",
      productId: p.id,
      productName: p.name,
      spend: 0,
      clicks: 0,
      baseOrders: 0,
      baseRevenue: 0,
    }));
  }, [products]);

  // Combine live SaaS Meta DB campaigns + local/UTM product funnel links
  const normalizedSaasCampaigns = useMemo(() => {
    return (Array.isArray(saasCampaigns) ? saasCampaigns : []).map((sc, idx) => {
      const isPaused = String(sc.status || "").toUpperCase() !== "ACTIVE";
      const roasNum = Number(sc.roas || 0);
      return {
        ...sc,
        isSaasCampaign: true,
        campaignNumber: idx + 1,
        productName: sc.productName || (sc.postId ? `FB Post #${sc.postId}` : "Meta Ads Funnel"),
        isPaused,
        status: isPaused ? "paused" : "active",
        orders: Number(sc.storeOrders || 0),
        revenue: Number(sc.storeRevenue || 0),
        roasNum,
        roas: Number(sc.spend || 0) > 0 ? `${roasNum.toFixed(1)}x` : "—",
      };
    });
  }, [saasCampaigns]);

  const allCampaigns = useMemo(() => {
    const baseFiltered = activeTenantId === "default" ? [...baseCampaigns, ...(Array.isArray(customCampaigns) ? customCampaigns : [])] : (Array.isArray(customCampaigns) ? customCampaigns : []);
    const delSet = Array.isArray(deletedCampaignIds) ? deletedCampaignIds : [];
    const pausedSet = Array.isArray(pausedCampaignIds) ? pausedCampaignIds : [];
    return baseFiltered
      .filter((camp) => camp && camp.id && !delSet.includes(camp.id))
      .map((camp) => {
        const isPaused = pausedSet.includes(camp.id) || camp.status === "paused";
        return {
          ...camp,
          source: String(camp.source || "facebook"),
          name: String(camp.name || "Ad Campaign"),
          productName: String(camp.productName || "Store Catalog"),
          isSaasCampaign: false,
          isPaused,
          status: isPaused ? "paused" : "active",
        };
      });
  }, [baseCampaigns, customCampaigns, deletedCampaignIds, pausedCampaignIds, activeTenantId]);

  // Dynamic attribution from real confirmed orders + live Meta Insights
  const campaignStats = useMemo(() => {
    const safeOrders = Array.isArray(orders) ? orders : [];
    const localAttributed = allCampaigns.map((camp) => {
      const campSrcLower = String(camp.source || "facebook").toLowerCase();
      const matchingOrders = safeOrders.filter((o) => {
        if (!o || o.status === "CANCELLED") return false;
        const utmObj = o.utm && typeof o.utm === "object" ? o.utm : {};
        const utmSource = String(utmObj.source || "").toLowerCase();
        const utmCamp = String(utmObj.campaign || "").toLowerCase();
        const campSlug = String(camp.name || "").toLowerCase().replace(/\s+/g, "_");
        const isCampMatch = utmCamp && (campSlug.includes(utmCamp) || utmCamp.includes(String(camp.id || "")));
        const isSourceMatch = utmSource && campSrcLower && utmSource.includes(campSrcLower);
        const isProductMatch =
          camp.productId !== "all" &&
          Array.isArray(o.items) &&
          o.items.some((item) => item && (item.productId === camp.productId || item.id === camp.productId));

        return isCampMatch || (isSourceMatch && isProductMatch) || (isSourceMatch && camp.productId === "all");
      });

      const liveOrdersCount = matchingOrders.length;
      const liveRevenue = matchingOrders.reduce((sum, o) => sum + (o.total || 0), 0);

      // Count live product clicks/add-to-carts from tracked events
      const matchingClicks = (Array.isArray(recentEvents) ? recentEvents : []).filter((ev) => {
        if (!["ProductClick", "AddToCart", "InitiateCheckout"].includes(ev?.eventName)) return false;
        if (camp.productId && camp.productId !== "all") {
          return String(ev.productId || "") === String(camp.productId);
        }
        return true;
      }).length;

      const totalOrders = (camp.baseOrders || 0) + liveOrdersCount;
      const totalRevenue = (camp.baseRevenue || 0) + liveRevenue;
      const spend = camp.spend || 0;
      const roasNum = spend > 0 ? totalRevenue / spend : 0;
      const roas = spend > 0 ? `${roasNum.toFixed(1)}x` : "—";

      return {
        ...camp,
        clicks: (camp.clicks || 0) + matchingClicks,
        orders: totalOrders,
        revenue: totalRevenue,
        roas,
        roasNum,
      };
    });

    return [...normalizedSaasCampaigns, ...localAttributed];
  }, [normalizedSaasCampaigns, allCampaigns, orders, recentEvents]);

  // Overall metrics calculation
  const totalCampaignsCount = campaignStats.length;
  const totalSpendSum = campaignStats.reduce((s, c) => s + Number(c?.spend || 0), 0);
  const totalOrdersSum = campaignStats.reduce((s, c) => s + Number(c?.orders || 0), 0);
  const totalRevenueSum = campaignStats.reduce((s, c) => s + Number(c?.revenue || 0), 0);
  const averageRoas = totalSpendSum > 0 ? (totalRevenueSum / totalSpendSum).toFixed(1) + "x" : "0.0x";

  // Filtered & Paginated campaigns
  const filteredCampaigns = useMemo(() => {
    return campaignStats.filter((camp) => {
      if (sourceFilter !== "ALL" && camp.source.toLowerCase() !== sourceFilter.toLowerCase()) {
        return false;
      }
      if (campaignSearch.trim()) {
        const q = campaignSearch.toLowerCase();
        const matchName = (camp.name || "").toLowerCase().includes(q);
        const matchProd = (camp.productName || "").toLowerCase().includes(q);
        const matchSource = (camp.source || "").toLowerCase().includes(q);
        return matchName || matchProd || matchSource;
      }
      return true;
    });
  }, [campaignStats, sourceFilter, campaignSearch]);

  const totalPages = Math.max(1, Math.ceil(filteredCampaigns.length / pageSize));
  const validCurrentPage = Math.min(currentPage, totalPages);
  const startIndex = (validCurrentPage - 1) * pageSize;
  const paginatedCampaigns = filteredCampaigns.slice(startIndex, startIndex + pageSize);

  // Generate 100% valid trackable link targeting campaign landing or storefront
  const getCampaignUrl = (camp) => {
    const slug = camp.utmCampaign || (camp.name || "ad_campaign").toLowerCase().replace(/[^a-z0-9]+/g, "_");
    const baseUrl = typeof window !== "undefined" ? window.location.origin : "https://amardokan.com";
    if (!camp.isPaused && camp.landingUrl) {
      return camp.landingUrl;
    }
    if (camp.isPaused) {
      const prod = products.find((p) => p.id === camp.productId);
      const prodSlug = prod?.slug || camp.productId;
      if (camp.productId && camp.productId !== "all") {
        return `${baseUrl}/products/${prodSlug}`;
      }
      return `${baseUrl}/`;
    }
    if (camp.productId && camp.productId !== "all") {
      return `${baseUrl}/campaign-products?product=${camp.productId}&utm_source=${camp.source}&utm_campaign=${slug}`;
    }
    return `${baseUrl}/?utm_source=${camp.source}&utm_campaign=${slug}`;
  };

  // Copy tracking link handler
  const handleCopyTrackingLink = (camp, idx) => {
    const url = getCampaignUrl(camp);
    if (navigator?.clipboard?.writeText) {
      navigator.clipboard.writeText(url);
      setCopiedLinkIndex(idx);
      setTimeout(() => setCopiedLinkIndex(null), 2500);
    }
  };

  // Open live page in new tab
  const handleOpenLivePage = (camp) => {
    const url = getCampaignUrl(camp);
    window.open(url, "_blank");
  };

  // Seamless two-way Admin navigation to Single-Product Campaign Landing Editor
  const handleEditLanding = (camp) => {
    const targetId = camp.productId && camp.productId !== "all" ? camp.productId : (products[0]?.id || "");
    if (onSelectCampaignProduct && targetId) {
      onSelectCampaignProduct(targetId);
    }
    if (onNavigateTab) {
      onNavigateTab("campaignProducts");
    }
  };

  // Copy Facebook Catalog XML Feed URL
  const handleCopyCatalogXml = () => {
    const fallbackOrigin = typeof window !== "undefined" ? window.location.origin : "https://amardokan.com";
    const apiBase = API_BASE_URL || fallbackOrigin;
    const xmlUrl = `${apiBase}/api/v1/marketing/facebook-catalog.xml`;
    if (navigator?.clipboard?.writeText) {
      navigator.clipboard.writeText(xmlUrl);
      setCopiedCatalogXml(true);
      setTimeout(() => setCopiedCatalogXml(false), 2500);
    }
  };

  const loadSaasAdsWorkspace = async () => {
    try {
      const [connRes, campsRes] = await Promise.all([
        apiClient.getMetaConnection(),
        apiClient.getMetaCampaigns(),
      ]);
      if (connRes?.success) {
        setMetaConnection(connRes.connection || null);
        setHasServerOAuthApp(Boolean(connRes.hasServerOAuthApp));
      }
      if (campsRes?.success && Array.isArray(campsRes.campaigns)) {
        setSaasCampaigns(campsRes.campaigns);
      }
    } catch (err) {
      console.warn("Failed to load Meta Ads workspace:", err);
    }
  };

  useEffect(() => {
    if (isCampaignsView) {
      loadSaasAdsWorkspace();
    }
  }, [isCampaignsView, activeTenantId]);

  const handleToggleSaasCampaignStatus = async (camp) => {
    const nextStatus = String(camp.status || "").toUpperCase() === "ACTIVE" ? "PAUSED" : "ACTIVE";
    try {
      const res = await apiClient.toggleMetaCampaignStatus(camp.id, nextStatus);
      if (res && res.success && res.campaign) {
        setSaasCampaigns((prev) => prev.map((c) => (c.id === camp.id ? res.campaign : c)));
        setActionSuccessMsg(`"${camp.name}" updated to ${nextStatus} on Meta & DB!`);
      } else {
        setMetaSyncMsg(res?.message || "Failed to toggle campaign status on Meta.");
      }
    } catch (err) {
      setMetaSyncMsg(err.message || "Failed to update campaign status.");
    }
  };

  const handleSaveAdSetBudget = async (adset) => {
    const nextVal = Number(adSetBudgetEdits[adset.id] ?? adset.dailyBudget);
    if (!nextVal || nextVal <= 0) return;
    setSavingAdSetId(adset.id);
    try {
      const res = await apiClient.updateMetaAdSet(adset.id, { dailyBudget: nextVal });
      if (res && res.success) {
        await loadSaasAdsWorkspace();
        setActionSuccessMsg(`Updated AdSet "${adset.name}" daily budget to ${nextVal}!`);
      } else {
        setMetaSyncMsg(res?.message || "Failed to update AdSet budget on Meta.");
      }
    } finally {
      setSavingAdSetId("");
    }
  };

  const handleDeleteSaasCampaign = async (camp) => {
    const res = await apiClient.deleteMetaCampaign(camp.id);
    if (res && res.success) {
      setSaasCampaigns((prev) => prev.filter((c) => c.id !== camp.id));
      setActionSuccessMsg(`Campaign "${camp.name}" deleted from Meta & AmarDokan.`);
      setCampaignToDelete(null);
    } else {
      setMetaSyncMsg(res?.message || "Failed to delete campaign on Meta.");
      setCampaignToDelete(null);
    }
  };

  // Trigger Live Two-Way Meta Ads Metrics Sync via Graph API backend endpoint
  const handleSyncMetaAds = async () => {
    setIsSyncingMeta(true);
    setMetaSyncMsg("");
    try {
      const res = await apiClient.syncMetaAdsTwoWay();
      if (res && res.success) {
        if (res.connection) setMetaConnection(res.connection);
        if (Array.isArray(res.campaigns)) setSaasCampaigns(res.campaigns);
        setMetaSyncMsg(res.message || "Two-way synced Meta Campaigns, AdSets, Ads & Live ROAS!");
      } else {
        setMetaSyncMsg(res?.message || "Meta sync failed");
      }
    } catch (err) {
      setMetaSyncMsg(err.message || "Meta sync failed");
    } finally {
      setIsSyncingMeta(false);
      setTimeout(() => setMetaSyncMsg(""), 6500);
    }
  };

  // Add campaign submit with automatic sequential naming
  const handleCreateCampaign = (e) => {
    e.preventDefault();
    if (!newCampName.trim()) return;

    const selectedProd = products.find((p) => p.id === newCampProductId);
    const prodName =
      newCampProductId === "all"
        ? "Entire Store Catalog"
        : selectedProd?.name || "Product";

    const nextNumber = allCampaigns.length + 1;
    const formattedName = newCampName.startsWith("Product Campaign")
      ? newCampName.trim()
      : `Product Campaign ${nextNumber}: ${newCampName.trim()} (${newCampSource.toUpperCase()} Ads)`;

    const created = {
      id: `camp-custom-${Date.now()}`,
      campaignNumber: nextNumber,
      name: formattedName,
      source: newCampSource,
      productId: newCampProductId || "all",
      productName: prodName,
      spend: Number(newCampSpend) || 0,
      clicks: Number(newCampClicks) || 0,
      baseOrders: 0,
      baseRevenue: 0,
      isCustom: true,
    };

    const updated = [created, ...customCampaigns];
    saveCustomCampaigns(updated);

    // Reset form & close
    setNewCampName("");
    setNewCampSpend("");
    setNewCampClicks("");
    setIsAddCampaignOpen(false);
    setCurrentPage(1);
  };

  return (
    <div className="space-y-6">
      {/* Header (Only in Marketing & CAPI view — omitted in Ads Campaigns view) */}
      {!isCampaignsView && (
      <div className="bg-white rounded-3xl p-6 border border-neutral-200 shadow-xs flex flex-wrap items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2">
            <span className="text-xs font-bold uppercase tracking-wider text-emerald-700 bg-emerald-50 px-2.5 py-1 rounded-full">
              {"Meta Pixel & Conversions API"}
            </span>
            {isActive && activePixelValue ? (
              <span className="inline-flex items-center gap-1.5 text-xs font-bold text-emerald-700 bg-emerald-100/80 px-2.5 py-1 rounded-full">
                <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
                <span>{`Live Meta Pixel (${activePixelValue})`}</span>
              </span>
            ) : (
              <span className="inline-flex items-center gap-1.5 text-xs font-bold text-amber-700 bg-amber-50 px-2.5 py-1 rounded-full">
                <span className="w-2 h-2 rounded-full bg-amber-400" />
                <span>{"Pixel Setup Needed"}</span>
              </span>
            )}
          </div>
          <h1 className="text-2xl font-black text-neutral-900 mt-2">
            {"Meta Pixel & CAPI Tracking Hub"}
          </h1>
          <p className="text-xs text-neutral-500 mt-1">
            {"Configure your Meta Pixel ID & CAPI, view real-time deduplicated events, and inspect product view/click/purchase charts directly here."}
          </p>
        </div>

        {/* Setup Guide Re-open Button + Active Scope pill */}
        <div className="flex items-center gap-2.5 flex-wrap">
          <button
            type="button"
            onClick={() => setShowPixelGuide((prev) => !prev)}
            className={`inline-flex items-center gap-1.5 px-3 py-2 rounded-xl font-bold text-xs border transition-all cursor-pointer ${
              showPixelGuide
                ? "bg-amber-500 hover:bg-amber-600 text-white border-amber-600 shadow-xs"
                : "bg-amber-50 hover:bg-amber-100 text-amber-900 border-amber-300"
            }`}
            title={showPixelGuide ? "Hide Setup Guide" : "Open Meta Pixel Setup Guide"}
          >
            <BookOpen className="w-3.5 h-3.5" />
            <span>{showPixelGuide ? "Hide Guide" : "Setup Guide"}</span>
          </button>

          <div className="flex items-center gap-2 bg-neutral-50 p-2.5 rounded-2xl border border-neutral-200 text-xs">
            <Activity className="w-4 h-4 text-emerald-600" />
            <div className="text-left">
              <div className="text-[10px] text-neutral-400 font-semibold uppercase">{"Active Scope"}</div>
              <div className="font-bold text-neutral-800">
                {targetScope === "PRODUCT"
                  ? `📦 Specific Product${selectedScopeProduct ? `: ${getProductName(selectedScopeProduct)}` : ""}`
                  : "🌐 Global (Entire Store)"}
              </div>
            </div>
          </div>
        </div>
      </div>
      )}

      {/* Campaign Performance Table with Pagination & Controls (Only in Ads Campaigns menu) */}
      {isCampaignsView && (
      <>
      <MetaConnectionBar
        connection={metaConnection}
        shopName={themeConfig?.shop?.shopName || themeConfig?.shop?.name || "AmarDokan"}
        hasServerOAuthApp={hasServerOAuthApp}
        showSetupGuide={showAdsGuide}
        onToggleSetupGuide={() => setShowAdsGuide((prev) => !prev)}
        onConnectionUpdated={(nextConn) => {
          setMetaConnection(nextConn);
          loadSaasAdsWorkspace();
        }}
      />

      {/* Standalone Setup Guide Section for Ads Campaigns (Hidden by default; toggles from Setup Guide button) */}
      {showAdsGuide && (
        <div className="bg-gradient-to-br from-amber-50/70 via-white to-purple-50/40 rounded-3xl p-6 border border-amber-200/90 shadow-xs space-y-4 animate-in fade-in duration-200">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-amber-200/60 pb-4">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-2xl bg-amber-500 text-white flex items-center justify-center shadow-xs shrink-0">
                <BookOpen className="w-5 h-5" />
              </div>
              <div>
                <h3 className="text-base font-black text-neutral-900">
                  {"Commerce Manager, Catalog XML & ROAS Tips"}
                </h3>
                <p className="text-xs text-neutral-600 mt-0.5">
                  {"Connect your product feed for Advantage+ Catalog Ads and optimize campaign ROAS."}
                </p>
              </div>
            </div>
            <div className="flex items-center gap-2">
              <a
                href="https://business.facebook.com/commerce"
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-purple-600 hover:bg-purple-700 text-white font-bold text-xs shadow-xs transition-colors cursor-pointer"
              >
                <span>Commerce Manager</span>
                <ExternalLink className="w-3.5 h-3.5" />
              </a>
              <button
                type="button"
                onClick={() => setShowAdsGuide(false)}
                className="p-1.5 rounded-xl text-neutral-400 hover:text-neutral-700 hover:bg-neutral-100 transition-colors cursor-pointer"
                title="Hide guide"
              >
                <X className="w-4 h-4" />
              </button>
            </div>
          </div>

          <div className="flex items-center gap-2 border-b border-amber-100/80 pb-2 overflow-x-auto scrollbar-none">
            <button
              type="button"
              onClick={() => setAdsGuideTab("commerce")}
              className={`px-3.5 py-1.5 rounded-xl text-xs font-bold transition-all cursor-pointer whitespace-nowrap ${
                adsGuideTab === "commerce"
                  ? "bg-purple-600 text-white shadow-xs"
                  : "bg-white text-neutral-600 hover:bg-neutral-100 border border-neutral-200"
              }`}
            >
              1. Commerce Manager & Catalog XML
            </button>
            <button
              type="button"
              onClick={() => setAdsGuideTab("tips")}
              className={`px-3.5 py-1.5 rounded-xl text-xs font-bold transition-all cursor-pointer whitespace-nowrap ${
                adsGuideTab === "tips"
                  ? "bg-amber-600 text-white shadow-xs"
                  : "bg-white text-neutral-600 hover:bg-neutral-100 border border-neutral-200"
              }`}
            >
              2. Store Pro-Tips & ROAS
            </button>
          </div>

          {adsGuideTab === "commerce" && (
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4 pt-1 text-xs animate-in fade-in">
              <div className="bg-white p-4 rounded-2xl border border-neutral-200/90 shadow-2xs space-y-2">
                <div className="flex items-center gap-2 text-purple-700 font-bold">
                  <span className="w-5 h-5 rounded-full bg-purple-100 flex items-center justify-center text-[11px]">1</span>
                  <span>Open Commerce Manager Catalog</span>
                </div>
                <p className="text-neutral-600 leading-relaxed">
                  Go to{" "}
                  <a
                    href="https://business.facebook.com/commerce"
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-purple-600 font-bold underline inline-flex items-center gap-0.5"
                  >
                    Meta Commerce Manager <ExternalLink className="w-2.5 h-2.5" />
                  </a>{" "}
                  and select your shop or catalog (or create a new catalog).
                </p>
              </div>

              <div className="bg-white p-4 rounded-2xl border border-neutral-200/90 shadow-2xs space-y-2">
                <div className="flex items-center gap-2 text-purple-700 font-bold">
                  <span className="w-5 h-5 rounded-full bg-purple-100 flex items-center justify-center text-[11px]">2</span>
                  <span>Paste XML Link in Data Feed</span>
                </div>
                <p className="text-neutral-600 leading-relaxed">
                  Go to <strong>Catalog -&gt; Data Sources -&gt; Data Feeds -&gt; Add Items</strong>. Select <strong>"Scheduled Feed"</strong> and paste the link copied from the <strong>"Catalog XML"</strong> button.
                </p>
              </div>

              <div className="bg-white p-4 rounded-2xl border border-neutral-200/90 shadow-2xs space-y-2">
                <div className="flex items-center gap-2 text-purple-700 font-bold">
                  <span className="w-5 h-5 rounded-full bg-purple-100 flex items-center justify-center text-[11px]">3</span>
                  <span>Enable BDT & Auto-Sync</span>
                </div>
                <p className="text-neutral-600 leading-relaxed">
                  Set update frequency to <strong>Hourly</strong> or <strong>Daily</strong> and currency to <strong>BDT</strong>. Meta will automatically sync all titles, prices, images, and stock for Advantage+ and retargeting ads.
                </p>
              </div>
            </div>
          )}

          {adsGuideTab === "tips" && (
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4 pt-1 text-xs animate-in fade-in">
              <div className="bg-white p-4 rounded-2xl border border-amber-200/80 shadow-2xs space-y-2">
                <div className="flex items-center gap-2 text-amber-800 font-bold">
                  <Lightbulb className="w-4 h-4 text-amber-600" />
                  <span>Why Server CAPI Boosts ROAS</span>
                </div>
                <p className="text-neutral-600 leading-relaxed">
                  Approximately 30-40% of mobile visitors use browser ad-blockers or iOS privacy protections. Pairing CAPI with your Pixel ensures Meta optimizes Ad delivery for real conversions.
                </p>
              </div>

              <div className="bg-white p-4 rounded-2xl border border-amber-200/80 shadow-2xs space-y-2">
                <div className="flex items-center gap-2 text-emerald-800 font-bold">
                  <ShieldCheck className="w-4 h-4 text-emerald-600" />
                  <span>Event Deduplication</span>
                </div>
                <p className="text-neutral-600 leading-relaxed">
                  Shared unique <code className="bg-neutral-100 px-1 rounded text-[11px]">eventId</code> values match browser & server purchases so Meta reports accurate CPA and ROAS without double counting.
                </p>
              </div>

              <div className="bg-white p-4 rounded-2xl border border-amber-200/80 shadow-2xs space-y-2">
                <div className="flex items-center gap-2 text-indigo-800 font-bold">
                  <TrendingUp className="w-4 h-4 text-indigo-600" />
                  <span>Single-Product Funnel Links</span>
                </div>
                <p className="text-neutral-600 leading-relaxed">
                  Send paid ad traffic to generated <code className="bg-neutral-100 px-1 rounded text-[10px]">/campaign-products?product=ID</code> funnel links so buyers land directly on high-converting checkout pages.
                </p>
              </div>
            </div>
          )}
        </div>
      )}

      <div className="bg-white rounded-3xl p-6 border border-neutral-200 shadow-xs space-y-5">
        {/* Top Header & Single-Line Action Toolbar */}
        <div className="flex flex-col xl:flex-row xl:items-center justify-between gap-3">
          <div className="min-w-0">
            <div className="flex items-center gap-2">
              <BarChart3 className="w-5 h-5 text-emerald-600 shrink-0" />
              <h3 className="text-base font-bold text-neutral-900 truncate">
                {"Ad Campaigns, Live Boosts & ROAS Matrix"}
              </h3>
            </div>
            <p className="text-xs text-neutral-400 mt-0.5">
              {"Product Boost, Page Post Boost & Sales Campaigns via Meta Graph API v19.0"}
            </p>
          </div>

          <div className="flex items-center gap-1.5 flex-wrap xl:flex-nowrap shrink-0">
            <button
              onClick={() => {
                setBoostWizardMode("QUICK_BOOST_PRODUCT");
                setIsBoostWizardOpen(true);
              }}
              className="inline-flex items-center gap-1 px-2.5 py-1.5 rounded-xl bg-emerald-700 hover:bg-emerald-800 text-white font-bold text-xs shadow-xs transition-colors cursor-pointer whitespace-nowrap"
            >
              <Zap className="w-3.5 h-3.5" />
              <span>{"Quick Boost"}</span>
            </button>

            <button
              onClick={() => {
                setBoostWizardMode("QUICK_BOOST_POST");
                setIsBoostWizardOpen(true);
              }}
              className="inline-flex items-center gap-1 px-2.5 py-1.5 rounded-xl bg-blue-600 hover:bg-blue-700 text-white font-bold text-xs shadow-xs transition-colors cursor-pointer whitespace-nowrap"
            >
              <Facebook className="w-3.5 h-3.5" />
              <span>{"Boost Post"}</span>
            </button>

            <button
              onClick={() => {
                setBoostWizardMode("PRODUCT_SALES");
                setIsBoostWizardOpen(true);
              }}
              className="inline-flex items-center gap-1 px-2.5 py-1.5 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white font-bold text-xs shadow-xs transition-colors cursor-pointer whitespace-nowrap"
            >
              <Rocket className="w-3.5 h-3.5" />
              <span>{"Sales Campaign"}</span>
            </button>

            <button
              onClick={() => setIsAddCampaignOpen(true)}
              className="inline-flex items-center gap-1 px-2.5 py-1.5 rounded-xl bg-neutral-100 hover:bg-neutral-200 text-neutral-800 font-bold text-xs border border-neutral-200 transition-colors cursor-pointer whitespace-nowrap"
              title="Create manual UTM tracking link for TikTok / Google / YouTube"
            >
              <Plus className="w-3.5 h-3.5" />
              <span>{"+ UTM"}</span>
            </button>

            <button
              onClick={handleSyncMetaAds}
              disabled={isSyncingMeta}
              className="inline-flex items-center gap-1 px-2.5 py-1.5 rounded-xl bg-blue-50 hover:bg-blue-100 disabled:opacity-50 text-blue-800 border border-blue-200 font-bold text-xs transition-colors cursor-pointer whitespace-nowrap"
              title={"Two-Way Sync Campaigns, AdSets, Ads, Billing Guard & Live Order ROAS"}
            >
              <RefreshCw className={`w-3.5 h-3.5 ${isSyncingMeta ? "animate-spin" : ""}`} />
              <span>{isSyncingMeta ? "Syncing..." : "Sync Meta"}</span>
            </button>

            <button
              onClick={handleCopyCatalogXml}
              className="inline-flex items-center gap-1 px-2.5 py-1.5 rounded-xl bg-neutral-100 hover:bg-neutral-200 text-neutral-800 font-bold text-xs border border-neutral-300 transition-colors cursor-pointer whitespace-nowrap"
              title={"Copy Meta Advantage+ & Commerce Manager Product Catalog XML Feed URL"}
            >
              {copiedCatalogXml ? (
                <>
                  <Check className="w-3.5 h-3.5 text-emerald-600" />
                  <span className="text-emerald-700">{"Copied!"}</span>
                </>
              ) : (
                <>
                  <Share2 className="w-3.5 h-3.5 text-neutral-600" />
                  <span>{"Catalog XML"}</span>
                </>
              )}
            </button>

            <span className="text-xs font-bold text-emerald-700 bg-emerald-50 border border-emerald-200/80 px-2.5 py-1.5 rounded-xl whitespace-nowrap">
              {`ROAS: ${averageRoas}`}
            </span>
          </div>
        </div>

        {metaSyncMsg && (
          <div className="p-3 bg-blue-50 border border-blue-200 rounded-2xl text-blue-900 text-xs flex items-center justify-between animate-in fade-in">
            <div className="flex items-center gap-2">
              <CheckCircle2 className="w-4 h-4 text-blue-600 shrink-0" />
              <span className="font-semibold">{metaSyncMsg}</span>
            </div>
            <button
              onClick={() => setMetaSyncMsg("")}
              className="text-blue-500 hover:text-blue-800 p-1"
            >
              <X className="w-3.5 h-3.5" />
            </button>
          </div>
        )}

        {/* 4 Summary KPI Cards */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 pt-1">
          <div className="bg-neutral-50 rounded-2xl p-3.5 border border-neutral-200/80">
            <span className="text-[11px] font-semibold text-neutral-500 block">
              {"Active Campaigns"}
            </span>
            <span className="text-lg font-black text-neutral-900 mt-1 block">
              {totalCampaignsCount}
            </span>
          </div>
          <div className="bg-neutral-50 rounded-2xl p-3.5 border border-neutral-200/80">
            <span className="text-[11px] font-semibold text-neutral-500 block">
              {"Total Ad Spend"}
            </span>
            <span className="text-lg font-black text-rose-600 mt-1 block">
              {formatBDT(totalSpendSum)}
            </span>
          </div>
          <div className="bg-neutral-50 rounded-2xl p-3.5 border border-neutral-200/80">
            <span className="text-[11px] font-semibold text-neutral-500 block">
              {"Attributed Orders"}
            </span>
            <span className="text-lg font-black text-neutral-900 mt-1 block">
              {totalOrdersSum.toLocaleString()}
            </span>
          </div>
          <div className="bg-emerald-50/70 rounded-2xl p-3.5 border border-emerald-200/80">
            <span className="text-[11px] font-semibold text-emerald-800 block">
              {"Attributed Revenue"}
            </span>
            <span className="text-lg font-black text-emerald-700 mt-1 block">
              {formatBDT(totalRevenueSum)}
            </span>
          </div>
        </div>

        {/* Action Success Alert */}
        {actionSuccessMsg && (
          <div className="bg-emerald-50 border border-emerald-300 text-emerald-800 px-4 py-2.5 rounded-xl text-xs font-bold flex items-center justify-between shadow-xs animate-in fade-in duration-200">
            <span className="flex items-center gap-2">
              <Check className="w-4 h-4 text-emerald-600 shrink-0" />
              <span>{actionSuccessMsg}</span>
            </span>
            <button
              onClick={() => setActionSuccessMsg("")}
              className="text-emerald-700 hover:text-emerald-900 font-bold px-1.5 py-0.5 rounded cursor-pointer"
            >
              ✕
            </button>
          </div>
        )}

        {/* Filters & Search Toolbar */}
        <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3 pt-2">
          {/* Platform Filters */}
          <div className="flex items-center gap-1.5 overflow-x-auto pb-1 sm:pb-0 scrollbar-none">
            {["ALL", "facebook", "tiktok", "instagram", "google", "youtube"].map((src) => (
              <button
                key={src}
                onClick={() => {
                  setSourceFilter(src);
                  setCurrentPage(1);
                }}
                className={`px-3 py-1.5 rounded-xl font-bold text-xs capitalize transition-all cursor-pointer whitespace-nowrap ${
                  sourceFilter.toLowerCase() === src.toLowerCase()
                    ? "bg-neutral-900 text-white shadow-xs"
                    : "bg-neutral-100 hover:bg-neutral-200/80 text-neutral-600"
                }`}
              >
                {src === "ALL" ? ("All Platforms") : src}
              </button>
            ))}
          </div>

          {/* Search Box */}
          <div className="relative min-w-[220px]">
            <Search className="w-3.5 h-3.5 text-neutral-400 absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none" />
            <input
              type="text"
              placeholder={"Search campaigns or products..."}
              value={campaignSearch}
              onChange={(e) => {
                setCampaignSearch(e.target.value);
                setCurrentPage(1);
              }}
              className="w-full pl-8 pr-3 py-1.5 text-xs rounded-xl border border-neutral-200 focus:outline-none focus:border-emerald-600 focus:ring-1 focus:ring-emerald-600 bg-neutral-50/50"
            />
          </div>
        </div>

        {/* Table Container */}
        <div className="overflow-x-auto rounded-2xl border border-neutral-200">
          <table className="w-full text-left text-xs">
            <thead className="bg-neutral-50 text-neutral-500 font-bold border-b border-neutral-200">
              <tr>
                <th className="py-3 px-3.5">{"Campaign & Target Product"}</th>
                <th className="py-3 px-3">{"Platform"}</th>
                <th className="py-3 px-3 text-center">{"Status"}</th>
                <th className="py-3 px-3 text-right">{"Ad Spend (৳)"}</th>
                <th className="py-3 px-3 text-center">{"Clicks"}</th>
                <th className="py-3 px-3 text-center">{"Orders"}</th>
                <th className="py-3 px-3 text-right">{"Total Revenue"}</th>
                <th className="py-3 px-3 text-right">ROAS</th>
                <th className="py-3 px-3 text-center min-w-[240px]">{"Funnel & Actions"}</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-neutral-100">
              {paginatedCampaigns.length === 0 ? (
                <tr>
                  <td colSpan={9} className="py-10 text-center text-neutral-400 text-xs">
                    {"No campaigns match your filter."}
                  </td>
                </tr>
              ) : (
                paginatedCampaigns.map((camp, idx) => {
                  const globalIdx = startIndex + idx;
                  const isCopied = copiedLinkIndex === globalIdx;
                  const isExpanded = Boolean(expandedCampaignIds[camp.id]);
                  const adsetsList = Array.isArray(camp.adsets) ? camp.adsets : [];

                  let sourceColor = "bg-neutral-100 text-neutral-800 border-neutral-200";
                  if (camp.source === "facebook") sourceColor = "bg-blue-50 text-blue-700 border-blue-200";
                  else if (camp.source === "tiktok") sourceColor = "bg-neutral-900 text-white border-neutral-800";
                  else if (camp.source === "instagram") sourceColor = "bg-pink-50 text-pink-700 border-pink-200";
                  else if (camp.source === "google") sourceColor = "bg-amber-50 text-amber-800 border-amber-200";
                  else if (camp.source === "youtube") sourceColor = "bg-rose-50 text-rose-700 border-rose-200";

                  return (
                    <Fragment key={camp.id || idx}>
                    <tr className={`hover:bg-neutral-50/80 transition-colors ${camp.isPaused ? "opacity-70 bg-neutral-50/40" : ""}`}>
                      <td className="py-3 px-3.5 max-w-[290px]">
                        <div className="flex items-start gap-2">
                          {camp.isSaasCampaign && (
                            <button
                              type="button"
                              onClick={() =>
                                setExpandedCampaignIds((prev) => ({ ...prev, [camp.id]: !prev[camp.id] }))
                              }
                              className="mt-0.5 p-1 rounded-lg bg-neutral-100 hover:bg-neutral-200 text-neutral-700 shrink-0 cursor-pointer"
                              title="Drill down into AdSets & Ads"
                            >
                              {isExpanded ? <ChevronDown className="w-3.5 h-3.5" /> : <ChevronRight className="w-3.5 h-3.5" />}
                            </button>
                          )}
                          <div className="min-w-0 flex-1">
                            <div className="font-bold text-neutral-900 truncate flex items-center gap-1.5" title={camp.name}>
                              <span className="truncate">{camp.name}</span>
                              {camp.isSaasCampaign && (
                                <span className="text-[9px] uppercase px-1.5 py-0.5 rounded bg-indigo-50 text-indigo-700 border border-indigo-200 shrink-0 font-extrabold">
                                  {camp.campaignType === "QUICK_BOOST_POST" ? "Post Boost" : camp.campaignType === "QUICK_BOOST_PRODUCT" ? "Product Boost" : "Meta Live"}
                                </span>
                              )}
                            </div>
                            <div className="flex items-center gap-1.5 text-[11px] text-neutral-500 mt-1 flex-wrap">
                              <Package className="w-3 h-3 text-emerald-600 flex-shrink-0" />
                              <span className="truncate" title={camp.productName}>
                                {camp.productName}
                              </span>
                              {camp.metaCampaignId && (
                                <span className="text-[10px] font-mono text-neutral-400">
                                  #{camp.metaCampaignId}
                                </span>
                              )}
                            </div>
                            {camp.billingGuardAlert && (
                              <div className="mt-1 text-[10px] font-bold text-rose-700 bg-rose-50 px-2 py-0.5 rounded border border-rose-200">
                                ⚠️ {camp.billingGuardAlert}
                              </div>
                            )}
                          </div>
                        </div>
                      </td>
                      <td className="py-3 px-3 capitalize">
                        <span className={`px-2 py-0.5 rounded-md font-bold text-[11px] border ${sourceColor}`}>
                          {camp.source}
                        </span>
                        {camp.effectiveStatus && camp.isSaasCampaign && (
                          <div className="text-[9px] font-mono font-bold text-neutral-500 mt-1">
                            {camp.effectiveStatus}
                          </div>
                        )}
                      </td>
                      <td className="py-3 px-3 text-center">
                        <button
                          type="button"
                          onClick={() =>
                            camp.isSaasCampaign
                              ? handleToggleSaasCampaignStatus(camp)
                              : handleToggleCampaignStatus(camp)
                          }
                          className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[11px] font-bold transition-all cursor-pointer border shadow-2xs ${
                            camp.isPaused
                              ? "bg-neutral-100 text-neutral-600 border-neutral-300 hover:bg-neutral-200"
                              : "bg-emerald-50 text-emerald-800 border-emerald-300 hover:bg-emerald-100"
                          }`}
                          title={
                            camp.isPaused
                              ? "Click to Activate Campaign on Meta & Store (Turn ON)"
                              : "Click to Pause Campaign on Meta & Store (Turn OFF)"
                          }
                        >
                          <span
                            className={`w-2 h-2 rounded-full ${
                              camp.isPaused ? "bg-neutral-400" : "bg-emerald-500 animate-pulse"
                            }`}
                          />
                          <span>
                            {camp.isPaused ? "Paused (OFF)" : "Active (ON)"}
                          </span>
                        </button>
                        {camp.isSaasCampaign && Number(camp.dailyBudget || 0) > 0 && (
                          <div className="text-[10px] font-mono text-neutral-500 mt-1">
                            {Number(camp.dailyBudget).toLocaleString()} {camp.currency || "BDT"}/d
                          </div>
                        )}
                      </td>
                      <td className="py-3 px-3 text-right text-rose-600 font-bold font-mono">
                        {formatBDT(camp.spend)}
                      </td>
                      <td className="py-3 px-3 text-center text-neutral-700 font-mono font-medium">
                        <div>{Number(camp.clicks || 0).toLocaleString()}</div>
                        {camp.isSaasCampaign && Number(camp.impressions || 0) > 0 && (
                          <div className="text-[10px] text-neutral-400">
                            {Number(camp.impressions).toLocaleString()} imp
                          </div>
                        )}
                      </td>
                      <td className="py-3 px-3 text-center">
                        <span className="inline-flex items-center gap-1 bg-emerald-50 text-emerald-800 font-bold px-2 py-0.5 rounded-full border border-emerald-200/60 font-mono">
                          {camp.orders}
                        </span>
                      </td>
                      <td className="py-3 px-3 text-right font-extrabold text-emerald-700 font-mono">
                        {formatBDT(camp.revenue)}
                      </td>
                      <td className="py-3 px-3 text-right">
                        <span className={`font-mono font-black px-2 py-0.5 rounded-md text-[11px] ${
                          camp.roasNum >= 10
                            ? "bg-emerald-100 text-emerald-900 border border-emerald-300"
                            : camp.roasNum >= 5
                            ? "bg-emerald-50 text-emerald-800"
                            : "bg-amber-50 text-amber-800"
                        }`}>
                          {camp.roas}
                        </span>
                      </td>
                      <td className="py-3 px-3 text-center">
                        <div className="flex items-center justify-center gap-1.5 flex-wrap">
                          {(!camp.postId) && (
                            <button
                              onClick={() => handleEditLanding(camp)}
                              className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg text-[11px] font-bold bg-emerald-50 hover:bg-emerald-100 text-emerald-800 border border-emerald-200 transition-all cursor-pointer"
                              title={"Edit Single-Product Campaign Landing in Admin"}
                            >
                              <Layers className="w-3 h-3 text-emerald-600" />
                              <span>{"Edit Landing"}</span>
                            </button>
                          )}
                          <button
                            onClick={() => handleOpenLivePage(camp)}
                            className="inline-flex items-center gap-1 px-2 py-1 rounded-lg text-[11px] font-bold bg-neutral-100 hover:bg-neutral-200 text-neutral-700 transition-all cursor-pointer"
                            title={"Open Live Customer Funnel in new tab"}
                          >
                            <ExternalLink className="w-3 h-3 text-neutral-500" />
                            <span>{"Live"}</span>
                          </button>
                          <button
                            onClick={() => handleCopyTrackingLink(camp, globalIdx)}
                            className={`inline-flex items-center gap-1 px-2.5 py-1 rounded-lg text-[11px] font-bold transition-all cursor-pointer ${
                              isCopied
                                ? "bg-emerald-600 text-white shadow-xs"
                                : "bg-neutral-100 hover:bg-neutral-200 text-neutral-700"
                            }`}
                            title={"Copy trackable UTM Ad URL"}
                          >
                            {isCopied ? (
                              <>
                                <Check className="w-3 h-3 text-white" />
                                <span>{"Copied"}</span>
                              </>
                            ) : (
                              <>
                                <Copy className="w-3 h-3 text-neutral-500" />
                                <span>{"Copy URL"}</span>
                              </>
                            )}
                          </button>
                          <button
                            type="button"
                            onClick={() => setCampaignToDelete(camp)}
                            className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg text-[11px] font-bold bg-rose-50 hover:bg-rose-100 text-rose-700 border border-rose-200 transition-all cursor-pointer"
                            title={"Permanently Delete Campaign"}
                          >
                            <Trash2 className="w-3 h-3 text-rose-600" />
                            <span>{"Delete"}</span>
                          </button>
                        </div>
                      </td>
                    </tr>

                    {/* Campaign -> AdSet -> Ad Drill-Down Dropdown */}
                    {camp.isSaasCampaign && isExpanded && (
                      <tr key={`${camp.id}-drill`} className="bg-neutral-50/90">
                        <td colSpan={9} className="p-4 border-t border-neutral-200">
                          <div className="space-y-3">
                            <div className="flex items-center justify-between text-[11px] font-black text-neutral-700 uppercase">
                              <span className="flex items-center gap-1.5">
                                <SlidersHorizontal className="w-3.5 h-3.5 text-indigo-600" />
                                <span>Ad Sets & Live Creative Review Drill-Down ({adsetsList.length} AdSets)</span>
                              </span>
                              <span className="text-[10px] font-mono text-neutral-500">
                                Two-way synced with Meta Graph API
                              </span>
                            </div>

                            {adsetsList.length === 0 ? (
                              <div className="p-3 bg-white rounded-xl border border-neutral-200 text-neutral-400">
                                No nested AdSets synced yet. Click "Sync Meta (2-Way)" above to pull full tree.
                              </div>
                            ) : (
                              adsetsList.map((asItem) => {
                                const adsList = Array.isArray(asItem.ads) ? asItem.ads : [];
                                const targeting = asItem.targeting || {};
                                const draftBudget = adSetBudgetEdits[asItem.id] ?? asItem.dailyBudget ?? 0;
                                return (
                                  <div key={asItem.id} className="bg-white rounded-2xl p-3.5 border border-neutral-200 space-y-3">
                                    <div className="flex flex-col md:flex-row md:items-center justify-between gap-2 pb-2.5 border-b border-neutral-100">
                                      <div>
                                        <div className="font-bold text-neutral-900 flex items-center gap-2">
                                          <span>AdSet: {asItem.name}</span>
                                          <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-neutral-100 text-neutral-600">
                                            {asItem.optimizationGoal}
                                          </span>
                                          <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-blue-50 text-blue-700">
                                            {asItem.effectiveStatus}
                                          </span>
                                        </div>
                                        <div className="text-[10px] text-neutral-500 mt-1 flex flex-wrap gap-2">
                                          <span>Age: {targeting.age_min || 18}–{targeting.age_max || 55}</span>
                                          <span>Spend: {Number(asItem.spend || 0).toLocaleString()} {camp.currency}</span>
                                          <span>Clicks: {Number(asItem.clicks || 0).toLocaleString()}</span>
                                          <span>CTR: {Number(asItem.ctr || 0).toFixed(2)}%</span>
                                        </div>
                                      </div>

                                      {/* Two-Way Daily Budget Inline Editor */}
                                      <div className="flex items-center gap-1.5">
                                        <span className="text-[10px] font-bold text-neutral-500">Daily ({camp.currency}):</span>
                                        <input
                                          type="number"
                                          min="1"
                                          value={draftBudget}
                                          onChange={(e) =>
                                            setAdSetBudgetEdits((prev) => ({ ...prev, [asItem.id]: e.target.value }))
                                          }
                                          className="w-24 px-2 py-1 rounded-lg border border-neutral-200 font-mono text-xs"
                                        />
                                        <button
                                          type="button"
                                          onClick={() => handleSaveAdSetBudget(asItem)}
                                          disabled={savingAdSetId === asItem.id}
                                          className="px-2.5 py-1 rounded-lg bg-indigo-600 hover:bg-indigo-700 text-white font-bold text-[11px] cursor-pointer disabled:opacity-50"
                                        >
                                          {savingAdSetId === asItem.id ? "Saving..." : "Update Meta"}
                                        </button>
                                      </div>
                                    </div>

                                    {/* Nested Ads & Meta Policy Review Status */}
                                    {adsList.length > 0 && (
                                      <div className="grid grid-cols-1 md:grid-cols-2 gap-2.5">
                                        {adsList.map((ad) => (
                                          <div key={ad.id} className="p-2.5 rounded-xl bg-neutral-50 border border-neutral-200 flex items-start gap-2.5">
                                            {ad.imageUrl && (
                                              <img
                                                src={ad.imageUrl}
                                                alt=""
                                                className="w-12 h-12 rounded-lg object-cover border border-neutral-200 shrink-0"
                                              />
                                            )}
                                            <div className="min-w-0 flex-1">
                                              <div className="font-bold text-neutral-900 truncate flex items-center justify-between gap-2">
                                                <span className="truncate">{ad.headline || ad.name}</span>
                                                <span className={`text-[9px] font-mono px-1.5 py-0.5 rounded shrink-0 ${
                                                  ad.effectiveStatus === "ACTIVE"
                                                    ? "bg-emerald-100 text-emerald-800"
                                                    : ad.effectiveStatus === "DISAPPROVED" || ad.effectiveStatus === "WITH_ISSUES"
                                                    ? "bg-rose-100 text-rose-800"
                                                    : "bg-amber-100 text-amber-800"
                                                }`}>
                                                  {ad.effectiveStatus}
                                                </span>
                                              </div>
                                              {ad.primaryText && (
                                                <p className="text-[10px] text-neutral-600 line-clamp-2 mt-0.5">{ad.primaryText}</p>
                                              )}
                                              <div className="text-[10px] text-neutral-400 mt-1">
                                                Ad ID: {ad.metaAdId || ad.id} • Clicks: {ad.clicks || 0} • Spend: {Number(ad.spend || 0).toLocaleString()} {camp.currency}
                                              </div>
                                              {ad.reviewFeedback && Object.keys(ad.reviewFeedback).length > 0 && (
                                                <div className="mt-1 text-[10px] text-rose-700 font-semibold">
                                                  Policy Feedback: {JSON.stringify(ad.reviewFeedback)}
                                                </div>
                                              )}
                                            </div>
                                          </div>
                                        ))}
                                      </div>
                                    )}
                                  </div>
                                );
                              })
                            )}
                          </div>
                        </td>
                      </tr>
                    )}
                    </Fragment>
                  );
                })
              )}
            </tbody>
          </table>
        </div>

        {/* Pagination Bar (Minimum 5 items per page) */}
        <div className="flex flex-col sm:flex-row items-center justify-between gap-3 pt-1 border-t border-neutral-100 text-xs text-neutral-500">
          <div className="flex items-center gap-2">
            <span>
              {`Showing ${filteredCampaigns.length > 0 ? startIndex + 1 : 0} to ${Math.min(
                    startIndex + pageSize,
                    filteredCampaigns.length
                  )} of ${filteredCampaigns.length} campaigns`}
            </span>
            <div className="flex items-center gap-1 ml-2">
              <span className="text-[11px] text-neutral-400">{"Per page:"}</span>
              {[5, 10, 20].map((size) => (
                <button
                  key={size}
                  onClick={() => {
                    setPageSize(size);
                    setCurrentPage(1);
                  }}
                  className={`px-2 py-0.5 rounded text-[11px] font-bold cursor-pointer transition-colors ${
                    pageSize === size
                      ? "bg-neutral-900 text-white"
                      : "bg-neutral-100 text-neutral-600 hover:bg-neutral-200"
                  }`}
                >
                  {size}
                </button>
              ))}
            </div>
          </div>

          {/* Page Buttons: Prev, 1, 2, 3, Next */}
          <div className="flex items-center gap-1.5">
            <button
              onClick={() => setCurrentPage((p) => Math.max(1, p - 1))}
              disabled={validCurrentPage <= 1}
              className="p-1.5 rounded-lg border border-neutral-200 text-neutral-600 hover:bg-neutral-50 disabled:opacity-30 disabled:pointer-events-none cursor-pointer"
              title={"Previous Page"}
            >
              <ChevronLeft className="w-4 h-4" />
            </button>

            {Array.from({ length: totalPages }, (_, i) => i + 1).map((pageNum) => (
              <button
                key={pageNum}
                onClick={() => setCurrentPage(pageNum)}
                className={`w-7 h-7 rounded-lg text-xs font-bold transition-all cursor-pointer ${
                  validCurrentPage === pageNum
                    ? "bg-emerald-700 text-white shadow-xs"
                    : "border border-neutral-200 hover:bg-neutral-50 text-neutral-700"
                }`}
              >
                {pageNum}
              </button>
            ))}

            <button
              onClick={() => setCurrentPage((p) => Math.min(totalPages, p + 1))}
              disabled={validCurrentPage >= totalPages}
              className="p-1.5 rounded-lg border border-neutral-200 text-neutral-600 hover:bg-neutral-50 disabled:opacity-30 disabled:pointer-events-none cursor-pointer"
              title={"Next Page"}
            >
              <ChevronRight className="w-4 h-4" />
            </button>
          </div>
        </div>
      </div>

      {/* Modal: Create Ad Campaign */}
      {isAddCampaignOpen && (
        <div className="fixed inset-0 z-50 bg-black/50 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl max-w-md w-full p-6 border border-neutral-200 shadow-xl space-y-4 text-xs animate-in fade-in zoom-in-95 duration-150">
            <div className="flex items-center justify-between border-b border-neutral-100 pb-3">
              <div className="flex items-center gap-2">
                <Plus className="w-4 h-4 text-emerald-600" />
                <h3 className="font-bold text-sm text-neutral-900">
                  {"Create Trackable Ad Campaign"}
                </h3>
              </div>
              <button
                onClick={() => setIsAddCampaignOpen(false)}
                className="p-1 rounded-lg text-neutral-400 hover:text-neutral-700 hover:bg-neutral-100"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <form onSubmit={handleCreateCampaign} className="space-y-3.5">
              <div>
                <label className="block font-bold text-neutral-700 mb-1">
                  {"Campaign Name"} <span className="text-rose-500">*</span>
                </label>
                <input
                  type="text"
                  required
                  placeholder={"e.g. T900 Ultra Meta Scaling Ad"}
                  value={newCampName}
                  onChange={(e) => setNewCampName(e.target.value)}
                  className="w-full px-3 py-2 rounded-xl border border-neutral-200 focus:outline-none focus:border-emerald-600 bg-neutral-50/50"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block font-bold text-neutral-700 mb-1">
                    {"Ad Platform"}
                  </label>
                  <select
                    value={newCampSource}
                    onChange={(e) => setNewCampSource(e.target.value)}
                    className="w-full px-3 py-2 rounded-xl border border-neutral-200 focus:outline-none focus:border-emerald-600 bg-neutral-50/50 capitalize"
                  >
                    <option value="facebook">Facebook Ads</option>
                    <option value="tiktok">TikTok Ads</option>
                    <option value="instagram">Instagram Ads</option>
                    <option value="google">Google Ads</option>
                    <option value="youtube">YouTube Ads</option>
                  </select>
                </div>

                <div>
                  <label className="block font-bold text-neutral-700 mb-1">
                    {"Target Product"}
                  </label>
                  <select
                    value={newCampProductId}
                    onChange={(e) => setNewCampProductId(e.target.value)}
                    className="w-full px-3 py-2 rounded-xl border border-neutral-200 focus:outline-none focus:border-emerald-600 bg-neutral-50/50"
                  >
                    <option value="all">{"🌐 Entire Store Catalog"}</option>
                    {products.map((p) => (
                      <option key={p.id} value={p.id}>
                        📦 {p.name}
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block font-bold text-neutral-700 mb-1">
                    {"Ad Spend Budget (৳)"}
                  </label>
                  <input
                    type="number"
                    min="100"
                    step="100"
                    placeholder="5000"
                    value={newCampSpend}
                    onChange={(e) => setNewCampSpend(e.target.value)}
                    className="w-full px-3 py-2 rounded-xl border border-neutral-200 focus:outline-none focus:border-emerald-600 bg-neutral-50/50 font-mono"
                  />
                </div>

                <div>
                  <label className="block font-bold text-neutral-700 mb-1">
                    {"Target / Estimated Clicks"}
                  </label>
                  <input
                    type="number"
                    min="0"
                    placeholder="1500"
                    value={newCampClicks}
                    onChange={(e) => setNewCampClicks(e.target.value)}
                    className="w-full px-3 py-2 rounded-xl border border-neutral-200 focus:outline-none focus:border-emerald-600 bg-neutral-50/50 font-mono"
                  />
                </div>
              </div>

              {/* Generated URL Preview */}
              <div className="p-3 bg-neutral-50 rounded-xl border border-neutral-200 space-y-1">
                <span className="text-[10px] font-bold text-neutral-500 uppercase block">
                  {"Generated Trackable UTM URL:"}
                </span>
                <span className="font-mono text-[10px] text-emerald-800 break-all block">
                  {typeof window !== "undefined" ? window.location.origin : "https://amardokan.com"}
                  {newCampProductId !== "all"
                    ? `/campaign-products?product=${newCampProductId}&utm_source=${newCampSource}&utm_campaign=${newCampName ? newCampName.toLowerCase().replace(/[^a-z0-9]+/g, "_") : "campaign"}`
                    : `/?utm_source=${newCampSource}&utm_campaign=${newCampName ? newCampName.toLowerCase().replace(/[^a-z0-9]+/g, "_") : "campaign"}`}
                </span>
              </div>

              <div className="flex items-center justify-end gap-2 pt-2 border-t border-neutral-100">
                <button
                  type="button"
                  onClick={() => setIsAddCampaignOpen(false)}
                  className="px-4 py-2 rounded-xl border border-neutral-200 text-neutral-700 hover:bg-neutral-50 font-semibold"
                >
                  {"Cancel"}
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 rounded-xl bg-emerald-700 hover:bg-emerald-800 text-white font-bold shadow-xs cursor-pointer"
                >
                  {"Save & Track Campaign"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Modal: Delete Ad Campaign Confirmation */}
      {campaignToDelete && (
        <div className="fixed inset-0 z-50 bg-black/50 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl max-w-md w-full p-6 border border-neutral-200 shadow-2xl space-y-4 text-xs animate-in fade-in zoom-in-95 duration-150">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-2xl bg-rose-100 text-rose-600 flex items-center justify-center shrink-0">
                <Trash2 className="w-5 h-5" />
              </div>
              <div>
                <h3 className="font-extrabold text-sm sm:text-base text-neutral-900">
                  {"Delete Ad Campaign?"}
                </h3>
                <p className="text-[11px] text-neutral-500">
                  {"Are you sure you want to permanently delete this campaign?"}
                </p>
              </div>
            </div>

            <div className="bg-neutral-50 p-3.5 rounded-2xl border border-neutral-200/80 space-y-1">
              <div className="font-bold text-neutral-900 text-xs">{campaignToDelete.name}</div>
              <div className="text-neutral-500 text-[11px] flex items-center gap-2">
                <span className="capitalize font-semibold text-neutral-700">{campaignToDelete.source}</span>
                <span>•</span>
                <span>{campaignToDelete.productName}</span>
              </div>
            </div>

            <div className="text-[11px] text-rose-700 bg-rose-50/80 p-3 rounded-xl border border-rose-200/60 leading-relaxed">
              ⚠️ {"This campaign will be permanently deleted and will never show again anywhere."}
            </div>

            <div className="flex items-center justify-end gap-2.5 pt-2 border-t border-neutral-100">
              <button
                type="button"
                onClick={() => setCampaignToDelete(null)}
                className="px-4 py-2 rounded-xl border border-neutral-200 text-neutral-700 hover:bg-neutral-50 font-semibold cursor-pointer"
              >
                {"Cancel"}
              </button>
              <button
                type="button"
                onClick={confirmDeleteCampaign}
                className="px-4 py-2 rounded-xl bg-rose-600 hover:bg-rose-700 text-white font-bold shadow-xs cursor-pointer inline-flex items-center gap-1.5"
              >
                <Trash2 className="w-3.5 h-3.5" />
                <span>{"Yes, Delete Campaign"}</span>
              </button>
            </div>
          </div>
        </div>
      )}
      <MetaBoostWizardDrawer
        isOpen={isBoostWizardOpen}
        initialMode={boostWizardMode}
        products={products}
        connection={metaConnection}
        onClose={() => setIsBoostWizardOpen(false)}
        onLaunched={(createdCamp) => {
          if (createdCamp) {
            setSaasCampaigns((prev) => [createdCamp, ...prev]);
            setActionSuccessMsg(
              `Launched "${createdCamp.name}" on Meta! Campaign ID: ${createdCamp.metaCampaignId}`
            );
          }
          loadSaasAdsWorkspace();
        }}
      />
      </>
      )}

      {!isCampaignsView && showPixelGuide && (
        <div className="bg-gradient-to-br from-amber-50/70 via-white to-orange-50/40 rounded-3xl p-6 border border-amber-200/90 shadow-xs space-y-4 animate-in fade-in duration-200">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-amber-200/60 pb-4">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-2xl bg-amber-500 text-white flex items-center justify-center shadow-xs shrink-0">
                <BookOpen className="w-5 h-5" />
              </div>
              <div>
                <h3 className="text-base font-black text-neutral-900">
                  {"Meta Pixel & CAPI Setup Instructions"}
                </h3>
                <p className="text-xs text-neutral-600 mt-0.5">
                  {"Step-by-step instructions to connect your Meta Pixel ID and Conversions API (CAPI) Token via Events Manager."}
                </p>
              </div>
            </div>

            {/* Quick External Events Manager Link */}
            <div className="flex items-center gap-2 flex-wrap">
              <a
                href={pixelId ? `https://business.facebook.com/events_manager2/list/dataset/${pixelId}` : "https://business.facebook.com/events_manager2"}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-blue-600 hover:bg-blue-700 text-white font-bold text-xs shadow-xs transition-colors cursor-pointer"
              >
                <span>Events Manager</span>
                <ExternalLink className="w-3.5 h-3.5" />
              </a>

              <button
                onClick={() => setShowPixelGuide(false)}
                className="p-1.5 rounded-xl text-neutral-400 hover:text-neutral-700 hover:bg-neutral-100 transition-colors cursor-pointer"
                title={"Hide guide"}
              >
                <X className="w-4 h-4" />
              </button>
            </div>
          </div>

          {/* Events Manager & CAPI Setup Steps */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 pt-1 text-xs animate-in fade-in">
            <div className="bg-white p-4 rounded-2xl border border-neutral-200/90 shadow-2xs space-y-2">
              <div className="flex items-center gap-2 text-blue-700 font-bold">
                <span className="w-5 h-5 rounded-full bg-blue-100 flex items-center justify-center text-[11px]">1</span>
                <span>Collect Pixel / Dataset ID</span>
              </div>
              <p className="text-neutral-600 leading-relaxed">
                Go to{" "}
                <a
                  href="https://business.facebook.com/events_manager2"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-blue-600 font-bold underline inline-flex items-center gap-0.5"
                >
                  Meta Events Manager <ExternalLink className="w-2.5 h-2.5" />
                </a>
                . Select your Pixel or Dataset from the left menu. In the <strong>Settings</strong> tab, copy the <strong>Dataset ID / Pixel ID</strong> and paste it into the <strong>Meta Pixel ID</strong> field below.
              </p>
            </div>

            <div className="bg-white p-4 rounded-2xl border border-neutral-200/90 shadow-2xs space-y-2">
              <div className="flex items-center gap-2 text-blue-700 font-bold">
                <span className="w-5 h-5 rounded-full bg-blue-100 flex items-center justify-center text-[11px]">2</span>
                <span>Generate CAPI Access Token</span>
              </div>
              <p className="text-neutral-600 leading-relaxed">
                In Events Manager Settings, scroll down to <strong>Conversions API</strong>. Click the <strong>"Generate access token"</strong> link to receive a long access token (<code className="bg-neutral-100 px-1 rounded text-[11px]">EAAG...</code>). Copy the full token and paste it into <strong>CAPI Server Token</strong> below.
              </p>
            </div>

            <div className="bg-white p-4 rounded-2xl border border-neutral-200/90 shadow-2xs space-y-2">
              <div className="flex items-center gap-2 text-blue-700 font-bold">
                <span className="w-5 h-5 rounded-full bg-blue-100 flex items-center justify-center text-[11px]">3</span>
                <span>Test & Verify Deduplication</span>
              </div>
              <p className="text-neutral-600 leading-relaxed">
                In Events Manager under the <strong>Test events</strong> tab, copy your test code (<code className="bg-neutral-100 px-1 rounded text-[11px]">TEST84920</code>) into <strong>Test Event Code</strong> below. Then click <strong>"Save & Connect Pixel"</strong> and <strong>"Fire Test Event"</strong>. You will immediately verify green <strong>"Deduplicated"</strong> status.
              </p>
            </div>
          </div>
        </div>
      )}

      {/* Meta Pixel Configuration & Live Event / Chart Panel (Only in Marketing & CAPI menu) */}
      {!isCampaignsView && (
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* Form Settings (Col 6) */}
        <div className="lg:col-span-6 bg-white rounded-3xl p-6 border border-neutral-200 shadow-xs space-y-4 text-xs">
          <div className="flex items-center justify-between border-b border-neutral-100 pb-3">
            <h3 className="font-bold text-sm text-neutral-900 flex items-center gap-1.5">
              <Target className="w-4 h-4 text-emerald-600" />
              <span>{"Meta Pixel & CAPI Configuration"}</span>
            </h3>
            {/* Active Toggle */}
            <label className="flex items-center gap-2 cursor-pointer select-none">
              <span className="text-[11px] font-semibold text-neutral-600">
                {isActive ? ("Active") : ("Paused")}
              </span>
              <input
                type="checkbox"
                checked={isActive}
                onChange={(e) => handleToggleActive(e.target.checked)}
                className="w-4 h-4 text-emerald-600 rounded focus:ring-emerald-500 cursor-pointer"
              />
            </label>
          </div>

          {/* Success / Error Messages */}
          {saveSuccessMsg && (
            <div className="p-3 bg-emerald-50 border border-emerald-200 rounded-xl text-emerald-800 flex items-center gap-2">
              <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
              <span>{saveSuccessMsg}</span>
            </div>
          )}
          {saveErrorMsg && (
            <div className="p-3 bg-rose-50 border border-rose-200 rounded-xl text-rose-800 flex items-center gap-2">
              <AlertCircle className="w-4 h-4 text-rose-600 shrink-0" />
              <span>{saveErrorMsg}</span>
            </div>
          )}

          {/* Target Scope Selection (Entire Store vs Specific Product ONLY) */}
          <div className="space-y-1.5">
            <label className="block font-bold text-neutral-800">
              {"Target Tracking Scope:"}
            </label>
            <div className="grid grid-cols-2 gap-2">
              <button
                type="button"
                onClick={() => setTargetScope("GLOBAL")}
                className={`py-2.5 px-3 rounded-xl border text-center font-bold flex flex-col items-center gap-1 transition-all cursor-pointer ${
                  targetScope === "GLOBAL"
                    ? "bg-emerald-50 border-emerald-600 text-emerald-800 shadow-xs"
                    : "bg-neutral-50 border-neutral-200 text-neutral-600 hover:bg-neutral-100"
                }`}
              >
                <Globe className="w-4 h-4" />
                <span className="text-[11px]">{"Entire Store"}</span>
              </button>

              <button
                type="button"
                onClick={() => setTargetScope("PRODUCT")}
                className={`py-2.5 px-3 rounded-xl border text-center font-bold flex flex-col items-center gap-1 transition-all cursor-pointer ${
                  targetScope === "PRODUCT"
                    ? "bg-emerald-50 border-emerald-600 text-emerald-800 shadow-xs"
                    : "bg-neutral-50 border-neutral-200 text-neutral-600 hover:bg-neutral-100"
                }`}
              >
                <Package className="w-4 h-4" />
                <span className="text-[11px]">{"Specific Product"}</span>
              </button>
            </div>
          </div>

          {/* Conditional Product Dropdown */}
          {targetScope === "PRODUCT" && (
            <div className="p-3 bg-neutral-50 rounded-2xl border border-neutral-200 space-y-1.5 animate-in fade-in">
              <label className="block font-bold text-neutral-800">
                {"Select Target Product:"}
              </label>
              <select
                value={targetProductId}
                onChange={(e) => setTargetProductId(e.target.value)}
                className="w-full px-3 py-2 bg-white rounded-xl border border-neutral-300 font-medium text-neutral-800"
              >
                {products.length === 0 ? (
                  <option value="">{"No products found"}</option>
                ) : (
                  products.map((p) => (
                    <option key={p.id} value={p.id}>
                      {getProductName(p)} (৳{p.price} | SKU: {p.sku})
                    </option>
                  ))
                )}
              </select>
              <p className="text-[10px] text-neutral-500">
                {"Only events, views, clicks & purchases for this selected product will track and display in Live Event Stream & Charts."}
              </p>
            </div>
          )}

          {/* Meta Pixel ID */}
          <div>
            <div className="flex justify-between items-center mb-1">
              <label className="font-semibold text-neutral-700">
                Meta Pixel ID <span className="text-rose-500">*</span>
              </label>
              <a
                href="https://business.facebook.com/events_manager2"
                target="_blank"
                rel="noopener noreferrer"
                className="text-blue-600 hover:text-blue-800 text-[11px] font-bold inline-flex items-center gap-1 transition-colors"
                title={"Open Meta Events Manager to copy Pixel ID"}
              >
                <span>{"Events Manager"}</span>
                <ExternalLink className="w-3 h-3" />
              </a>
            </div>
            <input
              type="text"
              value={pixelId}
              onChange={(e) => setPixelId(e.target.value)}
              placeholder="Enter your Meta Pixel ID"
              className="w-full px-3 py-2 bg-neutral-50 rounded-xl border border-neutral-300 font-mono text-neutral-900 focus:bg-white focus:ring-1 focus:ring-emerald-500"
            />
          </div>

          {/* Meta CAPI Server Token */}
          <div>
            <div className="flex justify-between items-center mb-1">
              <label className="font-semibold text-neutral-700">
                Meta Conversions API (CAPI) Server Token
              </label>
              <div className="flex items-center gap-2.5">
                <a
                  href="https://business.facebook.com/events_manager2"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-blue-600 hover:text-blue-800 text-[11px] font-bold inline-flex items-center gap-1 transition-colors"
                  title={"Generate token in Events Manager Settings"}
                >
                  <span>{"Generate Token"}</span>
                  <ExternalLink className="w-3 h-3" />
                </a>
                <button
                  type="button"
                  onClick={() => setShowToken(!showToken)}
                  className="text-neutral-400 hover:text-neutral-700 flex items-center gap-1 text-[10px]"
                >
                  {showToken ? <EyeOff className="w-3 h-3" /> : <Eye className="w-3 h-3" />}
                  <span>{showToken ? ("Hide") : ("Show")}</span>
                </button>
              </div>
            </div>
            <input
              type={showToken ? "text" : "password"}
              value={capiToken}
              onChange={(e) => setCapiToken(e.target.value)}
              placeholder="EAAG... (Generated in Meta Events Manager)"
              className="w-full px-3 py-2 bg-neutral-50 rounded-xl border border-neutral-300 font-mono text-neutral-900 focus:bg-white focus:ring-1 focus:ring-emerald-500"
            />
          </div>

          {/* Test Event Code (Optional) */}
          <div>
            <label className="block font-semibold text-neutral-700 mb-1">
              Meta Test Event Code{" "}
              <span className="text-[10px] text-neutral-400 font-normal">
                ({"Optional for Meta Events Manager Live Testing"})
              </span>
            </label>
            <input
              type="text"
              value={testEventCode}
              onChange={(e) => setTestEventCode(e.target.value)}
              placeholder="e.g. TEST84920"
              className="w-full px-3 py-2 bg-neutral-50 rounded-xl border border-neutral-300 font-mono text-neutral-900 focus:bg-white focus:ring-1 focus:ring-emerald-500"
            />
          </div>

          {/* BUTTON 1: DEDICATED SAVE & CONNECT BUTTON */}
          <button
            type="button"
            onClick={handleSaveConfig}
            disabled={isSaving}
            className="w-full py-3 px-4 bg-emerald-600 hover:bg-emerald-700 active:bg-emerald-800 disabled:opacity-50 text-white font-bold rounded-xl shadow-md shadow-emerald-600/20 transition-all flex items-center justify-center gap-2 cursor-pointer"
          >
            <Save className="w-4 h-4" />
            <span>
              {isSaving
                ? "Saving Configuration..."
                : "Save & Connect Pixel"}
            </span>
          </button>

          {/* BUTTON 2: DEDICATED FIRE TEST EVENT TOOL */}
          <div className="p-3.5 bg-neutral-50 rounded-2xl border border-neutral-200 space-y-2 mt-4">
            <div className="flex items-center justify-between">
              <span className="font-bold text-neutral-800 flex items-center gap-1.5">
                <Zap className="w-3.5 h-3.5 text-amber-500 fill-amber-500" />
                <span>{"Diagnostics & Test Dispatcher:"}</span>
              </span>
              <span className="text-[10px] text-neutral-400">
                {"Test Button"}
              </span>
            </div>
            <p className="text-[10px] text-neutral-500">
              {"Clicking this sends a test signal to verify Meta Pixel & Server CAPI reception."}
            </p>

            <div className="flex gap-2">
              <select
                value={testEventName}
                onChange={(e) => setTestEventName(e.target.value)}
                className="px-2.5 py-1.5 bg-white border border-neutral-300 rounded-lg text-xs font-semibold text-neutral-800"
              >
                <option value="Purchase">Purchase (৳2,500)</option>
                <option value="AddToCart">AddToCart</option>
                <option value="ViewContent">ViewContent</option>
                <option value="ProductClick">ProductClick</option>
                <option value="InitiateCheckout">InitiateCheckout</option>
              </select>
              <button
                type="button"
                onClick={handleFireTestEvent}
                disabled={isFiringTest}
                className="flex-1 py-1.5 px-3 bg-amber-500 hover:bg-amber-600 active:bg-amber-700 text-white font-bold rounded-lg transition-colors flex items-center justify-center gap-1.5 cursor-pointer disabled:opacity-50"
              >
                <Zap className="w-3.5 h-3.5 fill-white" />
                <span>
                  {isFiringTest
                    ? "Firing..."
                    : "Fire Test Event"}
                </span>
              </button>
            </div>

            {testStatus && (
              <p className="text-[11px] text-emerald-800 bg-emerald-50 border border-emerald-200 p-2 rounded-lg font-mono leading-tight">
                {testStatus}
              </p>
            )}
          </div>
        </div>

        {/* Right Column (Col 6): 2 Clickable Bottom-Border Tabs -> Live Event Stream & Pixel Product Performance Chart */}
        <div className="lg:col-span-6 bg-white rounded-3xl p-6 border border-neutral-200 shadow-xs flex flex-col gap-4">
          {/* Header Tabs + Refresh / Real-time Controls in One Row */}
          <div className="flex flex-wrap justify-between items-center gap-3 border-b border-neutral-200">
            <div className="flex items-center gap-5">
              <button
                type="button"
                onClick={() => setRightPanelTab("stream")}
                className={`pb-2.5 text-xs font-bold transition-colors border-b-2 -mb-px cursor-pointer flex items-center gap-1.5 whitespace-nowrap ${
                  rightPanelTab === "stream"
                    ? "border-emerald-600 text-emerald-700"
                    : "border-transparent text-neutral-500 hover:text-neutral-800"
                }`}
              >
                <Activity className="w-3.5 h-3.5" />
                <span>{"Live Event Stream"}</span>
                <span className="text-[10px] font-mono bg-neutral-100 text-neutral-700 px-1.5 py-0.5 rounded-full">
                  {filteredRecentEvents.length}
                </span>
              </button>
              <button
                type="button"
                onClick={() => setRightPanelTab("chart")}
                className={`pb-2.5 text-xs font-bold transition-colors border-b-2 -mb-px cursor-pointer flex items-center gap-1.5 whitespace-nowrap ${
                  rightPanelTab === "chart"
                    ? "border-emerald-600 text-emerald-700"
                    : "border-transparent text-neutral-500 hover:text-neutral-800"
                }`}
              >
                <BarChart3 className="w-3.5 h-3.5" />
                <span>{"Pixel Product Performance Chart"}</span>
              </button>
            </div>
            <div className="flex items-center gap-2 pb-2 shrink-0">
              <button
                type="button"
                onClick={async () => {
                  try {
                    const bundle = await apiClient.getMarketingEventsBundle();
                    if (Array.isArray(bundle?.events)) setRecentEvents(bundle.events);
                    if (Array.isArray(bundle?.productAnalytics)) {
                      setServerProductStats(bundle.productAnalytics);
                    }
                  } catch {}
                }}
                className="p-1.5 rounded-lg hover:bg-neutral-100 text-neutral-500 transition-colors cursor-pointer"
                title={"Refresh event logs & charts"}
              >
                <RefreshCw className="w-3.5 h-3.5" />
              </button>
              <button
                type="button"
                onClick={async () => {
                  const res = await apiClient.clearMarketingEvents();
                  if (res?.success) {
                    setRecentEvents([]);
                    setServerProductStats([]);
                  }
                }}
                className="p-1.5 rounded-lg hover:bg-rose-50 text-neutral-400 hover:text-rose-600 transition-colors cursor-pointer"
                title={"Reset / Clear Pixel Event History"}
              >
                <Trash2 className="w-3.5 h-3.5" />
              </button>
              <span className="flex items-center gap-1 text-[11px] text-emerald-600 font-bold bg-emerald-50 px-2 py-0.5 rounded-full">
                <span className="w-2 h-2 rounded-full bg-emerald-500 animate-ping" />
                <span>{"Real-time"}</span>
              </span>
            </div>
          </div>

          {/* Panel 1: Live Event Stream */}
          {rightPanelTab === "stream" && (
            <div className="space-y-2.5 max-h-[520px] overflow-y-auto pr-1">
              {!isActive ? (
                <div className="p-6 rounded-2xl bg-amber-50/70 border border-dashed border-amber-300 text-center space-y-1.5">
                  <p className="text-xs font-bold text-amber-900">
                    {"Meta Pixel & CAPI Tracking is Deactivated (Paused)"}
                  </p>
                  <p className="text-[11px] text-amber-800/80">
                    {"Check the Active box on the left panel to resume tracking and view live browser & server events."}
                  </p>
                </div>
              ) : !activePixelValue ? (
                <div className="p-6 rounded-2xl bg-neutral-50 border border-dashed border-neutral-300 text-center space-y-1.5">
                  <p className="text-xs font-bold text-neutral-700">
                    {"Meta Pixel ID is not configured yet"}
                  </p>
                  <p className="text-[11px] text-neutral-500">
                    {"Enter and save your Meta Pixel ID on the left panel to stream live browser & server events dynamically."}
                  </p>
                </div>
              ) : filteredRecentEvents.length === 0 ? (
                <div className="text-center py-12 text-neutral-400 text-xs">
                  {targetScope === "PRODUCT"
                    ? "No events recorded yet for this selected product."
                    : "No event logs yet. Fire a test event or browse/place an order to see live tracking."}
                </div>
              ) : (
                filteredRecentEvents.map((ev, i) => {
                  const { exactTimeStr, relativeStr } = formatEventTimes(
                    ev.timestamp,
                    isEnglish,
                    nowTime
                  );

                  return (
                    <div
                      key={ev.id || ev.eventId || i}
                      className="p-2.5 bg-neutral-50 rounded-2xl border border-neutral-200 text-xs space-y-1.5 hover:border-neutral-300 transition-colors shadow-2xs"
                    >
                      <div className="flex justify-between items-center">
                        <span className={`font-bold px-2 py-0.5 rounded-md border text-[10px] ${
                          ev.eventName === 'Purchase' ? 'bg-emerald-50 text-emerald-700 border-emerald-200' :
                          ev.eventName === 'AddToCart' ? 'bg-blue-50 text-blue-700 border-blue-200' :
                          ev.eventName === 'ProductClick' ? 'bg-cyan-50 text-cyan-700 border-cyan-200' :
                          ev.eventName === 'ViewContent' ? 'bg-purple-50 text-purple-700 border-purple-200' :
                          ev.eventName === 'InitiateCheckout' ? 'bg-amber-50 text-amber-700 border-amber-200' :
                          'bg-white text-neutral-800 border-neutral-200'
                        }`}>
                          {ev.eventName}
                        </span>
                        <div className="flex items-center gap-1.5">
                          <span className="text-[10px] font-bold text-neutral-800 font-mono">
                            {exactTimeStr}
                          </span>
                          <span className="text-[10px] font-semibold text-emerald-700 bg-emerald-100/80 px-1.5 py-0.5 rounded-md font-mono">
                            {relativeStr}
                          </span>
                        </div>
                      </div>

                      {/* Product Name Display */}
                      <div className="flex items-center gap-2 py-1 px-2 bg-white rounded-xl border border-neutral-200/90 shadow-2xs">
                        <Package className="w-3.5 h-3.5 text-emerald-600 flex-shrink-0" />
                        <div className="min-w-0 flex-1 flex items-center justify-between gap-1.5">
                          <span
                            className="font-bold text-[11px] text-neutral-900 truncate"
                            title={ev.productName || ev.name || ev.content_name || ""}
                          >
                            {ev.productName ||
                              ev.name ||
                              ev.content_name ||
                              (ev.eventName === "PageView"
                                ? "Storefront Navigation (All Pages)"
                                : ev.orderId
                                ? `${"Order"} #${ev.orderId}`
                                : "General Store Catalog")}
                          </span>
                          {ev.productId && (
                            <span className="text-[10px] font-mono text-neutral-500 bg-neutral-100 px-1.5 py-0.5 rounded flex-shrink-0">
                              #{ev.productId}
                            </span>
                          )}
                        </div>
                      </div>

                      <div className="flex flex-wrap items-center justify-between text-[10px] text-neutral-600 gap-1">
                        <span className="font-mono text-neutral-500 truncate max-w-[200px]" title={ev.eventId}>
                          ID: {ev.eventId}
                        </span>
                        <div className="flex items-center gap-1">
                          <span className="bg-emerald-100 text-emerald-800 font-bold px-1.5 py-0.5 rounded">
                            Browser [OK]
                          </span>
                          <span className="bg-blue-100 text-blue-800 font-bold px-1.5 py-0.5 rounded">
                            CAPI [OK]
                          </span>
                          {ev.value ? (
                            <span className="font-bold text-neutral-800 ml-1">৳{Number(ev.value).toLocaleString()}</span>
                          ) : null}
                        </div>
                      </div>
                    </div>
                  );
                })
              )}
            </div>
          )}

          {/* Panel 2: Pixel Product Performance Chart */}
          {rightPanelTab === "chart" && (
            <div className="space-y-3.5">
              <div className="flex flex-wrap items-center justify-between gap-2">
                <span className="text-[11px] font-bold text-neutral-600">
                  {targetScope === "PRODUCT" && selectedScopeProduct
                    ? `Filtered Scope: ${getProductName(selectedScopeProduct)}`
                    : "Scope: Entire Store (All Products)"}
                </span>
                <span
                  className={`text-[10px] font-mono font-bold px-2 py-0.5 rounded-full border ${
                    activePixelValue
                      ? "bg-emerald-50 text-emerald-700 border-emerald-200"
                      : "bg-amber-50 text-amber-700 border-amber-200"
                  }`}
                >
                  {activePixelValue ? `Pixel: ${activePixelValue}` : "Pixel ID Not Set"}
                </span>
              </div>

              {!isActive ? (
                <div className="p-6 rounded-2xl bg-amber-50/70 border border-dashed border-amber-300 text-center space-y-1.5">
                  <p className="text-xs font-bold text-amber-900">
                    {"Meta Pixel & CAPI Tracking is Deactivated (Paused)"}
                  </p>
                  <p className="text-[11px] text-amber-800/80">
                    {"Check the Active box on the left panel to display product view, click & purchase charts."}
                  </p>
                </div>
              ) : !activePixelValue ? (
                <div className="p-6 rounded-2xl bg-neutral-50 border border-dashed border-neutral-300 text-center space-y-1.5">
                  <p className="text-xs font-bold text-neutral-700">
                    {"Enter & Save your Meta Pixel ID on the left panel"}
                  </p>
                  <p className="text-[11px] text-neutral-500">
                    {"Once your Pixel ID is connected, Most Viewed, Most Clicked & Most Purchased product charts will populate dynamically from live store interactions."}
                  </p>
                </div>
              ) : (
                <>
                  {/* 3 Highlight Cards: Most Viewed / Most Clicked / Most Purchased */}
                  <div className="grid grid-cols-3 gap-2">
                    <div className="p-2.5 rounded-2xl bg-purple-50/80 border border-purple-200 space-y-0.5">
                      <span className="text-[10px] font-bold uppercase text-purple-700 block">
                        {"Most Viewed"}
                      </span>
                      <div className="text-xs font-black text-neutral-900 truncate" title={pixelProductInsights.topViewed?.productName || "—"}>
                        {pixelProductInsights.topViewed?.productName || "No views yet"}
                      </div>
                      <span className="text-[11px] font-extrabold text-purple-700">
                        {`${pixelProductInsights.topViewed?.views || 0} views`}
                      </span>
                    </div>

                    <div className="p-2.5 rounded-2xl bg-blue-50/80 border border-blue-200 space-y-0.5">
                      <span className="text-[10px] font-bold uppercase text-blue-700 block">
                        {"Most Clicked"}
                      </span>
                      <div className="text-xs font-black text-neutral-900 truncate" title={pixelProductInsights.topClicked?.productName || "—"}>
                        {pixelProductInsights.topClicked?.productName || "No clicks yet"}
                      </div>
                      <span className="text-[11px] font-extrabold text-blue-700">
                        {`${pixelProductInsights.topClicked?.clicks || 0} clicks`}
                      </span>
                    </div>

                    <div className="p-2.5 rounded-2xl bg-emerald-50/80 border border-emerald-200 space-y-0.5">
                      <span className="text-[10px] font-bold uppercase text-emerald-700 block">
                        {"Most Purchased"}
                      </span>
                      <div className="text-xs font-black text-neutral-900 truncate" title={pixelProductInsights.topPurchased?.productName || "—"}>
                        {pixelProductInsights.topPurchased?.productName || "No orders yet"}
                      </div>
                      <span className="text-[11px] font-extrabold text-emerald-700">
                        {`${pixelProductInsights.topPurchased?.purchases || 0} sold`}
                      </span>
                    </div>
                  </div>

                  {/* Metric Filter Tabs + Legend */}
                  <div className="flex flex-wrap items-center justify-between gap-2">
                    <div className="flex items-center gap-1 text-[10px]">
                      {[
                        { id: "ALL", label: "All" },
                        { id: "VIEWS", label: `Views (${pixelProductInsights.totals.views})` },
                        { id: "CLICKS", label: `Clicks (${pixelProductInsights.totals.clicks})` },
                        { id: "PURCHASES", label: `Purchased (${pixelProductInsights.totals.purchases})` },
                      ].map((tab) => (
                        <button
                          key={tab.id}
                          type="button"
                          onClick={() => setChartMetricTab(tab.id)}
                          className={`px-2.5 py-1 rounded-lg font-bold transition-colors cursor-pointer ${
                            chartMetricTab === tab.id
                              ? "bg-neutral-900 text-white"
                              : "bg-neutral-100 text-neutral-600 hover:bg-neutral-200"
                          }`}
                        >
                          {tab.label}
                        </button>
                      ))}
                    </div>
                    <div className="flex items-center gap-2.5 text-[10px] font-semibold text-neutral-600">
                      <span className="flex items-center gap-1">
                        <span className="w-2 h-2 rounded-xs bg-purple-500 inline-block" />
                        {"Views"}
                      </span>
                      <span className="flex items-center gap-1">
                        <span className="w-2 h-2 rounded-xs bg-blue-500 inline-block" />
                        {"Clicks"}
                      </span>
                      <span className="flex items-center gap-1">
                        <span className="w-2 h-2 rounded-xs bg-emerald-500 inline-block" />
                        {"Purchased"}
                      </span>
                    </div>
                  </div>

                  {/* Grouped Horizontal Bar Chart */}
                  <div className="space-y-2.5 bg-neutral-50/70 rounded-2xl p-3.5 border border-neutral-200/80 max-h-[360px] overflow-y-auto">
                    {pixelProductInsights.rows.length === 0 ? (
                      <div className="py-8 text-center text-xs text-neutral-400">
                        {targetScope === "PRODUCT"
                          ? "No interactions recorded yet for this selected product."
                          : "No product interactions recorded yet. Browse products, click Add to Cart, or place an order to see live charts."}
                      </div>
                    ) : (
                      (() => {
                        const maxMetricVal = Math.max(
                          ...pixelProductInsights.rows.flatMap((r) =>
                            chartMetricTab === "VIEWS"
                              ? [r.views]
                              : chartMetricTab === "CLICKS"
                              ? [r.clicks]
                              : chartMetricTab === "PURCHASES"
                              ? [r.purchases]
                              : [r.views, r.clicks, r.purchases]
                          ),
                          1
                        );

                        return pixelProductInsights.rows.map((row) => {
                          const viewsPct = Math.round((row.views / maxMetricVal) * 100);
                          const clicksPct = Math.round((row.clicks / maxMetricVal) * 100);
                          const purchasesPct = Math.round((row.purchases / maxMetricVal) * 100);
                          const showViews = chartMetricTab === "ALL" || chartMetricTab === "VIEWS";
                          const showClicks = chartMetricTab === "ALL" || chartMetricTab === "CLICKS";
                          const showPurchases = chartMetricTab === "ALL" || chartMetricTab === "PURCHASES";

                          return (
                            <div key={row.key} className="space-y-1">
                              <div className="flex items-center justify-between text-[11px] gap-2">
                                <span className="font-bold text-neutral-900 truncate" title={row.productName}>
                                  {row.productName}
                                </span>
                                <span className="text-[10px] font-mono text-neutral-500 shrink-0">
                                  {`${row.views}v • ${row.clicks}c • ${row.purchases}p${
                                    row.revenue > 0 ? ` (${formatBDT(row.revenue)})` : ""
                                  }`}
                                </span>
                              </div>
                              <div className="space-y-1">
                                {showViews && (
                                  <div className="h-1.5 w-full bg-white rounded-full overflow-hidden border border-neutral-200/60">
                                    <div
                                      className="h-full bg-purple-500 rounded-full transition-all duration-300"
                                      style={{ width: `${row.views > 0 ? Math.max(4, viewsPct) : 0}%` }}
                                      title={`Views: ${row.views}`}
                                    />
                                  </div>
                                )}
                                {showClicks && (
                                  <div className="h-1.5 w-full bg-white rounded-full overflow-hidden border border-neutral-200/60">
                                    <div
                                      className="h-full bg-blue-500 rounded-full transition-all duration-300"
                                      style={{ width: `${row.clicks > 0 ? Math.max(4, clicksPct) : 0}%` }}
                                      title={`Clicks: ${row.clicks}`}
                                    />
                                  </div>
                                )}
                                {showPurchases && (
                                  <div className="h-1.5 w-full bg-white rounded-full overflow-hidden border border-neutral-200/60">
                                    <div
                                      className="h-full bg-emerald-500 rounded-full transition-all duration-300"
                                      style={{ width: `${row.purchases > 0 ? Math.max(4, purchasesPct) : 0}%` }}
                                      title={`Purchased: ${row.purchases}`}
                                    />
                                  </div>
                                )}
                              </div>
                            </div>
                          );
                        });
                      })()
                    )}
                  </div>
                </>
              )}
            </div>
          )}
        </div>
      </div>
      )}
    </div>
  );
};

export { AdminMarketing };
export default AdminMarketing;
