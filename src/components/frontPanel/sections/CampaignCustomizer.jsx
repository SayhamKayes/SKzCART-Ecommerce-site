import React from "react";
import { Zap, Clock, ShieldCheck, Flame, ExternalLink, Check, ShoppingBag } from "lucide-react";

export const CampaignCustomizer = ({
  config,
  onChange,
  products = [],
  onNavigateToView,
}) => {
  const campaign = config.campaign || {};
  const activeProd = products.find((p) => p.id === campaign.activeProductId) || products[0];

  const handleUpdate = (field, value) => {
    onChange("campaign", { [field]: value });
  };

  return (
    <div className="space-y-6">
      {/* Header Info */}
      <div className="bg-gradient-to-r from-emerald-950/40 via-neutral-900 to-neutral-950 p-5 rounded-2xl border border-emerald-800/30">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div>
            <h3 className="text-sm font-bold text-white flex items-center gap-2">
              <Zap className="w-4 h-4 text-emerald-400" />
              <span>Special Campaign Product Configuration</span>
            </h3>
            <p className="text-xs text-neutral-400 mt-1">
              The selected product here will be featured directly on the <code className="text-emerald-400 font-mono">/campaign-products</code> page with special offer.
            </p>
          </div>
          <button
            type="button"
            onClick={() => onNavigateToView && onNavigateToView("landing")}
            className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-emerald-700 hover:bg-emerald-600 text-white font-bold text-xs shadow-md transition-all cursor-pointer self-start sm:self-auto shrink-0"
          >
            <span>View Live Page</span>
            <ExternalLink className="w-3.5 h-3.5" />
          </button>
        </div>
      </div>

      {/* Active Campaign Product Selection Card */}
      <div className="bg-neutral-900 p-5 rounded-2xl border border-neutral-800 space-y-4">
        <h4 className="text-xs font-bold text-neutral-200 uppercase tracking-wider flex items-center gap-2">
          <span>1. Currently Active Campaign Product</span>
        </h4>

        {activeProd ? (
          <div className="p-4 rounded-xl bg-neutral-950 border border-emerald-500/40 flex flex-col sm:flex-row items-center gap-4">
            <img
              src={activeProd.image || (activeProd.images && activeProd.images[0])}
              alt={activeProd.name}
              className="w-20 h-20 rounded-xl object-cover bg-neutral-900 shrink-0 border border-neutral-800"
            />
            <div className="flex-1 min-w-0 text-center sm:text-left">
              <div className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-emerald-500/20 text-emerald-400 text-[10px] font-bold mb-1">
                <Flame className="w-3 h-3" />
                <span>Active on Campaign</span>
              </div>
              <h5 className="text-sm font-bold text-white truncate">
                {activeProd.nameBn || activeProd.name}
              </h5>
              <p className="text-xs text-neutral-400 truncate">{activeProd.name}</p>
              <div className="flex items-center justify-center sm:justify-start gap-3 mt-1.5 text-xs">
                <span className="font-bold text-emerald-400">৳{activeProd.price}</span>
                {activeProd.regularPrice > activeProd.price && (
                  <span className="text-neutral-500 line-through">৳{activeProd.regularPrice}</span>
                )}
                <span className="text-neutral-500 font-mono text-[11px]">SKU: {activeProd.sku || activeProd.id}</span>
              </div>
            </div>
          </div>
        ) : (
          <div className="p-4 rounded-xl bg-neutral-950 border border-neutral-800 text-neutral-400 text-xs">
            No product found.
          </div>
        )}

        {/* Change Active Product Picker */}
        <div>
          <label className="block text-xs font-semibold text-neutral-300 mb-2">
            Select another product for campaign:
          </label>
          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-2.5 max-h-60 overflow-y-auto pr-1">
            {products.map((p) => {
              const isSelected = p.id === campaign.activeProductId;
              return (
                <button
                  key={p.id}
                  type="button"
                  onClick={() => handleUpdate("activeProductId", p.id)}
                  className={`p-2.5 rounded-xl border text-left flex items-center gap-2.5 transition-all cursor-pointer ${
                    isSelected
                      ? "bg-emerald-950/60 border-emerald-500 text-white shadow-sm ring-1 ring-emerald-500/50"
                      : "bg-neutral-950 border-neutral-800 text-neutral-300 hover:border-neutral-700 hover:bg-neutral-800/50"
                  }`}
                >
                  <img
                    src={p.image || (p.images && p.images[0])}
                    alt={p.name}
                    className="w-10 h-10 rounded-lg object-cover bg-neutral-900 shrink-0"
                  />
                  <div className="flex-1 min-w-0">
                    <p className="text-xs font-bold truncate text-white">{p.nameBn || p.name}</p>
                    <p className="text-[11px] text-emerald-400 font-medium">৳{p.price}</p>
                  </div>
                  {isSelected && <Check className="w-4 h-4 text-emerald-400 shrink-0" />}
                </button>
              );
            })}
          </div>
        </div>
      </div>

      {/* Campaign Headlines & Copy */}
      <div className="bg-neutral-900 p-5 rounded-2xl border border-neutral-800 space-y-4 text-xs">
        <h4 className="text-xs font-bold text-neutral-200 uppercase tracking-wider">
          2. Campaign Headline & Banner Settings
        </h4>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <label className="block text-neutral-300 font-semibold mb-1.5">
              Campaign Main Headline (Banner Headline)
            </label>
            <input
              type="text"
              value={campaign.headline || ""}
              onChange={(e) => handleUpdate("headline", e.target.value)}
              placeholder="e.g. 🔥 Mega Deal Offer - Limited Time Only!"
              className="w-full bg-neutral-950 border border-neutral-800 rounded-xl px-3 py-2 text-white text-xs focus:outline-none focus:border-emerald-500"
            />
          </div>

          <div>
            <label className="block text-neutral-300 font-semibold mb-1.5">
              Campaign Badge Text (Offer Badge)
            </label>
            <input
              type="text"
              value={campaign.badgeText || ""}
              onChange={(e) => handleUpdate("badgeText", e.target.value)}
              placeholder="e.g. Special Offer"
              className="w-full bg-neutral-950 border border-neutral-800 rounded-xl px-3 py-2 text-white text-xs focus:outline-none focus:border-emerald-500"
            />
          </div>
        </div>

        <div>
          <label className="block text-neutral-300 font-semibold mb-1.5">
            Subheadline / Offer Details
          </label>
          <textarea
            rows={2}
            value={campaign.subheadline || ""}
            onChange={(e) => handleUpdate("subheadline", e.target.value)}
            placeholder="Exclusive discount on authentic premium products..."
            className="w-full bg-neutral-950 border border-neutral-800 rounded-xl px-3 py-2 text-white text-xs focus:outline-none focus:border-emerald-500"
          />
        </div>

        <div>
          <label className="block text-neutral-300 font-semibold mb-1.5">
            Urgency Stock Notice
          </label>
          <input
            type="text"
            value={campaign.urgencyText || ""}
            onChange={(e) => handleUpdate("urgencyText", e.target.value)}
            placeholder="e.g. ⚡ Selling out fast! Only a few items left in stock."
            className="w-full bg-neutral-950 border border-neutral-800 rounded-xl px-3 py-2 text-white text-xs focus:outline-none focus:border-emerald-500"
          />
        </div>
      </div>

      {/* Countdown Timer & Delivery Badge */}
      <div className="bg-neutral-900 p-5 rounded-2xl border border-neutral-800 space-y-4 text-xs">
        <h4 className="text-xs font-bold text-neutral-200 uppercase tracking-wider">
          3. Timer & Conversion Options
        </h4>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div className="p-4 rounded-xl bg-neutral-950 border border-neutral-800 flex items-center justify-between">
            <div>
              <span className="font-bold text-white block">Enable Countdown Timer</span>
              <span className="text-[11px] text-neutral-400">Shows urgent expiry countdown on campaign page</span>
            </div>
            <input
              type="checkbox"
              checked={campaign.countdownEnabled ?? true}
              onChange={(e) => handleUpdate("countdownEnabled", e.target.checked)}
              className="w-5 h-5 accent-emerald-500 cursor-pointer"
            />
          </div>

          <div className="p-4 rounded-xl bg-neutral-950 border border-neutral-800 flex items-center justify-between">
            <div>
              <span className="font-bold text-white block">Free Delivery & Cash on Delivery Badge</span>
              <span className="text-[11px] text-neutral-400">Shows trust badges under offer form</span>
            </div>
            <input
              type="checkbox"
              checked={campaign.freeDelivery ?? true}
              onChange={(e) => handleUpdate("freeDelivery", e.target.checked)}
              className="w-5 h-5 accent-emerald-500 cursor-pointer"
            />
          </div>
        </div>

        <div>
          <label className="block text-neutral-300 font-semibold mb-1.5">
            Order Button Text (CTA Button Text)
          </label>
          <input
            type="text"
            value={campaign.callToActionText || ""}
            onChange={(e) => handleUpdate("callToActionText", e.target.value)}
            placeholder="Click here to order now"
            className="w-full bg-neutral-950 border border-neutral-800 rounded-xl px-3 py-2 text-white text-xs focus:outline-none focus:border-emerald-500"
          />
        </div>
      </div>
    </div>
  );
};
