import React, { useState } from "react";
import {
  Zap,
  Flame,
  Check,
  ExternalLink,
  Search,
  Sparkles,
  Clock,
  ShieldCheck,
  Truck,
  CheckCircle2,
  Tag,
  Power,
  Trash2,
} from "lucide-react";
import { formatBDT } from "../../utils/bangladesh";
import { getProductImage, handleProductImageError } from "../../utils/productImage";

export const AdminCampaign = ({
  products = [],
  themeConfig,
  updateThemeConfig,
  onNavigateToView,
}) => {
  const [searchQuery, setSearchQuery] = useState("");
  const [saveSuccess, setSaveSuccess] = useState(false);

  const campaign = themeConfig?.campaign || {};
  const isCampaignEnabled = campaign.enabled !== false;

  const activeProductIds = Array.isArray(campaign.activeProductIds)
    ? campaign.activeProductIds.filter(Boolean)
    : (campaign.activeProductId ? [campaign.activeProductId] : []);

  const activeProductsList = activeProductIds
    .map((id) => products.find((p) => p.id === id))
    .filter(Boolean);
  const activeProduct = activeProductsList[0] || products[0] || null;

  const unblockMarketingCampaignIds = (idsToUnblock) => {
    const mc = themeConfig?.marketingCampaigns;
    if (!mc) return;
    const blockSet = new Set(idsToUnblock.filter(Boolean).map(String));
    const currentDeleted = Array.isArray(mc.deletedCampaignIds) ? mc.deletedCampaignIds : [];
    const currentPaused = Array.isArray(mc.pausedCampaignIds) ? mc.pausedCampaignIds : [];
    const nextDeleted = currentDeleted.filter((id) => !blockSet.has(String(id)));
    const nextPaused = currentPaused.filter((id) => !blockSet.has(String(id)));
    if (nextDeleted.length !== currentDeleted.length || nextPaused.length !== currentPaused.length) {
      Promise.resolve().then(() => {
        updateThemeConfig("marketingCampaigns", {
          deletedCampaignIds: nextDeleted,
          pausedCampaignIds: nextPaused,
        });
      });
    }
  };

  const handleToggleCampaignEnabled = () => {
    const nextState = !isCampaignEnabled;
    updateThemeConfig("campaign", { enabled: nextState });
    if (nextState) {
      unblockMarketingCampaignIds(["special-campaign", ...activeProductIds, ...activeProductIds.map((id) => `camp-prod-${id}`)]);
    }
    setSaveSuccess(true);
    setTimeout(() => setSaveSuccess(false), 2500);
  };

  const handleToggleProductInCampaign = (prodId) => {
    const exists = activeProductIds.includes(prodId);
    const nextIds = exists
      ? activeProductIds.filter((id) => id !== prodId)
      : [...activeProductIds, prodId];
    updateThemeConfig("campaign", {
      enabled: nextIds.length > 0 ? true : isCampaignEnabled,
      activeProductIds: nextIds,
      activeProductId: nextIds[0] || null,
    });
    if (!exists) {
      unblockMarketingCampaignIds(["special-campaign", prodId, `camp-prod-${prodId}`]);
    }
    setSaveSuccess(true);
    setTimeout(() => setSaveSuccess(false), 2500);
  };

  const handleClearAllCampaignProducts = () => {
    updateThemeConfig("campaign", {
      enabled: false,
      activeProductIds: [],
      activeProductId: null,
    });
    setSaveSuccess(true);
    setTimeout(() => setSaveSuccess(false), 2500);
  };

  // Local state for the campaign form fields
  const [headline, setHeadline] = useState(campaign.headline || "");
  const [subheadline, setSubheadline] = useState(campaign.subheadline || "");
  const [badgeText, setBadgeText] = useState(campaign.badgeText || "");
  const [urgencyText, setUrgencyText] = useState(campaign.urgencyText || "");
  const [countdownEnabled, setCountdownEnabled] = useState(campaign.countdownEnabled ?? true);
  const [countdownHours, setCountdownHours] = useState(campaign.countdownHours || 24);
  const [freeDelivery, setFreeDelivery] = useState(campaign.freeDelivery ?? true);

  // Sync remaining form submission clean
  const handleSaveCampaignDetails = (e) => {
    e.preventDefault();
    updateThemeConfig("campaign", {
      headline,
      subheadline,
      badgeText,
      urgencyText,
      countdownEnabled,
      countdownHours: Number(countdownHours) || 24,
      freeDelivery,
    });
    setSaveSuccess(true);
    setTimeout(() => setSaveSuccess(false), 2500);
  };

  const filteredProducts = products.filter((p) => {
    const q = searchQuery.toLowerCase().trim();
    if (!q) return true;
    return (
      (p.name || "").toLowerCase().includes(q) ||
      (p.nameBn || "").toLowerCase().includes(q) ||
      (p.sku || "").toLowerCase().includes(q) ||
      (p.category || "").toLowerCase().includes(q)
    );
  });

  return (
    <div className="space-y-6 max-w-6xl mx-auto pb-12">
      {/* Top Banner */}
      <div className="bg-gradient-to-r from-emerald-950 via-neutral-900 to-neutral-950 p-6 rounded-3xl border border-emerald-800/40 shadow-xl flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
        <div>
          <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-emerald-500/20 text-emerald-400 text-xs font-bold mb-2">
            <Zap className="w-3.5 h-3.5" />
            <span>Special Campaign Management</span>
          </div>
          <h2 className="text-xl sm:text-2xl font-black text-white tracking-tight">
            Campaign & Special Offer Configuration
          </h2>
          <p className="text-xs text-neutral-400 mt-1 max-w-2xl">
            Select any product for campaign with 1 click. The selected product will be featured live on{" "}
            <code className="bg-emerald-900/60 px-1.5 py-0.5 rounded text-emerald-300 font-mono text-[11px]">
              /campaign-products
            </code>{" "}
            page with special offer for customers.
          </p>
        </div>

          <button
            type="button"
            onClick={() => {
              if (onNavigateToView && activeProduct) {
                onNavigateToView("landing", {
                  productId: activeProduct.id,
                  slug: activeProduct.slug,
                  forceCampaign: isCampaignEnabled,
                });
              } else if (onNavigateToView) {
                onNavigateToView("landing");
              }
            }}
            className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-500 hover:to-teal-500 text-white font-bold text-xs shadow-lg shadow-emerald-950/60 transition-all cursor-pointer"
          >
            <span>{isCampaignEnabled ? "Live Campaign Page" : "Live Product Page"}</span>
            <ExternalLink className="w-3.5 h-3.5" />
          </button>
      </div>

      {saveSuccess && (
        <div className="p-4 rounded-2xl bg-emerald-950 border border-emerald-700/60 text-emerald-300 text-xs font-bold flex items-center gap-2.5 shadow-lg animate-in fade-in duration-200">
          <CheckCircle2 className="w-5 h-5 text-emerald-400 shrink-0" />
          <span>Campaign settings saved and synced to live page successfully!</span>
        </div>
      )}

      {/* Active Campaign Products Spotlight (Multiple Supported) */}
      <div className="bg-white rounded-3xl p-6 border border-neutral-200 shadow-sm space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-3 border-b border-neutral-100">
          <h3 className="text-sm font-bold text-neutral-900 flex items-center gap-2">
            <Flame className="w-4 h-4 text-emerald-600" />
            <span>{`Currently Active Campaign Products (${activeProductsList.length})`}</span>
          </h3>
          <div className="flex flex-wrap items-center gap-2">
            <button
              type="button"
              onClick={handleToggleCampaignEnabled}
              className={`inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full text-xs font-bold transition-all cursor-pointer border shadow-2xs ${
                isCampaignEnabled
                  ? "bg-emerald-50 text-emerald-800 border-emerald-300 hover:bg-emerald-100"
                  : "bg-neutral-100 text-neutral-600 border-neutral-300 hover:bg-neutral-200"
              }`}
              title={isCampaignEnabled ? "Disable campaign" : "Enable campaign"}
            >
              <span className={`w-2.5 h-2.5 rounded-full ${isCampaignEnabled ? "bg-emerald-500 animate-pulse" : "bg-neutral-400"}`} />
              <span>{isCampaignEnabled ? "Campaign Active" : "Campaign Disabled"}</span>
            </button>

            {activeProductsList.length > 0 && (
              <button
                type="button"
                onClick={handleClearAllCampaignProducts}
                className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-bold bg-rose-50 hover:bg-rose-100 text-rose-700 border border-rose-200 transition-colors cursor-pointer"
              >
                <Trash2 className="w-3.5 h-3.5" />
                <span>Clear All</span>
              </button>
            )}
          </div>
        </div>

        {!isCampaignEnabled && (
          <div className="p-3.5 bg-amber-50/80 border border-amber-300/80 rounded-2xl text-xs text-amber-900 flex items-center gap-2.5">
            <Power className="w-4 h-4 text-amber-700 shrink-0" />
            <div className="leading-relaxed">
              <span className="font-bold">Campaign is paused:</span> Visitors will see standard product pages without special campaign banners.
            </div>
          </div>
        )}

        {activeProductsList.length > 0 ? (
          <div className={`grid grid-cols-1 md:grid-cols-2 gap-4 ${!isCampaignEnabled ? "opacity-75" : ""}`}>
            {activeProductsList.map((prod) => (
              <div
                key={prod.id}
                className="flex items-center gap-4 p-4 rounded-2xl bg-neutral-50 border border-emerald-200/80 shadow-2xs"
              >
                <img
                  src={getProductImage(prod)}
                  alt={prod.name}
                  className="w-20 h-20 rounded-2xl object-cover bg-white shrink-0 border border-neutral-200 shadow-xs"
                  onError={handleProductImageError}
                />
                <div className="flex-1 min-w-0 space-y-1">
                  <span className="inline-block px-2 py-0.5 rounded-full bg-emerald-600 text-white text-[10px] font-bold">
                    {prod.category || "General"}
                  </span>
                  <h4 className="text-sm font-bold text-neutral-900 truncate">
                    {prod.nameBn || prod.name}
                  </h4>
                  <div className="flex flex-wrap items-center gap-2 text-xs">
                    <span className="font-extrabold text-emerald-700">
                      {formatBDT(prod.price)}
                    </span>
                    <span className="text-neutral-500 font-mono text-[10px] bg-neutral-200/60 px-1.5 py-0.5 rounded">
                      Stock: {prod.stock}
                    </span>
                  </div>
                  <div className="flex items-center gap-2 pt-1">
                    <button
                      type="button"
                      onClick={() => {
                        if (onNavigateToView) {
                          onNavigateToView("landing", {
                            productId: prod.id,
                            slug: prod.slug,
                            forceCampaign: true,
                          });
                        }
                      }}
                      className="px-2.5 py-1 rounded-lg bg-neutral-900 hover:bg-neutral-800 text-white text-[11px] font-bold cursor-pointer flex items-center gap-1"
                    >
                      <span>View Page</span>
                      <ExternalLink className="w-3 h-3" />
                    </button>
                    <button
                      type="button"
                      onClick={() => handleToggleProductInCampaign(prod.id)}
                      className="px-2.5 py-1 rounded-lg bg-rose-50 hover:bg-rose-100 text-rose-700 border border-rose-200 text-[11px] font-bold cursor-pointer flex items-center gap-1"
                    >
                      <Trash2 className="w-3 h-3" />
                      <span>Remove</span>
                    </button>
                  </div>
                </div>
              </div>
            ))}
          </div>
        ) : (
          <div className="p-6 rounded-2xl bg-neutral-50 border border-dashed border-neutral-300 text-center text-neutral-500 text-xs">
            No active campaign products selected. Click "Add to Campaign" on one or more products below.
          </div>
        )}
      </div>

      {/* Campaign Offer Details Form */}
      <div className="bg-white rounded-3xl p-6 border border-neutral-200 shadow-sm space-y-4">
        <h3 className="text-sm font-bold text-neutral-900 flex items-center gap-2 pb-3 border-b border-neutral-100">
          <Tag className="w-4 h-4 text-emerald-600" />
          <span>Campaign Title & Banner Configuration</span>
        </h3>

        <form onSubmit={handleSaveCampaignDetails} className="space-y-4 text-xs">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-neutral-700 font-bold mb-1.5">
                Campaign Banner Main Headline
              </label>
              <input
                type="text"
                value={headline}
                onChange={(e) => setHeadline(e.target.value)}
                placeholder="e.g. 🔥 Exclusive Mega Offer - Limited Time Only!"
                className="w-full bg-neutral-50 border border-neutral-300 rounded-xl px-3.5 py-2.5 text-neutral-900 focus:outline-none focus:border-emerald-600 font-medium"
              />
            </div>

            <div>
              <label className="block text-neutral-700 font-bold mb-1.5">
                Offer Badge Text
              </label>
              <input
                type="text"
                value={badgeText}
                onChange={(e) => setBadgeText(e.target.value)}
                placeholder="e.g. Special Campaign Offer"
                className="w-full bg-neutral-50 border border-neutral-300 rounded-xl px-3.5 py-2.5 text-neutral-900 focus:outline-none focus:border-emerald-600 font-medium"
              />
            </div>
          </div>

          <div>
            <label className="block text-neutral-700 font-bold mb-1.5">
              Subheadline / Offer Details
            </label>
            <textarea
              rows={2}
              value={subheadline}
              onChange={(e) => setSubheadline(e.target.value)}
              placeholder="Special discount on authentic premium products with nationwide cash on delivery..."
              className="w-full bg-neutral-50 border border-neutral-300 rounded-xl px-3.5 py-2.5 text-neutral-900 focus:outline-none focus:border-emerald-600 font-medium"
            />
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-neutral-700 font-bold mb-1.5">
                Urgency Stock Notice
              </label>
              <input
                type="text"
                value={urgencyText}
                onChange={(e) => setUrgencyText(e.target.value)}
                placeholder="e.g. ⚡ Selling out fast! Only a few items left in stock."
                className="w-full bg-neutral-50 border border-neutral-300 rounded-xl px-3.5 py-2.5 text-neutral-900 focus:outline-none focus:border-emerald-600 font-medium"
              />
            </div>

            <div className="grid grid-cols-2 gap-2">
              <div className="p-3 bg-neutral-50 rounded-xl border border-neutral-200 flex items-center justify-between">
                <div>
                  <span className="font-bold text-neutral-800 block text-xs">Countdown Timer</span>
                  <span className="text-[10px] text-neutral-500">Offer timer active</span>
                </div>
                <input
                  type="checkbox"
                  checked={countdownEnabled}
                  onChange={(e) => setCountdownEnabled(e.target.checked)}
                  className="w-4 h-4 accent-emerald-600 cursor-pointer"
                />
              </div>

              <div className="p-3 bg-neutral-50 rounded-xl border border-neutral-200 flex items-center justify-between">
                <div>
                  <span className="font-bold text-neutral-800 block text-xs">Free Delivery Badge</span>
                  <span className="text-[10px] text-neutral-500">Show COD guarantee</span>
                </div>
                <input
                  type="checkbox"
                  checked={freeDelivery}
                  onChange={(e) => setFreeDelivery(e.target.checked)}
                  className="w-4 h-4 accent-emerald-600 cursor-pointer"
                />
              </div>
            </div>
          </div>

          <div className="pt-2 flex justify-end">
            <button
              type="submit"
              className="px-5 py-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs shadow-md transition-all cursor-pointer flex items-center gap-1.5"
            >
              <Check className="w-4 h-4" />
              <span>Save Campaign Settings</span>
            </button>
          </div>
        </form>
      </div>

      {/* Product Selection List / Grid */}
      <div className="bg-white rounded-3xl p-6 border border-neutral-200 shadow-sm space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-3 border-b border-neutral-100">
          <div>
            <h3 className="text-sm font-bold text-neutral-900">
              Select Multiple Campaign Products from Catalog
            </h3>
            <p className="text-xs text-neutral-500">
              Click "Add to Campaign" on one or more products below to include them in Special Campaigns.
            </p>
          </div>

          <div className="relative w-full sm:w-64">
            <Search className="w-3.5 h-3.5 text-neutral-400 absolute left-3 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search products..."
              className="w-full bg-neutral-50 border border-neutral-200 rounded-xl pl-9 pr-3 py-2 text-xs focus:outline-none focus:border-emerald-600"
            />
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {filteredProducts.map((prod) => {
            const isSelected = activeProductIds.includes(prod.id);
            return (
              <div
                key={prod.id}
                className={`p-4 rounded-2xl border transition-all flex flex-col justify-between ${isSelected
                  ? "bg-emerald-50/60 border-emerald-500 shadow-sm ring-2 ring-emerald-500/20"
                  : "bg-white border-neutral-200 hover:border-neutral-300 hover:shadow-xs"
                  }`}
              >
                <div className="flex items-start gap-3 mb-3">
                  <img
                    src={getProductImage(prod)}
                    alt={prod.name}
                    className="w-16 h-16 rounded-xl object-cover bg-neutral-100 shrink-0 border border-neutral-200"
                    onError={handleProductImageError}
                  />
                  <div className="flex-1 min-w-0">
                    <span className="text-[10px] font-bold text-neutral-500 block truncate">
                      {prod.category}
                    </span>
                    <h4 className="text-xs font-bold text-neutral-900 truncate">
                      {prod.nameBn || prod.name}
                    </h4>
                    <p className="text-[11px] text-neutral-500 truncate">{prod.name}</p>
                    <div className="flex items-center gap-2 mt-1">
                      <span className="font-extrabold text-emerald-700 text-xs">
                        {formatBDT(prod.price)}
                      </span>
                      {prod.regularPrice > prod.price && (
                        <span className="text-neutral-400 line-through text-[11px]">
                          {formatBDT(prod.regularPrice)}
                        </span>
                      )}
                    </div>
                  </div>
                </div>

                <div className="pt-3 border-t border-neutral-100 flex items-center justify-between gap-2">
                  <span className="text-[11px] text-neutral-500 font-mono">
                    Stock: {prod.stock} pcs
                  </span>

                  {isSelected ? (
                    <button
                      type="button"
                      onClick={() => handleToggleProductInCampaign(prod.id)}
                      className="inline-flex items-center gap-1 px-3 py-1.5 rounded-xl bg-emerald-600 hover:bg-rose-600 text-white text-xs font-bold shadow-xs transition-colors cursor-pointer"
                      title="Click to remove from active campaigns"
                    >
                      <Check className="w-3.5 h-3.5" />
                      <span>Active (Remove)</span>
                    </button>
                  ) : (
                    <button
                      type="button"
                      onClick={() => handleToggleProductInCampaign(prod.id)}
                      className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-neutral-900 hover:bg-emerald-600 text-white text-xs font-bold transition-colors cursor-pointer"
                    >
                      <Zap className="w-3 h-3 text-amber-400" />
                      <span>Add to Campaign</span>
                    </button>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
};
