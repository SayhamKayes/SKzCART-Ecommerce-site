import { useState, useEffect, useMemo } from "react";
import {
  X,
  Zap,
  Rocket,
  FileText,
  Target,
  MapPin,
  Search,
  Users,
  Sparkles,
  CheckCircle2,
  AlertCircle,
  Loader2,
  Package,
  Calendar,
  Facebook,
  ExternalLink,
} from "lucide-react";
import { apiClient } from "../../services/api";
import { formatBDT } from "../../utils/bangladesh";

const BD_LOCATION_PRESETS = [
  { key: "country:BD", name: "Bangladesh (All)", type: "country", countryCode: "BD" },
  { key: "city:148779", name: "Dhaka", type: "city", countryCode: "BD" },
  { key: "city:148758", name: "Chattogram", type: "city", countryCode: "BD" },
  { key: "city:148914", name: "Sylhet", type: "city", countryCode: "BD" },
  { key: "city:148889", name: "Rajshahi", type: "city", countryCode: "BD" },
  { key: "city:148832", name: "Khulna", type: "city", countryCode: "BD" },
];

const CTA_OPTIONS = [
  { value: "SHOP_NOW", label: "Shop Now" },
  { value: "ORDER_NOW", label: "Order Now" },
  { value: "SEND_MESSAGE", label: "Send Message" },
  { value: "LEARN_MORE", label: "Learn More" },
];

