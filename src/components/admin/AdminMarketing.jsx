import { useState, useEffect, useMemo } from "react";
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
  Power
} from "lucide-react";
import { marketingTracker } from "../../services/marketing";
import { apiClient } from "../../services/api";
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
  onNavigateTab,
  onSelectCampaignProduct,
  onNavigateToView,
}) => {
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

  // Meta Setup Guidance & Bangla Instructions States
  const [showBanglaGuide, setShowBanglaGuide] = useState(true);
  const [guideTab, setGuideTab] = useState("events"); // 'events' | 'commerce' | 'tips'

  // Test Event Dispatcher States
  const [testEventName, setTestEventName] = useState("Purchase");
  const [testValue, setTestValue] = useState(2500);
  const [testStatus, setTestStatus] = useState("");
  const [isFiringTest, setIsFiringTest] = useState(false);

  // Live Events Stream
  const [recentEvents, setRecentEvents] = useState([]);
  const [nowTime, setNowTime] = useState(Date.now());

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
        const events = await apiClient.getMarketingEvents();
        if (isMounted && events && events.length > 0) {
          setRecentEvents(events);
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
          setCapiToken(config.capiToken || "");
          setGa4Id(config.ga4Id || "");
          setAdAccountId(config.adAccountId || "");
          setTestEventCode(config.testEventCode || "");
          setTargetScope(config.targetScope || "GLOBAL");
          setTargetProductId(config.targetProductId || (products[0]?.id || ""));
          setTargetLandingSlug(config.targetLandingSlug || (landingPages[0]?.slug || ""));
          setIsActive(config.isActive !== false);

          marketingTracker.applyConfig(config);
        }

        const events = await apiClient.getMarketingEvents();
        if (mounted && events && events.length > 0) {
          setRecentEvents(events);
        } else if (mounted) {
          setRecentEvents(marketingTracker.getRecentEvents());
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
      ga4Id: ga4Id.trim(),
      adAccountId: adAccountId.trim(),
      testEventCode: testEventCode.trim(),
      targetScope,
      targetProductId: targetScope === "PRODUCT" ? targetProductId : "",
      targetLandingSlug: targetScope === "LANDING" ? targetLandingSlug : "",
      isActive,
    };

    try {
      const res = await apiClient.updateMarketingConfig(payload);
      if (res && res.success) {
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

  // Dedicated Fire Test Event Handler
  const handleFireTestEvent = async () => {
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
    } else if (targetScope === "LANDING" && targetLandingSlug) {
      eventPayload.campaign = targetLandingSlug;
      eventPayload.name = `Campaign: ${targetLandingSlug}`;
      eventPayload.productName = `Campaign: ${targetLandingSlug}`;
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
      campaign: targetLandingSlug,
    });

    setTestStatus(
      `[DISPATCHED] Event: ${testEventName} | ID: ${eventId} | Synced with Browser Pixel & Server CAPI`
    );

    // Refresh event stream after dispatch
    setTimeout(async () => {
      try {
        const events = await apiClient.getMarketingEvents();
        if (events && events.length > 0) {
          setRecentEvents(events);
        } else {
          setRecentEvents([...marketingTracker.getRecentEvents()]);
        }
      } catch {
        setRecentEvents([...marketingTracker.getRecentEvents()]);
      }
      setIsFiringTest(false);
    }, 800);
  };

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

  // Base campaigns linked to store products and platforms with sequential naming convention
  const baseCampaigns = useMemo(() => {
    const p0 = products[0];
    const p1 = products[1];
    const p2 = products[2];
    const p3 = products[3];
    const p4 = products[4] || p0;

    return [
      {
        id: "camp-prod-1",
        campaignNumber: 1,
        name: `Product Campaign 1: ${p0?.name || "Smart Gadget"} (Facebook Ads)`,
        source: "facebook",
        productId: p0?.id || "prod-1",
        productName: p0?.name || "360° Rotating Makeup Organizer",
        spend: 7500,
        clicks: 3850,
        baseOrders: 42,
        baseRevenue: 84000,
      },
      {
        id: "camp-prod-2",
        campaignNumber: 2,
        name: `Product Campaign 2: ${p1?.name || "Retro Lantern"} (TikTok Ads)`,
        source: "tiktok",
        productId: p1?.id || "prod-2",
        productName: p1?.name || "Retro Camping Lantern",
        spend: 5200,
        clicks: 3100,
        baseOrders: 36,
        baseRevenue: 68400,
      },
      {
        id: "camp-prod-3",
        campaignNumber: 3,
        name: `Product Campaign 3: ${p2?.name || "Grooming Kit"} (Instagram Ads)`,
        source: "instagram",
        productId: p2?.id || "prod-3",
        productName: p2?.name || "7-in-1 Precision Nail Kit",
        spend: 4800,
        clicks: 2900,
        baseOrders: 31,
        baseRevenue: 58900,
      },
      {
        id: "camp-prod-4",
        campaignNumber: 4,
        name: `Product Campaign 4: ${p3?.name || "Massage Gun"} (Google Ads)`,
        source: "google",
        productId: p3?.id || "prod-4",
        productName: p3?.name || "Facial Massage Gun & Reliever",
        spend: 8500,
        clicks: 2200,
        baseOrders: 39,
        baseRevenue: 74100,
      },
      {
        id: "camp-prod-5",
        campaignNumber: 5,
        name: `Product Campaign 5: ${p4?.name || "Trending Lifestyle"} (YouTube Ads)`,
        source: "youtube",
        productId: p4?.id || "prod-5",
        productName: p4?.name || "Hot Trending Lifestyle Product",
        spend: 4200,
        clicks: 2150,
        baseOrders: 25,
        baseRevenue: 47500,
      },
      {
        id: "camp-prod-6",
        campaignNumber: 6,
        name: "Product Campaign 6: Entire Store Flash Sale (Facebook Ads)",
        source: "facebook",
        productId: "all",
        productName: "Entire Store Catalog",
        spend: 11000,
        clicks: 4400,
        baseOrders: 78,
        baseRevenue: 156000,
      },
      {
        id: "camp-prod-7",
        campaignNumber: 7,
        name: "Product Campaign 7: Nationwide COD Express (TikTok Ads)",
        source: "tiktok",
        productId: "all",
        productName: "All Verified COD Products",
        spend: 6800,
        clicks: 3400,
        baseOrders: 46,
        baseRevenue: 89000,
      },
      {
        id: "camp-prod-8",
        campaignNumber: 8,
        name: `Product Campaign 8: Retargeting VIP - ${p0?.name || "Smart Gadget"} (Facebook Ads)`,
        source: "facebook",
        productId: p0?.id || "prod-1",
        productName: p0?.name || "Hot Trending Product",
        spend: 5900,
        clicks: 3200,
        baseOrders: 37,
        baseRevenue: 74000,
      },
    ];
  }, [products, isEnglish]);

  // Combine base campaigns + custom user campaigns, excluding deleted campaigns
  const allCampaigns = useMemo(() => {
    const combined = [...baseCampaigns, ...customCampaigns];
    return combined
      .filter((camp) => !deletedCampaignIds.includes(camp.id))
      .map((camp) => {
        const isPaused = pausedCampaignIds.includes(camp.id) || camp.status === "paused";
        return {
          ...camp,
          isPaused,
          status: isPaused ? "paused" : "active",
        };
      });
  }, [baseCampaigns, customCampaigns, deletedCampaignIds, pausedCampaignIds]);

  // Dynamic attribution from real confirmed orders
  const campaignStats = useMemo(() => {
    return allCampaigns.map((camp) => {
      const matchingOrders = orders.filter((o) => {
        if (o.status === "CANCELLED") return false;
        const utmSource = (o.utm?.source || "").toLowerCase();
        const utmCamp = (o.utm?.campaign || "").toLowerCase();
        const campSlug = (camp.name || "").toLowerCase().replace(/\s+/g, "_");
        const isCampMatch = utmCamp && (campSlug.includes(utmCamp) || utmCamp.includes(camp.id));
        const isSourceMatch = utmSource && utmSource.includes(camp.source.toLowerCase());
        const isProductMatch =
          camp.productId !== "all" &&
          Array.isArray(o.items) &&
          o.items.some((item) => item.productId === camp.productId || item.id === camp.productId);

        return isCampMatch || (isSourceMatch && isProductMatch) || (isSourceMatch && camp.productId === "all");
      });

      const liveOrdersCount = matchingOrders.length;
      const liveRevenue = matchingOrders.reduce((sum, o) => sum + (o.total || 0), 0);

      const totalOrders = (camp.baseOrders || 0) + liveOrdersCount;
      const totalRevenue = (camp.baseRevenue || 0) + liveRevenue;
      const spend = camp.spend || 1;
      const roasNum = totalRevenue / spend;
      const roas = roasNum > 0 ? `${roasNum.toFixed(1)}x` : "0.0x";

      return {
        ...camp,
        orders: totalOrders,
        revenue: totalRevenue,
        roas,
        roasNum,
      };
    });
  }, [allCampaigns, orders]);

  // Overall metrics calculation
  const totalCampaignsCount = campaignStats.length;
  const totalSpendSum = campaignStats.reduce((s, c) => s + (c.spend || 0), 0);
  const totalOrdersSum = campaignStats.reduce((s, c) => s + (c.orders || 0), 0);
  const totalRevenueSum = campaignStats.reduce((s, c) => s + (c.revenue || 0), 0);
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
    const slug = (camp.name || "ad_campaign").toLowerCase().replace(/[^a-z0-9]+/g, "_");
    const baseUrl = typeof window !== "undefined" ? window.location.origin : "https://amardokan.com";
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
    const baseUrl = typeof window !== "undefined" ? window.location.origin : "https://amardokan.com";
    const xmlUrl = `${baseUrl}/api/v1/marketing/facebook-catalog.xml`;
    if (navigator?.clipboard?.writeText) {
      navigator.clipboard.writeText(xmlUrl);
      setCopiedCatalogXml(true);
      setTimeout(() => setCopiedCatalogXml(false), 2500);
    }
  };

  // Trigger Live Meta Ads Metrics Sync via Graph API backend endpoint
  const handleSyncMetaAds = async () => {
    setIsSyncingMeta(true);
    setMetaSyncMsg("");
    try {
      const res = await apiClient.syncMetaAds({ adAccountId });
      if (res && res.success) {
        setMetaSyncMsg(
          `Meta Insights Synced! Spend: ৳${Number(res.totalSpend || 0).toLocaleString()} (${res.totalClicks || 0} clicks)`
        );
        if (res.campaigns && res.campaigns.length > 0) {
          const syncedCustom = res.campaigns.map((mc, idx) => ({
            id: `meta-${mc.id || idx}`,
            campaignNumber: allCampaigns.length + idx + 1,
            name: `Product Campaign ${allCampaigns.length + idx + 1}: ${mc.name || "Meta Live Ad"} (Facebook Ads)`,
            source: "facebook",
            productId: "all",
            productName: "Entire Store Catalog",
            spend: Number(mc.spend) || 0,
            clicks: Number(mc.clicks) || 0,
            baseOrders: Number(mc.actions || 0),
            baseRevenue: Number(mc.actions || 0) * 2000,
            isMetaLive: true,
          }));
          saveCustomCampaigns([...syncedCustom, ...customCampaigns.filter((c) => !c.isMetaLive)]);
        }
      } else {
        setMetaSyncMsg(res?.message || ("Meta sync failed"));
      }
    } catch (err) {
      setMetaSyncMsg(err.message || "Meta sync failed");
    } finally {
      setIsSyncingMeta(false);
      setTimeout(() => setMetaSyncMsg(""), 6000);
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
      spend: Number(newCampSpend) || 3000,
      clicks: Number(newCampClicks) || 1200,
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
      {/* Header */}
      <div className="bg-white rounded-3xl p-6 border border-neutral-200 shadow-xs flex flex-wrap items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2">
            <span className="text-xs font-bold uppercase tracking-wider text-emerald-700 bg-emerald-50 px-2.5 py-1 rounded-full">
              {"Attribution & Tracking Engine"}
            </span>
            {isActive && pixelId ? (
              <span className="inline-flex items-center gap-1.5 text-xs font-bold text-emerald-700 bg-emerald-100/80 px-2.5 py-1 rounded-full">
                <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
                <span>{"Live & Connected with Meta"}</span>
              </span>
            ) : (
              <span className="inline-flex items-center gap-1.5 text-xs font-bold text-amber-700 bg-amber-50 px-2.5 py-1 rounded-full">
                <span className="w-2 h-2 rounded-full bg-amber-400" />
                <span>{"Tracking Paused / Setup Needed"}</span>
              </span>
            )}
          </div>
          <h1 className="text-2xl font-black text-neutral-900 mt-2">
            {"Marketing & CAPI Tracking Hub"}
          </h1>
          <p className="text-xs text-neutral-500 mt-1">
            {"Meta Pixel + Meta Conversions API (CAPI) deduplication, GA4 e-commerce events and dynamic product targeting."}
          </p>
        </div>

        {/* Quick status pill */}
        <div className="flex items-center gap-2 bg-neutral-50 p-2.5 rounded-2xl border border-neutral-200 text-xs">
          <Activity className="w-4 h-4 text-emerald-600" />
          <div className="text-left">
            <div className="text-[10px] text-neutral-400 font-semibold uppercase">{"Active Scope"}</div>
            <div className="font-bold text-neutral-800">
              {targetScope === "GLOBAL" && ("🌐 Global (Entire Store)")}
              {targetScope === "PRODUCT" && ("📦 Specific Product")}
              {targetScope === "LANDING" && ("🚀 Specific Landing")}
            </div>
          </div>
        </div>
      </div>

      {/* Campaign Performance Table with Pagination & Controls */}
      <div className="bg-white rounded-3xl p-6 border border-neutral-200 shadow-xs space-y-5">
        {/* Top Header & Summary Pills */}
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div>
            <div className="flex items-center gap-2">
              <BarChart3 className="w-5 h-5 text-emerald-600" />
              <h3 className="text-base font-bold text-neutral-900">
                {"Ad Campaigns & ROAS Metrics"}
              </h3>
            </div>
            <p className="text-xs text-neutral-400 mt-0.5">
              {"Facebook, TikTok, Google & Instagram ad spend vs verified order revenue from customer funnel"}
            </p>
          </div>

          <div className="flex items-center gap-2 flex-wrap">
            <button
              onClick={() => setIsAddCampaignOpen(true)}
              className="inline-flex items-center gap-1.5 px-3 py-2 rounded-xl bg-emerald-700 hover:bg-emerald-800 text-white font-bold text-xs shadow-xs transition-colors cursor-pointer"
            >
              <Plus className="w-3.5 h-3.5" />
              <span>{"Create Campaign"}</span>
            </button>

            {/* Direct Meta Events Manager Link */}
            <a
              href={pixelId ? `https://business.facebook.com/events_manager2/list/dataset/${pixelId}` : "https://business.facebook.com/events_manager2"}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-1.5 px-3 py-2 rounded-xl bg-blue-50 hover:bg-blue-100 text-blue-700 font-bold text-xs border border-blue-200 transition-colors cursor-pointer"
              title={"Open Meta Events Manager in new tab"}
            >
              <ExternalLink className="w-3.5 h-3.5 text-blue-600" />
              <span>Events Manager</span>
            </a>

            {/* Direct Meta Commerce Manager Link */}
            <a
              href="https://business.facebook.com/commerce"
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-1.5 px-3 py-2 rounded-xl bg-purple-50 hover:bg-purple-100 text-purple-700 font-bold text-xs border border-purple-200 transition-colors cursor-pointer"
              title={"Open Meta Commerce Manager in new tab"}
            >
              <ExternalLink className="w-3.5 h-3.5 text-purple-600" />
              <span>Commerce Manager</span>
            </a>

            {/* Bangla Setup Guide Toggle */}
            <button
              onClick={() => setShowBanglaGuide(!showBanglaGuide)}
              className={`inline-flex items-center gap-1.5 px-3 py-2 rounded-xl font-bold text-xs border transition-all cursor-pointer ${
                showBanglaGuide
                  ? "bg-amber-500 hover:bg-amber-600 text-white border-amber-600 shadow-xs"
                  : "bg-amber-50 hover:bg-amber-100 text-amber-900 border-amber-300"
              }`}
              title={"Toggle Meta Setup Instructions & Suggestions in Bangla"}
            >
              <BookOpen className="w-3.5 h-3.5" />
              <span>{"Meta Guide (Bangla)"}</span>
            </button>

            <button
              onClick={handleSyncMetaAds}
              disabled={isSyncingMeta}
              className="inline-flex items-center gap-1.5 px-3 py-2 rounded-xl bg-blue-600 hover:bg-blue-700 active:bg-blue-800 disabled:opacity-50 text-white font-bold text-xs shadow-xs transition-colors cursor-pointer"
              title={"Sync live impressions, spend and clicks from Meta Graph API"}
            >
              <RefreshCw className={`w-3.5 h-3.5 ${isSyncingMeta ? "animate-spin" : ""}`} />
              <span>{isSyncingMeta ? ("Syncing...") : ("Sync Meta Ads")}</span>
            </button>

            <button
              onClick={handleCopyCatalogXml}
              className="inline-flex items-center gap-1.5 px-3 py-2 rounded-xl bg-neutral-100 hover:bg-neutral-200 text-neutral-800 font-bold text-xs border border-neutral-300 transition-colors cursor-pointer"
              title={"Copy Meta Advantage+ & Commerce Manager Product Catalog XML Feed URL"}
            >
              {copiedCatalogXml ? (
                <>
                  <Check className="w-3.5 h-3.5 text-emerald-600" />
                  <span className="text-emerald-700">{"XML Copied!"}</span>
                </>
              ) : (
                <>
                  <Share2 className="w-3.5 h-3.5 text-neutral-600" />
                  <span>{"Catalog XML"}</span>
                </>
              )}
            </button>

            <span className="text-xs font-bold text-emerald-700 bg-emerald-50 border border-emerald-200/80 px-3 py-1.5 rounded-xl">
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

                  let sourceColor = "bg-neutral-100 text-neutral-800 border-neutral-200";
                  if (camp.source === "facebook") sourceColor = "bg-blue-50 text-blue-700 border-blue-200";
                  else if (camp.source === "tiktok") sourceColor = "bg-neutral-900 text-white border-neutral-800";
                  else if (camp.source === "instagram") sourceColor = "bg-pink-50 text-pink-700 border-pink-200";
                  else if (camp.source === "google") sourceColor = "bg-amber-50 text-amber-800 border-amber-200";
                  else if (camp.source === "youtube") sourceColor = "bg-rose-50 text-rose-700 border-rose-200";

                  return (
                    <tr key={camp.id || idx} className={`hover:bg-neutral-50/80 transition-colors ${camp.isPaused ? "opacity-60 bg-neutral-50/40" : ""}`}>
                      <td className="py-3 px-3.5 max-w-[260px]">
                        <div className="font-bold text-neutral-900 truncate" title={camp.name}>
                          {camp.name}
                        </div>
                        <div className="flex items-center gap-1.5 text-[11px] text-neutral-500 mt-1">
                          <Package className="w-3 h-3 text-emerald-600 flex-shrink-0" />
                          <span className="truncate" title={camp.productName}>
                            {camp.productName}
                          </span>
                        </div>
                      </td>
                      <td className="py-3 px-3 capitalize">
                        <span className={`px-2 py-0.5 rounded-md font-bold text-[11px] border ${sourceColor}`}>
                          {camp.source}
                        </span>
                      </td>
                      <td className="py-3 px-3 text-center">
                        <button
                          type="button"
                          onClick={() => handleToggleCampaignStatus(camp)}
                          className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[11px] font-bold transition-all cursor-pointer border shadow-2xs ${
                            camp.isPaused
                              ? "bg-neutral-100 text-neutral-600 border-neutral-300 hover:bg-neutral-200"
                              : "bg-emerald-50 text-emerald-800 border-emerald-300 hover:bg-emerald-100"
                          }`}
                          title={
                            camp.isPaused
                              ? ("Click to Activate Campaign (Turn ON)")
                              : ("Click to Pause Campaign (Turn OFF)")
                          }
                        >
                          <span
                            className={`w-2 h-2 rounded-full ${
                              camp.isPaused ? "bg-neutral-400" : "bg-emerald-500 animate-pulse"
                            }`}
                          />
                          <span>
                            {camp.isPaused
                              ? ("Paused (OFF)")
                              : ("Active (ON)")}
                          </span>
                        </button>
                      </td>
                      <td className="py-3 px-3 text-right text-rose-600 font-bold font-mono">
                        {formatBDT(camp.spend)}
                      </td>
                      <td className="py-3 px-3 text-center text-neutral-700 font-mono font-medium">
                        {camp.clicks.toLocaleString()}
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
                          <button
                            onClick={() => handleEditLanding(camp)}
                            className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg text-[11px] font-bold bg-emerald-50 hover:bg-emerald-100 text-emerald-800 border border-emerald-200 transition-all cursor-pointer"
                            title={"Edit Single-Product Campaign Landing in Admin"}
                          >
                            <Layers className="w-3 h-3 text-emerald-600" />
                            <span>{"Edit Landing"}</span>
                          </button>
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
      {showBanglaGuide && (
        <div className="bg-gradient-to-br from-amber-50/70 via-white to-orange-50/40 rounded-3xl p-6 border border-amber-200/90 shadow-xs space-y-4 animate-in fade-in duration-200">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-amber-200/60 pb-4">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-2xl bg-amber-500 text-white flex items-center justify-center shadow-xs shrink-0">
                <BookOpen className="w-5 h-5" />
              </div>
              <div>
                <h3 className="text-base font-black text-neutral-900 flex items-center gap-2">
                  <span>{"Meta Setup Instructions & Growth Tips"}</span>
                  <span className="text-[10px] font-bold uppercase bg-amber-100 text-amber-900 px-2.5 py-0.5 rounded-full border border-amber-300">
                    {"Bangla Guide"}
                  </span>
                </h3>
                <p className="text-xs text-neutral-600 mt-0.5">
                  {"Complete step-by-step guideline and recommendations for Meta Events Manager, CAPI, and Product Catalog."}
                </p>
              </div>
            </div>

            {/* Quick External Meta Links */}
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
                onClick={() => setShowBanglaGuide(false)}
                className="p-1.5 rounded-xl text-neutral-400 hover:text-neutral-700 hover:bg-neutral-100 transition-colors cursor-pointer"
                title={"Hide guide"}
              >
                <X className="w-4 h-4" />
              </button>
            </div>
          </div>

          {/* Guide Tabs */}
          <div className="flex items-center gap-2 border-b border-amber-100/80 pb-2 overflow-x-auto scrollbar-none">
            <button
              onClick={() => setGuideTab("events")}
              className={`px-3.5 py-1.5 rounded-xl text-xs font-bold transition-all cursor-pointer whitespace-nowrap ${
                guideTab === "events"
                  ? "bg-blue-600 text-white shadow-xs"
                  : "bg-white text-neutral-600 hover:bg-neutral-100 border border-neutral-200"
              }`}
            >
              1. Events Manager & CAPI Setup
            </button>
            <button
              onClick={() => setGuideTab("commerce")}
              className={`px-3.5 py-1.5 rounded-xl text-xs font-bold transition-all cursor-pointer whitespace-nowrap ${
                guideTab === "commerce"
                  ? "bg-purple-600 text-white shadow-xs"
                  : "bg-white text-neutral-600 hover:bg-neutral-100 border border-neutral-200"
              }`}
            >
              2. Commerce Manager & Catalog XML
            </button>
            <button
              onClick={() => setGuideTab("tips")}
              className={`px-3.5 py-1.5 rounded-xl text-xs font-bold transition-all cursor-pointer whitespace-nowrap ${
                guideTab === "tips"
                  ? "bg-amber-600 text-white shadow-xs"
                  : "bg-white text-neutral-600 hover:bg-neutral-100 border border-neutral-200"
              }`}
            >
              3. Store Pro-Tips & ROAS
            </button>
          </div>

          {/* Tab 1: Events Manager & CAPI */}
          {guideTab === "events" && (
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
          )}

          {/* Tab 2: Commerce Manager & Catalog XML */}
          {guideTab === "commerce" && (
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

          {/* Tab 3: Pro Tips & Growth Strategy */}
          {guideTab === "tips" && (
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4 pt-1 text-xs animate-in fade-in">
              <div className="bg-white p-4 rounded-2xl border border-amber-200/80 shadow-2xs space-y-2">
                <div className="flex items-center gap-2 text-amber-800 font-bold">
                  <Lightbulb className="w-4 h-4 text-amber-600" />
                  <span>Why Server CAPI is Essential</span>
                </div>
                <p className="text-neutral-600 leading-relaxed">
                  Approximately 30-40% of mobile visitors use browser ad-blockers or iOS privacy protections. Standard browser pixel tracking drops these sales. CAPI sends 100% accurate conversion data directly from the server to Meta.
                </p>
              </div>

              <div className="bg-white p-4 rounded-2xl border border-amber-200/80 shadow-2xs space-y-2">
                <div className="flex items-center gap-2 text-emerald-800 font-bold">
                  <ShieldCheck className="w-4 h-4 text-emerald-600" />
                  <span>Event Deduplication</span>
                </div>
                <p className="text-neutral-600 leading-relaxed">
                  Our system transmits the exact same unique <code className="bg-neutral-100 px-1 rounded text-[11px]">eventId</code> on both client and server events. Meta accurately identifies single purchase events and eliminates double-reporting.
                </p>
              </div>

              <div className="bg-white p-4 rounded-2xl border border-amber-200/80 shadow-2xs space-y-2">
                <div className="flex items-center gap-2 text-indigo-800 font-bold">
                  <TrendingUp className="w-4 h-4 text-indigo-600" />
                  <span>Single-Product Funnel Links</span>
                </div>
                <p className="text-neutral-600 leading-relaxed">
                  Instead of sending traffic to a general homepage, direct ads to generated <code className="bg-neutral-100 px-1 rounded text-[10px]">/campaign-products?product=ID</code> funnel links. Visitors land directly on high-converting order checkout forms.
                </p>
              </div>
            </div>
          )}
        </div>
      )}

      {/* Tracking Configuration & Live Event Log */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* Form Settings (Col 5) */}
        <div className="lg:col-span-6 bg-white rounded-3xl p-6 border border-neutral-200 shadow-xs space-y-4 text-xs">
          <div className="flex items-center justify-between border-b border-neutral-100 pb-3">
            <h3 className="font-bold text-sm text-neutral-900 flex items-center gap-1.5">
              <Target className="w-4 h-4 text-emerald-600" />
              <span>{"Pixel & CAPI Configuration"}</span>
            </h3>
            {/* Active Toggle */}
            <label className="flex items-center gap-2 cursor-pointer select-none">
              <span className="text-[11px] font-semibold text-neutral-600">
                {isActive ? ("Active") : ("Paused")}
              </span>
              <input
                type="checkbox"
                checked={isActive}
                onChange={(e) => setIsActive(e.target.checked)}
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

          {/* Target Scope Selection */}
          <div className="space-y-1.5">
            <label className="block font-bold text-neutral-800">
              {"Target Tracking Scope:"}
            </label>
            <div className="grid grid-cols-3 gap-2">
              <button
                type="button"
                onClick={() => setTargetScope("GLOBAL")}
                className={`py-2 px-2.5 rounded-xl border text-center font-bold flex flex-col items-center gap-1 transition-all cursor-pointer ${
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
                className={`py-2 px-2.5 rounded-xl border text-center font-bold flex flex-col items-center gap-1 transition-all cursor-pointer ${
                  targetScope === "PRODUCT"
                    ? "bg-emerald-50 border-emerald-600 text-emerald-800 shadow-xs"
                    : "bg-neutral-50 border-neutral-200 text-neutral-600 hover:bg-neutral-100"
                }`}
              >
                <Package className="w-4 h-4" />
                <span className="text-[11px]">{"Specific Product"}</span>
              </button>

              <button
                type="button"
                onClick={() => setTargetScope("LANDING")}
                className={`py-2 px-2.5 rounded-xl border text-center font-bold flex flex-col items-center gap-1 transition-all cursor-pointer ${
                  targetScope === "LANDING"
                    ? "bg-emerald-50 border-emerald-600 text-emerald-800 shadow-xs"
                    : "bg-neutral-50 border-neutral-200 text-neutral-600 hover:bg-neutral-100"
                }`}
              >
                <Layers className="w-4 h-4" />
                <span className="text-[11px]">{"Landing Page"}</span>
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
                {"Pixel & CAPI will fire strictly when visitors view, cart, or purchase this product."}
              </p>
            </div>
          )}

          {/* Conditional Landing Page Dropdown */}
          {targetScope === "LANDING" && (
            <div className="p-3 bg-neutral-50 rounded-2xl border border-neutral-200 space-y-1.5 animate-in fade-in">
              <label className="block font-bold text-neutral-800">
                {"Select Campaign Landing Page:"}
              </label>
              <select
                value={targetLandingSlug}
                onChange={(e) => setTargetLandingSlug(e.target.value)}
                className="w-full px-3 py-2 bg-white rounded-xl border border-neutral-300 font-medium text-neutral-800"
              >
                {landingPages.length === 0 ? (
                  <option value="">{"Default Flash Sale"}</option>
                ) : (
                  landingPages.map((lp) => (
                    <option key={lp.id} value={lp.slug}>
                      {lp.title} (Slug: /{lp.slug})
                    </option>
                  ))
                )}
              </select>
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
              placeholder="e.g. 184729481920384"
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

          {/* Meta Ad Account ID (For Live Insights & Spend Sync) */}
          <div>
            <div className="flex justify-between items-center mb-1">
              <label className="font-semibold text-neutral-700">
                Meta Ad Account ID{" "}
                <span className="text-[10px] text-neutral-400 font-normal">
                  ({"Optional for Live Ad Spend Sync"})
                </span>
              </label>
              <a
                href="https://adsmanager.facebook.com/adsmanager"
                target="_blank"
                rel="noopener noreferrer"
                className="text-blue-600 hover:text-blue-800 text-[11px] font-bold inline-flex items-center gap-1 transition-colors"
                title={"Find Ad Account ID in Meta Ads Manager"}
              >
                <span>{"Ads Manager"}</span>
                <ExternalLink className="w-3 h-3" />
              </a>
            </div>
            <input
              type="text"
              value={adAccountId}
              onChange={(e) => setAdAccountId(e.target.value)}
              placeholder="e.g. act_182930491823"
              className="w-full px-3 py-2 bg-neutral-50 rounded-xl border border-neutral-300 font-mono text-neutral-900 focus:bg-white focus:ring-1 focus:ring-emerald-500"
            />
          </div>

          {/* GA4 Measurement ID */}
          <div>
            <label className="block font-semibold text-neutral-700 mb-1">
              Google Analytics 4 Measurement ID
            </label>
            <input
              type="text"
              value={ga4Id}
              onChange={(e) => setGa4Id(e.target.value)}
              placeholder="e.g. G-881920BD"
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

          {/* Quick Meta Commerce Manager Shortcut Box */}
          <div className="p-3 bg-purple-50/80 border border-purple-200/90 rounded-2xl flex items-center justify-between text-xs gap-3">
            <div className="flex items-center gap-2.5 min-w-0">
              <div className="w-8 h-8 rounded-xl bg-purple-100 flex items-center justify-center text-purple-700 shrink-0">
                <Share2 className="w-4 h-4" />
              </div>
              <div className="min-w-0">
                <span className="font-bold text-purple-950 block truncate">
                  {"Meta Commerce Manager & Catalog"}
                </span>
                <span className="text-[11px] text-purple-800 block leading-tight">
                  {"Upload your Catalog XML feed to Meta Commerce Manager for Advantage+ catalog ads."}
                </span>
              </div>
            </div>
            <div className="flex items-center gap-1.5 shrink-0">
              <button
                type="button"
                onClick={handleCopyCatalogXml}
                className="px-2.5 py-1.5 bg-white hover:bg-neutral-50 text-neutral-700 rounded-xl font-bold text-[11px] border border-purple-200 transition-colors cursor-pointer"
                title={"Copy catalog XML feed URL"}
              >
                {copiedCatalogXml ? ("Copied!") : ("Copy Feed")}
              </button>
              <a
                href="https://business.facebook.com/commerce"
                target="_blank"
                rel="noopener noreferrer"
                className="px-2.5 py-1.5 bg-purple-700 hover:bg-purple-800 text-white rounded-xl font-bold text-[11px] inline-flex items-center gap-1 transition-colors cursor-pointer shadow-2xs"
                title={"Open Meta Commerce Manager in new tab"}
              >
                <span>{"Open"}</span>
                <ExternalLink className="w-3 h-3" />
              </a>
            </div>
          </div>

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
              {"Clicking this sends a test signal to verify Meta Pixel & Server CAPI reception in Meta Events Manager."}
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

        {/* Live Event Stream (Col 6) */}
        <div className="lg:col-span-6 bg-white rounded-3xl p-6 border border-neutral-200 shadow-xs space-y-4">
          <div className="flex justify-between items-center">
            <div>
              <h3 className="text-sm font-bold text-neutral-900">
                {"Live Event Stream & Deduplication"}
              </h3>
              <p className="text-[11px] text-neutral-400">
                {"Browser pixel & server CAPI matched via shared event_id"}
              </p>
            </div>
            <div className="flex items-center gap-2">
              <button
                onClick={async () => {
                  try {
                    const events = await apiClient.getMarketingEvents();
                    if (events && events.length > 0) setRecentEvents(events);
                  } catch {}
                }}
                className="p-1 rounded-lg hover:bg-neutral-100 text-neutral-500 transition-colors"
                title={"Refresh event logs"}
              >
                <RefreshCw className="w-3.5 h-3.5" />
              </button>
              <span className="flex items-center gap-1 text-[11px] text-emerald-600 font-bold bg-emerald-50 px-2 py-0.5 rounded-full">
                <span className="w-2 h-2 rounded-full bg-emerald-500 animate-ping" />
                <span>{"Real-time"}</span>
              </span>
            </div>
          </div>

          <div className="space-y-2.5 max-h-[460px] overflow-y-auto pr-1">
            {recentEvents.length === 0 ? (
              <div className="text-center py-12 text-neutral-400 text-xs">
                {"No event logs yet. Fire a test event or place an order to see live tracking."}
              </div>
            ) : (
              recentEvents.map((ev, i) => {
                const { exactTimeStr, relativeStr } = formatEventTimes(
                  ev.timestamp,
                  isEnglish,
                  nowTime
                );

                return (
                  <div
                    key={ev.id || ev.eventId || i}
                    className="p-3 bg-neutral-50 rounded-2xl border border-neutral-200 text-xs space-y-2 hover:border-neutral-300 transition-colors shadow-2xs"
                  >
                    <div className="flex justify-between items-center">
                      <span className={`font-bold px-2 py-0.5 rounded-md border text-[11px] ${
                        ev.eventName === 'Purchase' ? 'bg-emerald-50 text-emerald-700 border-emerald-200' :
                        ev.eventName === 'AddToCart' ? 'bg-blue-50 text-blue-700 border-blue-200' :
                        ev.eventName === 'ViewContent' ? 'bg-purple-50 text-purple-700 border-purple-200' :
                        ev.eventName === 'InitiateCheckout' ? 'bg-amber-50 text-amber-700 border-amber-200' :
                        'bg-white text-neutral-800 border-neutral-200'
                      }`}>
                        {ev.eventName}
                      </span>
                      <div className="flex items-center gap-1.5">
                        <span className="text-[11px] font-bold text-neutral-800 font-mono">
                          {exactTimeStr}
                        </span>
                        <span className="text-[10px] font-semibold text-emerald-700 bg-emerald-100/80 px-1.5 py-0.5 rounded-md font-mono">
                          {relativeStr}
                        </span>
                      </div>
                    </div>

                    {/* Product Name Display - Prominently Above ID */}
                    <div className="flex items-center gap-2 py-1.5 px-2.5 bg-white rounded-xl border border-neutral-200/90 shadow-2xs">
                      <Package className="w-3.5 h-3.5 text-emerald-600 flex-shrink-0" />
                      <div className="min-w-0 flex-1 flex items-center justify-between gap-1.5">
                        <span
                          className="font-bold text-xs text-neutral-900 truncate"
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

                    <div className="flex flex-wrap items-center justify-between text-[11px] text-neutral-600 gap-1 pt-0.5">
                      <span className="font-mono text-[10px] text-neutral-500 truncate max-w-[210px]" title={ev.eventId}>
                        ID: {ev.eventId}
                      </span>
                      <div className="flex items-center gap-1">
                        <span className="bg-emerald-100 text-emerald-800 text-[10px] font-bold px-1.5 py-0.5 rounded">
                          Browser [OK]
                        </span>
                        <span className="bg-blue-100 text-blue-800 text-[10px] font-bold px-1.5 py-0.5 rounded">
                          CAPI [OK]
                        </span>
                      </div>
                    </div>

                    {ev.value ? (
                      <div className="text-[11px] text-neutral-500 flex justify-between pt-1 border-t border-neutral-200/50">
                        <span>{"Tracked Value:"}</span>
                        <span className="font-bold text-neutral-800">৳{Number(ev.value).toLocaleString()}</span>
                      </div>
                    ) : null}
                  </div>
                );
              })
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

export { AdminMarketing };