const MetaBoostWizardDrawer = ({
  isOpen,
  initialMode = "QUICK_BOOST_PRODUCT", // 'QUICK_BOOST_PRODUCT' | 'QUICK_BOOST_POST' | 'PRODUCT_SALES'
  products = [],
  connection,
  onClose,
  onLaunched,
}) => {
  const [mode, setMode] = useState(initialMode);
  const [campaignName, setCampaignName] = useState("");
  const [objective, setObjective] = useState("OUTCOME_SALES");
  const [optimizationGoal, setOptimizationGoal] = useState("OFFSITE_CONVERSIONS");
  const [initialStatus, setInitialStatus] = useState("PAUSED");

  // Budget & Schedule
  const [dailyBudget, setDailyBudget] = useState("500");
  const [durationDays, setDurationDays] = useState("5");

  // Product Boost / Sales Fields
  const [selectedProductId, setSelectedProductId] = useState(products[0]?.id || "");
  const [primaryText, setPrimaryText] = useState("");
  const [headline, setHeadline] = useState("");
  const [description, setDescription] = useState("");
  const [callToAction, setCallToAction] = useState("SHOP_NOW");
  const [customLandingUrl, setCustomLandingUrl] = useState("");

  // Facebook Page Post Boost Fields
  const [pagePosts, setPagePosts] = useState([]);
  const [isLoadingPosts, setIsLoadingPosts] = useState(false);
  const [postsError, setPostsError] = useState("");
  const [selectedPostId, setSelectedPostId] = useState("");

  // Dynamic Meta Target Picker
  const [selectedCountryCodes, setSelectedCountryCodes] = useState(["BD"]);
  const [selectedCities, setSelectedCities] = useState([]);
  const [ageMin, setAgeMin] = useState(18);
  const [ageMax, setAgeMax] = useState(45);
  const [genderFilter, setGenderFilter] = useState("ALL"); // ALL | MEN | WOMEN
  const [placementMode, setPlacementMode] = useState("ADVANTAGE_PLUS");

  // Interest & Geo Live Search
  const [geoQuery, setGeoQuery] = useState("");
  const [geoSuggestions, setGeoSuggestions] = useState([]);
  const [isSearchingGeo, setIsSearchingGeo] = useState(false);

  const [interestQuery, setInterestQuery] = useState("");
  const [interestSuggestions, setInterestSuggestions] = useState([]);
  const [selectedInterests, setSelectedInterests] = useState([]);
  const [isSearchingInterests, setIsSearchingInterests] = useState(false);

  // Reach Estimate
  const [reachEstimate, setReachEstimate] = useState(null);
  const [isEstimatingReach, setIsEstimatingReach] = useState(false);

  // Submit State
  const [isLaunching, setIsLaunching] = useState(false);
  const [launchError, setLaunchError] = useState("");

  useEffect(() => {
    if (!isOpen) return;
    setMode(initialMode || "QUICK_BOOST_PRODUCT");
    setLaunchError("");
    if (initialMode === "QUICK_BOOST_POST") {
      setObjective("OUTCOME_ENGAGEMENT");
      setOptimizationGoal("POST_ENGAGEMENT");
    } else if (initialMode === "PRODUCT_SALES") {
      setObjective("OUTCOME_SALES");
      setOptimizationGoal(connection?.pixelId ? "OFFSITE_CONVERSIONS" : "LINK_CLICKS");
    } else {
      setObjective(connection?.pixelId ? "OUTCOME_SALES" : "OUTCOME_TRAFFIC");
      setOptimizationGoal(connection?.pixelId ? "OFFSITE_CONVERSIONS" : "LINK_CLICKS");
    }
  }, [isOpen, initialMode, connection?.pixelId]);

  const selectedProduct = useMemo(
    () => products.find((p) => String(p.id) === String(selectedProductId)) || products[0] || null,
    [products, selectedProductId]
  );

  const productImageUrl = useMemo(() => {
    if (!selectedProduct) return "";
    const imgs = Array.isArray(selectedProduct.images) ? selectedProduct.images : [];
    const first = imgs[0];
    if (typeof first === "string") return first;
    if (first && typeof first === "object") return first.url || "";
    return "";
  }, [selectedProduct]);

  const utmSlug = useMemo(() => {
    const base = campaignName || (selectedProduct?.name ? `boost_${selectedProduct.name}` : "meta_boost");
    return base.toLowerCase().replace(/[^a-z0-9]+/g, "_").replace(/^_|_$/g, "") || "meta_boost";
  }, [campaignName, selectedProduct]);

  const effectiveLandingUrl = useMemo(() => {
    if (customLandingUrl.trim()) return customLandingUrl.trim();
    const origin = typeof window !== "undefined" ? window.location.origin : "https://amardokan.com";
    if (selectedProduct) {
      return `${origin}/campaign-products?product=${selectedProduct.id}&utm_source=facebook&utm_campaign=${utmSlug}`;
    }
    return `${origin}/?utm_source=facebook&utm_campaign=${utmSlug}`;
  }, [customLandingUrl, selectedProduct, utmSlug]);

  // Auto-populate copy when selecting a product
  useEffect(() => {
    if (!isOpen || mode === "QUICK_BOOST_POST" || !selectedProduct) return;
    const priceStr = formatBDT(selectedProduct.price || 0);
    setCampaignName((prev) =>
      prev && !prev.startsWith("Boost: ") ? prev : `Boost: ${selectedProduct.name}`
    );
    setHeadline(`${selectedProduct.name} — ${priceStr}`);
    setPrimaryText(
      selectedProduct.shortDescription ||
        `🔥 ${selectedProduct.name} এখন মাত্র ${priceStr}! ক্যাশ অন ডেলিভারিতে অর্ডার করুন।`
    );
    setDescription(`Original Quality • Fast Delivery Across Bangladesh`);
  }, [selectedProduct, mode, isOpen]);

  // Load real Facebook Page posts when switching to Post Boost mode
  useEffect(() => {
    if (!isOpen || mode !== "QUICK_BOOST_POST" || !connection?.isConnected) return;
    let active = true;
    setIsLoadingPosts(true);
    setPostsError("");
    apiClient
      .getMetaPagePosts(15)
      .then((res) => {
        if (!active) return;
        if (res && res.success && Array.isArray(res.posts)) {
          setPagePosts(res.posts);
          if (res.posts.length > 0 && !selectedPostId) {
            setSelectedPostId(res.posts[0].id);
            setCampaignName(`Boost Post: ${(res.posts[0].message || "FB Post").slice(0, 35)}`);
          }
        } else {
          setPostsError(res?.message || "Could not load posts from connected Facebook Page.");
        }
      })
      .finally(() => {
        if (active) setIsLoadingPosts(false);
      });
    return () => {
      active = false;
    };
  }, [isOpen, mode, connection?.isConnected, connection?.pageId]);

  const buildTargetingPayload = () => ({
    countries: selectedCities.length > 0 ? [] : selectedCountryCodes,
    cities: selectedCities.map((c) => ({
      key: String(c.key).replace("city:", ""),
      name: c.name,
      radius: 25,
    })),
    ageMin: Number(ageMin) || 18,
    ageMax: Number(ageMax) || 45,
    genders: genderFilter === "MEN" ? [1] : genderFilter === "WOMEN" ? [2] : [],
    interests: selectedInterests,
    placementMode,
  });

  const handleSearchGeo = async () => {
    if (!geoQuery.trim()) return;
    setIsSearchingGeo(true);
    try {
      const res = await apiClient.searchMetaTargeting(geoQuery.trim(), "adgeolocation");
      if (res && res.success) {
        setGeoSuggestions(res.results || []);
      }
    } finally {
      setIsSearchingGeo(false);
    }
  };

  const handleSearchInterests = async () => {
    if (!interestQuery.trim()) return;
    setIsSearchingInterests(true);
    try {
      const res = await apiClient.searchMetaTargeting(interestQuery.trim(), "adinterest");
      if (res && res.success) {
        setInterestSuggestions(res.results || []);
      }
    } finally {
      setIsSearchingInterests(false);
    }
  };

  const handleEstimateReach = async () => {
    setIsEstimatingReach(true);
    setReachEstimate(null);
    try {
      const res = await apiClient.getMetaReachEstimate(buildTargetingPayload());
      if (res && res.success && res.estimate) {
        setReachEstimate(res.estimate);
      }
    } finally {
      setIsEstimatingReach(false);
    }
  };

  const handleToggleGeoPreset = (preset) => {
    if (preset.type === "country") {
      setSelectedCities([]);
      setSelectedCountryCodes(["BD"]);
      return;
    }
    const cleanKey = String(preset.key).replace("city:", "");
    setSelectedCities((prev) => {
      const exists = prev.some((c) => String(c.key) === cleanKey);
      if (exists) return prev.filter((c) => String(c.key) !== cleanKey);
      return [...prev, { key: cleanKey, name: preset.name }];
    });
  };

  const handleSubmitLaunch = async (e) => {
    e.preventDefault();
    setLaunchError("");
    if (!connection?.isConnected) {
      setLaunchError("Please connect your Facebook Account (OAuth or System User Token) first.");
      return;
    }
    if (mode === "QUICK_BOOST_POST" && !selectedPostId) {
      setLaunchError("Please select a Facebook Page post to boost.");
      return;
    }

    setIsLaunching(true);
    try {
      const res = await apiClient.launchMetaCampaign({
        name: campaignName.trim() || "AmarDokan Campaign",
        campaignType: mode,
        objective,
        optimizationGoal,
        status: initialStatus,
        dailyBudget: Number(dailyBudget) || 500,
        durationDays: Number(durationDays) || 5,
        productId: mode !== "QUICK_BOOST_POST" ? selectedProduct?.id || "" : "",
        productName: mode !== "QUICK_BOOST_POST" ? selectedProduct?.name || "" : "",
        postId: mode === "QUICK_BOOST_POST" ? selectedPostId : "",
        imageUrl: mode !== "QUICK_BOOST_POST" ? productImageUrl : "",
        landingUrl: effectiveLandingUrl,
        publicOrigin: typeof window !== "undefined" ? window.location.origin : "",
        utmCampaign: utmSlug,
        primaryText,
        headline,
        description,
        callToAction,
        targeting: buildTargetingPayload(),
      });

      if (res && res.success) {
        onLaunched?.(res.campaign);
        onClose?.();
      } else {
        setLaunchError(
          res?.message || "Meta rejected campaign launch. Verify billing, page permissions & pixel."
        );
      }
    } catch (err) {
      setLaunchError(err.message || "Launch failed.");
    } finally {
      setIsLaunching(false);
    }
  };

  if (!isOpen) return null;

  const currency = connection?.adAccountCurrency || "BDT";
  const selectedPost = pagePosts.find((p) => p.id === selectedPostId);

  return (
    <div className="fixed inset-0 z-50 bg-black/55 backdrop-blur-xs flex items-center justify-end">
      <div className="bg-white w-full max-w-4xl h-full overflow-y-auto shadow-2xl border-l border-neutral-200 flex flex-col text-xs">
        {/* Sticky Header */}
        <div className="sticky top-0 z-20 bg-white/95 backdrop-blur-xs px-6 py-4 border-b border-neutral-200 flex items-center justify-between gap-3">
          <div className="flex items-center gap-2.5">
            <div className="w-9 h-9 rounded-2xl bg-emerald-700 text-white flex items-center justify-center shadow-xs">
              <Rocket className="w-4.5 h-4.5" />
            </div>
            <div>
              <h2 className="text-base font-black text-neutral-900">
                Meta Boost & Live Campaign Launcher
              </h2>
              <p className="text-[11px] text-neutral-500">
                Account: <span className="font-mono font-bold">{connection?.adAccountId || "Not bound"}</span> •{" "}
                Page: <span className="font-bold">{connection?.pageName || "Not bound"}</span>
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="p-2 rounded-xl text-neutral-500 hover:bg-neutral-100 hover:text-neutral-900 cursor-pointer"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Mode Tabs */}
        <div className="px-6 pt-4 grid grid-cols-3 gap-2">
          <button
            type="button"
            onClick={() => setMode("QUICK_BOOST_PRODUCT")}
            className={`p-3 rounded-2xl border text-left transition-all cursor-pointer ${
              mode === "QUICK_BOOST_PRODUCT"
                ? "bg-emerald-50 border-emerald-500 text-emerald-900 shadow-2xs"
                : "bg-neutral-50 border-neutral-200 text-neutral-600 hover:bg-neutral-100"
            }`}
          >
            <div className="flex items-center gap-1.5 font-extrabold">
              <Zap className="w-3.5 h-3.5 text-emerald-600" />
              <span>Quick Product Boost</span>
            </div>
            <div className="text-[10px] opacity-80 mt-0.5">Auto photo, price & UTM funnel</div>
          </button>

          <button
            type="button"
            onClick={() => setMode("QUICK_BOOST_POST")}
            className={`p-3 rounded-2xl border text-left transition-all cursor-pointer ${
              mode === "QUICK_BOOST_POST"
                ? "bg-blue-50 border-blue-500 text-blue-900 shadow-2xs"
                : "bg-neutral-50 border-neutral-200 text-neutral-600 hover:bg-neutral-100"
            }`}
          >
            <div className="flex items-center gap-1.5 font-extrabold">
              <Facebook className="w-3.5 h-3.5 text-blue-600" />
              <span>Boost Page Post</span>
            </div>
            <div className="text-[10px] opacity-80 mt-0.5">Pick live post from your FB Page</div>
          </button>

          <button
            type="button"
            onClick={() => setMode("PRODUCT_SALES")}
            className={`p-3 rounded-2xl border text-left transition-all cursor-pointer ${
              mode === "PRODUCT_SALES"
                ? "bg-indigo-50 border-indigo-500 text-indigo-900 shadow-2xs"
                : "bg-neutral-50 border-neutral-200 text-neutral-600 hover:bg-neutral-100"
            }`}
          >
            <div className="flex items-center gap-1.5 font-extrabold">
              <Target className="w-3.5 h-3.5 text-indigo-600" />
              <span>Full Sales Campaign</span>
            </div>
            <div className="text-[10px] opacity-80 mt-0.5">Pixel CAPI Conversions + AdSet</div>
          </button>
        </div>

        <form onSubmit={handleSubmitLaunch} className="p-6 space-y-5 flex-1">
          {launchError && (
            <div className="p-3 rounded-2xl bg-rose-50 border border-rose-300 text-rose-800 font-semibold flex items-start gap-2">
              <AlertCircle className="w-4 h-4 text-rose-600 shrink-0 mt-0.5" />
              <span>{launchError}</span>
            </div>
          )}

          <div className="grid grid-cols-1 lg:grid-cols-12 gap-5">
            {/* Left Column: Campaign, Creative / Post, Budget & Targeting (7 cols) */}
            <div className="lg:col-span-7 space-y-4">
              {/* Step 1: Product OR Facebook Page Post Picker */}
              {mode === "QUICK_BOOST_POST" ? (
                <div className="bg-neutral-50 rounded-2xl p-4 border border-neutral-200 space-y-3">
                  <div className="flex items-center justify-between">
                    <span className="font-black text-neutral-900 flex items-center gap-1.5">
                      <FileText className="w-4 h-4 text-blue-600" />
                      <span>Select Published Facebook Page Post</span>
                    </span>
                    {isLoadingPosts && <Loader2 className="w-3.5 h-3.5 animate-spin text-blue-600" />}
                  </div>

                  {postsError ? (
                    <div className="p-2.5 rounded-xl bg-amber-50 border border-amber-200 text-amber-800 text-[11px]">
                      {postsError}
                    </div>
                  ) : pagePosts.length === 0 && !isLoadingPosts ? (
                    <div className="p-4 text-center text-neutral-400">
                      No published posts loaded yet. Connect a Facebook Page with posts first.
                    </div>
                  ) : (
                    <div className="space-y-2 max-h-56 overflow-y-auto pr-1">
                      {pagePosts.map((post) => (
                        <button
                          type="button"
                          key={post.id}
                          onClick={() => {
                            setSelectedPostId(post.id);
                            setCampaignName(`Boost Post: ${(post.message || "FB Post").slice(0, 35)}`);
                          }}
                          className={`w-full text-left p-2.5 rounded-xl border flex items-center gap-3 transition-all cursor-pointer ${
                            selectedPostId === post.id
                              ? "bg-blue-50 border-blue-500 ring-1 ring-blue-500"
                              : "bg-white border-neutral-200 hover:bg-neutral-100"
                          }`}
                        >
                          {post.fullPicture ? (
                            <img
                              src={post.fullPicture}
                              alt=""
                              className="w-12 h-12 rounded-lg object-cover border border-neutral-200 shrink-0"
                            />
                          ) : (
                            <div className="w-12 h-12 rounded-lg bg-blue-100 text-blue-700 flex items-center justify-center shrink-0">
                              <Facebook className="w-5 h-5" />
                            </div>
                          )}
                          <div className="min-w-0 flex-1">
                            <div className="font-bold text-neutral-900 line-clamp-2">
                              {post.message || "Facebook Post"}
                            </div>
                            <div className="text-[10px] text-neutral-400 mt-0.5">
                              ID: {post.id} • Shares: {post.sharesCount || 0}
                            </div>
                          </div>
                        </button>
                      ))}
                    </div>
                  )}
                </div>
              ) : (
                <div className="bg-neutral-50 rounded-2xl p-4 border border-neutral-200 space-y-3">
                  <div className="font-black text-neutral-900 flex items-center gap-1.5">
                    <Package className="w-4 h-4 text-emerald-600" />
                    <span>Select Store Product & Ad Copy</span>
                  </div>

                  <div>
                    <label className="font-bold text-neutral-700 block mb-1">Store Product *</label>
                    <select
                      value={selectedProductId}
                      onChange={(e) => setSelectedProductId(e.target.value)}
                      className="w-full px-3 py-2 rounded-xl border border-neutral-200 bg-white font-semibold focus:outline-none focus:border-emerald-600"
                    >
                      {products.map((p) => (
                        <option key={p.id} value={p.id}>
                          {p.name} — {formatBDT(p.price || 0)}
                        </option>
                      ))}
                    </select>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                    <div>
                      <label className="font-bold text-neutral-700 block mb-1">Ad Headline</label>
                      <input
                        type="text"
                        value={headline}
                        onChange={(e) => setHeadline(e.target.value)}
                        className="w-full px-3 py-2 rounded-xl border border-neutral-200 bg-white focus:outline-none focus:border-emerald-600"
                      />
                    </div>
                    <div>
                      <label className="font-bold text-neutral-700 block mb-1">CTA Button</label>
                      <select
                        value={callToAction}
                        onChange={(e) => setCallToAction(e.target.value)}
                        className="w-full px-3 py-2 rounded-xl border border-neutral-200 bg-white font-semibold focus:outline-none focus:border-emerald-600"
                      >
                        {CTA_OPTIONS.map((c) => (
                          <option key={c.value} value={c.value}>
                            {c.label}
                          </option>
                        ))}
                      </select>
                    </div>
                  </div>

                  <div>
                    <label className="font-bold text-neutral-700 block mb-1">Primary Ad Text</label>
                    <textarea
                      rows={2}
                      value={primaryText}
                      onChange={(e) => setPrimaryText(e.target.value)}
                      className="w-full px-3 py-2 rounded-xl border border-neutral-200 bg-white focus:outline-none focus:border-emerald-600"
                    />
                  </div>
                </div>
              )}

              {/* Step 2: Campaign Name, Objective, Budget & Duration */}
              <div className="bg-neutral-50 rounded-2xl p-4 border border-neutral-200 space-y-3">
                <div className="font-black text-neutral-900 flex items-center gap-1.5">
                  <Calendar className="w-4 h-4 text-indigo-600" />
                  <span>Campaign Objective, Budget & Schedule</span>
                </div>

                <div>
                  <label className="font-bold text-neutral-700 block mb-1">Campaign Name *</label>
                  <input
                    type="text"
                    required
                    value={campaignName}
                    onChange={(e) => setCampaignName(e.target.value)}
                    className="w-full px-3 py-2 rounded-xl border border-neutral-200 bg-white focus:outline-none focus:border-indigo-600"
                  />
                </div>

                <div className="grid grid-cols-2 sm:grid-cols-3 gap-2.5">
                  <div>
                    <label className="font-bold text-neutral-700 block mb-1">Meta Objective</label>
                    <select
                      value={objective}
                      onChange={(e) => setObjective(e.target.value)}
                      className="w-full px-2.5 py-2 rounded-xl border border-neutral-200 bg-white font-semibold"
                    >
                      <option value="OUTCOME_SALES">Sales (Conversions)</option>
                      <option value="OUTCOME_TRAFFIC">Website Traffic</option>
                      <option value="OUTCOME_ENGAGEMENT">Engagement / Boost</option>
                      <option value="OUTCOME_LEADS">Leads</option>
                    </select>
                  </div>
                  <div>
                    <label className="font-bold text-neutral-700 block mb-1">
                      Daily Budget ({currency})
                    </label>
                    <input
                      type="number"
                      min="1"
                      required
                      value={dailyBudget}
                      onChange={(e) => setDailyBudget(e.target.value)}
                      className="w-full px-2.5 py-2 rounded-xl border border-neutral-200 bg-white font-mono"
                    />
                  </div>
                  <div>
                    <label className="font-bold text-neutral-700 block mb-1">Duration (Days)</label>
                    <input
                      type="number"
                      min="1"
                      max="90"
                      value={durationDays}
                      onChange={(e) => setDurationDays(e.target.value)}
                      className="w-full px-2.5 py-2 rounded-xl border border-neutral-200 bg-white font-mono"
                    />
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-2.5">
                  <div>
                    <label className="font-bold text-neutral-700 block mb-1">Optimization Goal</label>
                    <select
                      value={optimizationGoal}
                      onChange={(e) => setOptimizationGoal(e.target.value)}
                      className="w-full px-2.5 py-2 rounded-xl border border-neutral-200 bg-white font-semibold"
                    >
                      <option value="OFFSITE_CONVERSIONS">Pixel Purchase Conversions</option>
                      <option value="LINK_CLICKS">Link Clicks</option>
                      <option value="POST_ENGAGEMENT">Post Engagement</option>
                    </select>
                  </div>
                  <div>
                    <label className="font-bold text-neutral-700 block mb-1">Initial Status on Meta</label>
                    <select
                      value={initialStatus}
                      onChange={(e) => setInitialStatus(e.target.value)}
                      className="w-full px-2.5 py-2 rounded-xl border border-neutral-200 bg-white font-semibold"
                    >
                      <option value="PAUSED">Paused (Inspect before spending)</option>
                      <option value="ACTIVE">Active (Publish & Deliver Now)</option>
                    </select>
                  </div>
                </div>
              </div>

              {/* Step 3: Live Meta Graph API Target Picker */}
              <div className="bg-neutral-50 rounded-2xl p-4 border border-neutral-200 space-y-3">
                <div className="flex items-center justify-between">
                  <span className="font-black text-neutral-900 flex items-center gap-1.5">
                    <MapPin className="w-4 h-4 text-rose-600" />
                    <span>Meta Audience Target Picker</span>
                  </span>
                  <button
                    type="button"
                    onClick={handleEstimateReach}
                    disabled={isEstimatingReach || !connection?.isConnected}
                    className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg bg-white border border-neutral-200 hover:bg-neutral-100 text-neutral-800 font-bold text-[11px] cursor-pointer disabled:opacity-50"
                  >
                    <Users className="w-3 h-3 text-indigo-600" />
                    <span>{isEstimatingReach ? "Estimating..." : "Estimate Reach"}</span>
                  </button>
                </div>

                {/* Quick Bangladesh Presets */}
                <div className="flex flex-wrap gap-1.5">
                  {BD_LOCATION_PRESETS.map((p) => {
                    const cleanKey = String(p.key).replace("city:", "");
                    const isSelected =
                      p.type === "country"
                        ? selectedCities.length === 0
                        : selectedCities.some((c) => String(c.key) === cleanKey);
                    return (
                      <button
                        type="button"
                        key={p.key}
                        onClick={() => handleToggleGeoPreset(p)}
                        className={`px-2.5 py-1 rounded-full text-[11px] font-bold border transition-all cursor-pointer ${
                          isSelected
                            ? "bg-neutral-900 text-white border-neutral-900"
                            : "bg-white text-neutral-700 border-neutral-200 hover:bg-neutral-100"
                        }`}
                      >
                        {p.name}
                      </button>
                    );
                  })}
                </div>

                {/* Live Meta Geo Search */}
                <div className="flex gap-1.5">
                  <input
                    type="text"
                    value={geoQuery}
                    onChange={(e) => setGeoQuery(e.target.value)}
                    placeholder="Search live Meta cities/regions (e.g. Gazipur, Narayanganj)..."
                    className="flex-1 px-3 py-1.5 rounded-xl border border-neutral-200 bg-white focus:outline-none focus:border-indigo-600"
                  />
                  <button
                    type="button"
                    onClick={handleSearchGeo}
                    disabled={isSearchingGeo || !connection?.isConnected}
                    className="px-3 py-1.5 rounded-xl bg-neutral-900 text-white font-bold text-[11px] cursor-pointer disabled:opacity-40"
                  >
                    {isSearchingGeo ? "..." : "Find Geo"}
                  </button>
                </div>
                {geoSuggestions.length > 0 && (
                  <div className="flex flex-wrap gap-1.5">
                    {geoSuggestions.slice(0, 6).map((g) => (
                      <button
                        type="button"
                        key={g.key}
                        onClick={() =>
                          setSelectedCities((prev) =>
                            prev.some((c) => c.key === g.key) ? prev : [...prev, { key: g.key, name: g.name }]
                          )
                        }
                        className="px-2 py-0.5 rounded-lg bg-indigo-50 text-indigo-800 border border-indigo-200 text-[10px] font-bold cursor-pointer"
                      >
                        + {g.name} ({g.type})
                      </button>
                    ))}
                  </div>
                )}

                {/* Age, Gender & Placement */}
                <div className="grid grid-cols-4 gap-2">
                  <div>
                    <label className="text-[10px] font-bold text-neutral-500 block mb-1">Min Age</label>
                    <input
                      type="number"
                      min="18"
                      max="65"
                      value={ageMin}
                      onChange={(e) => setAgeMin(e.target.value)}
                      className="w-full px-2.5 py-1.5 rounded-xl border border-neutral-200 bg-white font-mono"
                    />
                  </div>
                  <div>
                    <label className="text-[10px] font-bold text-neutral-500 block mb-1">Max Age</label>
                    <input
                      type="number"
                      min="18"
                      max="65"
                      value={ageMax}
                      onChange={(e) => setAgeMax(e.target.value)}
                      className="w-full px-2.5 py-1.5 rounded-xl border border-neutral-200 bg-white font-mono"
                    />
                  </div>
                  <div>
                    <label className="text-[10px] font-bold text-neutral-500 block mb-1">Gender</label>
                    <select
                      value={genderFilter}
                      onChange={(e) => setGenderFilter(e.target.value)}
                      className="w-full px-2 py-1.5 rounded-xl border border-neutral-200 bg-white font-semibold"
                    >
                      <option value="ALL">All</option>
                      <option value="MEN">Men</option>
                      <option value="WOMEN">Women</option>
                    </select>
                  </div>
                  <div>
                    <label className="text-[10px] font-bold text-neutral-500 block mb-1">Placements</label>
                    <select
                      value={placementMode}
                      onChange={(e) => setPlacementMode(e.target.value)}
                      className="w-full px-2 py-1.5 rounded-xl border border-neutral-200 bg-white font-semibold"
                    >
                      <option value="ADVANTAGE_PLUS">Auto (All)</option>
                      <option value="FACEBOOK_ONLY">Facebook</option>
                      <option value="INSTAGRAM_ONLY">Instagram</option>
                    </select>
                  </div>
                </div>

                {/* Live Meta Interest Suggestions */}
                <div className="space-y-2">
                  <div className="flex gap-1.5">
                    <div className="relative flex-1">
                      <Search className="w-3.5 h-3.5 text-neutral-400 absolute left-2.5 top-1/2 -translate-y-1/2" />
                      <input
                        type="text"
                        value={interestQuery}
                        onChange={(e) => setInterestQuery(e.target.value)}
                        placeholder="Search Meta Interest Suggestions (e.g. Online shopping, Fashion, Gadgets)..."
                        className="w-full pl-8 pr-3 py-1.5 rounded-xl border border-neutral-200 bg-white focus:outline-none focus:border-emerald-600"
                      />
                    </div>
                    <button
                      type="button"
                      onClick={handleSearchInterests}
                      disabled={isSearchingInterests || !connection?.isConnected}
                      className="px-3 py-1.5 rounded-xl bg-emerald-700 text-white font-bold text-[11px] cursor-pointer disabled:opacity-40"
                    >
                      {isSearchingInterests ? "..." : "Suggest"}
                    </button>
                  </div>

                  {interestSuggestions.length > 0 && (
                    <div className="flex flex-wrap gap-1.5">
                      {interestSuggestions.slice(0, 8).map((item) => (
                        <button
                          type="button"
                          key={item.id}
                          onClick={() =>
                            setSelectedInterests((prev) =>
                              prev.some((i) => i.id === item.id) ? prev : [...prev, { id: item.id, name: item.name }]
                            )
                          }
                          className="px-2.5 py-1 rounded-lg bg-emerald-50 hover:bg-emerald-100 text-emerald-900 border border-emerald-200 text-[10px] font-bold cursor-pointer"
                        >
                          + {item.name}{" "}
                          {item.audienceSizeUpper > 0
                            ? `(${Math.round(item.audienceSizeUpper / 1000)}K)`
                            : ""}
                        </button>
                      ))}
                    </div>
                  )}

                  {selectedInterests.length > 0 && (
                    <div className="flex flex-wrap gap-1.5 pt-1">
                      {selectedInterests.map((item) => (
                        <span
                          key={item.id}
                          className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full bg-neutral-900 text-white text-[10px] font-bold"
                        >
                          <span>{item.name}</span>
                          <button
                            type="button"
                            onClick={() =>
                              setSelectedInterests((prev) => prev.filter((i) => i.id !== item.id))
                            }
                          >
                            <X className="w-3 h-3" />
                          </button>
                        </span>
                      ))}
                    </div>
                  )}
                </div>

                {reachEstimate && (
                  <div className="p-2.5 rounded-xl bg-indigo-50 border border-indigo-200 text-indigo-900 text-[11px] font-bold flex items-center justify-between">
                    <span>Estimated Audience Size on Meta:</span>
                    <span>
                      {Number(reachEstimate.usersLowerBound || 0).toLocaleString()} –{" "}
                      {Number(reachEstimate.usersUpperBound || 0).toLocaleString()} users
                    </span>
                  </div>
                )}
              </div>
            </div>

            {/* Right Column: Live Facebook Ad Visual Preview (5 cols) */}
            <div className="lg:col-span-5 space-y-4">
              <div className="sticky top-20 bg-neutral-100 rounded-3xl p-4 border border-neutral-200 space-y-3">
                <div className="flex items-center justify-between text-[11px] font-bold text-neutral-600 uppercase">
                  <span>Live Facebook Ad Preview</span>
                  <span className="px-2 py-0.5 rounded-full bg-white border border-neutral-200 text-[10px]">
                    {mode === "QUICK_BOOST_POST" ? "Post Boost" : "Feed Ad"}
                  </span>
                </div>

                <div className="bg-white rounded-2xl border border-neutral-200 shadow-xs overflow-hidden">
                  {/* Page Header */}
                  <div className="p-3 flex items-center gap-2.5">
                    <div className="w-8 h-8 rounded-full bg-blue-600 text-white flex items-center justify-center font-black text-xs">
                      {(connection?.pageName || "A")[0]}
                    </div>
                    <div>
                      <div className="font-bold text-neutral-900 text-xs">
                        {connection?.pageName || "Your Facebook Page"}
                      </div>
                      <div className="text-[10px] text-neutral-400">Sponsored • Meta Ads</div>
                    </div>
                  </div>

                  {/* Primary Copy */}
                  <div className="px-3 pb-2.5 text-xs text-neutral-800 whitespace-pre-line">
                    {mode === "QUICK_BOOST_POST"
                      ? selectedPost?.message || "Select a Facebook Page post to preview..."
                      : primaryText || "Write your ad caption..."}
                  </div>

                  {/* Media Preview */}
                  {(mode === "QUICK_BOOST_POST" ? selectedPost?.fullPicture : productImageUrl) ? (
                    <img
                      src={mode === "QUICK_BOOST_POST" ? selectedPost?.fullPicture : productImageUrl}
                      alt="Ad Creative"
                      className="w-full h-56 object-cover bg-neutral-100 border-y border-neutral-100"
                    />
                  ) : (
                    <div className="w-full h-44 bg-neutral-100 border-y border-neutral-200 flex items-center justify-center text-neutral-400">
                      Product / Post image preview
                    </div>
                  )}

                  {/* Footer CTA Bar */}
                  {mode !== "QUICK_BOOST_POST" && (
                    <div className="p-3 bg-neutral-50 flex items-center justify-between gap-2">
                      <div className="min-w-0">
                        <div className="text-[10px] text-neutral-400 truncate uppercase">
                          {typeof window !== "undefined" ? window.location.host : "amardokan.com"}
                        </div>
                        <div className="font-black text-neutral-900 truncate">
                          {headline || selectedProduct?.name || "Headline"}
                        </div>
                        {description && (
                          <div className="text-[10px] text-neutral-500 truncate">{description}</div>
                        )}
                      </div>
                      <span className="px-3 py-1.5 rounded-lg bg-neutral-200 text-neutral-900 font-bold text-[11px] shrink-0">
                        {CTA_OPTIONS.find((c) => c.value === callToAction)?.label || "Shop Now"}
                      </span>
                    </div>
                  )}
                </div>

                {/* UTM Landing URL & Budget Summary */}
                <div className="bg-white rounded-2xl p-3 border border-neutral-200 space-y-2 text-[11px]">
                  <div>
                    <span className="text-[10px] font-bold uppercase text-neutral-400 block">
                      Tracked UTM Destination URL
                    </span>
                    <span className="font-mono text-[10px] text-emerald-700 break-all block mt-0.5">
                      {effectiveLandingUrl}
                    </span>
                  </div>
                  <div className="pt-2 border-t border-neutral-100 flex items-center justify-between">
                    <span className="text-neutral-500 font-semibold">Est. Total Budget:</span>
                    <span className="font-black text-neutral-900">
                      {Number(dailyBudget || 0).toLocaleString()} {currency}/day × {durationDays}d ={" "}
                      {(Number(dailyBudget || 0) * Number(durationDays || 1)).toLocaleString()} {currency}
                    </span>
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* Sticky Footer Actions */}
          <div className="pt-4 border-t border-neutral-200 flex items-center justify-between gap-3">
            <div className="text-[11px] text-neutral-500">
              Pushes Campaign → AdSet → Creative → Ad directly to Meta Graph API v19.0 & tracks real store ROAS.
            </div>
            <div className="flex items-center gap-2 shrink-0">
              <button
                type="button"
                onClick={onClose}
                className="px-4 py-2.5 rounded-xl border border-neutral-200 text-neutral-700 font-bold hover:bg-neutral-50"
              >
                Cancel
              </button>
              <button
                type="submit"
                disabled={isLaunching}
                className="inline-flex items-center gap-1.5 px-5 py-2.5 rounded-xl bg-emerald-700 hover:bg-emerald-800 text-white font-black shadow-sm cursor-pointer disabled:opacity-50"
              >
                {isLaunching ? (
                  <>
                    <Loader2 className="w-4 h-4 animate-spin" />
                    <span>Launching on Meta...</span>
                  </>
                ) : (
                  <>
                    <Sparkles className="w-4 h-4" />
                    <span>Launch Live on Meta</span>
                  </>
                )}
              </button>
            </div>
          </div>
        </form>
      </div>
    </div>
  );
};

export default MetaBoostWizardDrawer;

