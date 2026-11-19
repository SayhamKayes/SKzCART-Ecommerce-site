import React, { useState } from "react";
import { Home, Sparkles, ShieldCheck, Layers, Plus, Trash2, Upload, Image as ImageIcon, Loader2 } from "lucide-react";
import { sanitizeText } from "../../../utils/textSanitizer";
import { apiClient } from "../../../services/api";

export const FrontPageCustomizer = ({ config, onChange, products = [] }) => {
  const homePage = config.homePage || {};
  const heroSlides = Array.isArray(homePage.heroSlides) ? homePage.heroSlides : [];
  const [uploadingSlot, setUploadingSlot] = useState(null);

  const handleUpdate = (field, value) => {
    onChange("homePage", { [field]: value });
  };

  const handleAddSlide = () => {
    const newSlide = {
      id: `hero-slide-${Date.now()}`,
      badge: "Trending Collection ⚡",
      badgeEn: "Trending Collection ⚡",
      headline: "Premium Lifestyle & Tech",
      headlineEn: "Premium Lifestyle & Tech",
      subheadline: "100% authentic products with nationwide Cash on Delivery.",
      subheadlineEn: "100% authentic products with nationwide Cash on Delivery.",
      ctaText: "Shop Now",
      ctaTextEn: "Shop Now",
      campaignText: "Special Offer",
      campaignTextEn: "Special Offer",
      bgImage: "",
      productImage: "",
      productId: products[0]?.id || "",
    };
    handleUpdate("heroSlides", [...heroSlides, newSlide]);
  };

  const handleUpdateSlide = (idx, field, value) => {
    const updated = heroSlides.map((s, i) => {
      if (i !== idx) return s;
      const next = { ...s, [field]: value };
      if (field === "headlineEn") next.headline = value;
      if (field === "subheadlineEn") next.subheadline = value;
      if (field === "badgeEn") next.badge = value;
      if (field === "ctaTextEn") next.ctaText = value;
      if (field === "campaignTextEn") next.campaignText = value;
      return next;
    });
    handleUpdate("heroSlides", updated);
  };

  const handleRemoveSlide = (idx) => {
    handleUpdate("heroSlides", heroSlides.filter((_, i) => i !== idx));
  };

  const handleUploadSlideImage = async (idx, field, file) => {
    if (!file) return;
    const key = `${idx}-${field}`;
    setUploadingSlot(key);
    try {
      const res = await apiClient.uploadProductImage(file);
      if (res?.url) {
        handleUpdateSlide(idx, field, res.url);
      }
    } catch (err) {
      console.error("Failed to upload hero slide image:", err);
    } finally {
      setUploadingSlot(null);
    }
  };

  return (
    <div className="space-y-6">
      {/* Header Info */}
      <div className="bg-gradient-to-r from-emerald-950/40 via-neutral-900 to-neutral-950 p-5 rounded-2xl border border-emerald-800/30">
        <h3 className="text-sm font-bold text-white flex items-center gap-2">
          <Home className="w-4 h-4 text-emerald-400" />
          <span>Front Page & Home Banner Customizer</span>
        </h3>
        <p className="text-xs text-neutral-400 mt-1">
          Customize the hero banner headlines, trust badges, and storefront sections for your homepage.
        </p>
      </div>

      {/* Hero Banner Headlines */}
      <div className="bg-neutral-900 p-5 rounded-2xl border border-neutral-800 space-y-4 text-xs">
        <h4 className="text-xs font-bold text-neutral-200 uppercase tracking-wider flex items-center gap-1.5">
          <Sparkles className="w-3.5 h-3.5 text-amber-400" />
          <span>Hero Banner Text</span>
        </h4>

        <div>
          <label className="block text-neutral-300 font-semibold mb-1">
            Main Headline (Hero Headline)
          </label>
          <input
            type="text"
            value={homePage.heroHeadline || ""}
            onChange={(e) => handleUpdate("heroHeadline", e.target.value)}
            placeholder="#1 Trusted Premium Gadget & Lifestyle Shop"
            className="w-full bg-neutral-950 border border-neutral-800 rounded-xl px-3 py-2 text-white text-xs focus:outline-none focus:border-emerald-500"
          />
        </div>

        <div>
          <label className="block text-neutral-300 font-semibold mb-1">
            Sub-headline (Hero Subheadline)
          </label>
          <textarea
            rows={2}
            value={homePage.heroSubheadline || ""}
            onChange={(e) => handleUpdate("heroSubheadline", e.target.value)}
            placeholder="100% authentic products, fast delivery, and hassle-free returns guaranteed."
            className="w-full bg-neutral-950 border border-neutral-800 rounded-xl px-3 py-2 text-white text-xs focus:outline-none focus:border-emerald-500"
          />
        </div>
      </div>

      {/* Dynamic Hero Banner Slides (Synced across all devices) */}
      <div className="bg-neutral-900 p-5 rounded-2xl border border-neutral-800 space-y-4 text-xs">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <div>
            <h4 className="text-xs font-bold text-white uppercase tracking-wider flex items-center gap-1.5">
              <ImageIcon className="w-3.5 h-3.5 text-emerald-400" />
              <span>Hero Banner Slides (Dynamic Across Devices)</span>
            </h4>
            <p className="text-[11px] text-neutral-400 mt-0.5">
              Add custom hero slides with background &amp; showcase images. Leave empty to use built-in default slides.
            </p>
          </div>
          <button
            type="button"
            onClick={handleAddSlide}
            className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-xs transition cursor-pointer"
          >
            <Plus className="w-3.5 h-3.5" />
            <span>Add Hero Slide</span>
          </button>
        </div>

        {heroSlides.length === 0 ? (
          <div className="p-4 rounded-xl bg-neutral-950 border border-dashed border-neutral-800 text-center text-neutral-400 text-[11px]">
            Using default built-in slides (Headline &amp; Subheadline above still override Slide #1). Click &ldquo;Add Hero Slide&rdquo; to fully customize slide images and links.
          </div>
        ) : (
          <div className="space-y-4">
            {heroSlides.map((slide, idx) => (
              <div key={slide.id || idx} className="p-4 rounded-xl bg-neutral-950 border border-neutral-800 space-y-3">
                <div className="flex items-center justify-between border-b border-neutral-800 pb-2">
                  <span className="font-bold text-emerald-400 text-xs">Slide #{idx + 1}</span>
                  <button
                    type="button"
                    onClick={() => handleRemoveSlide(idx)}
                    className="inline-flex items-center gap-1 text-rose-400 hover:text-rose-300 text-[11px] font-semibold cursor-pointer"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                    <span>Remove</span>
                  </button>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                  <div>
                    <label className="block text-neutral-400 mb-1">Badge Text</label>
                    <input
                      type="text"
                      value={slide.badgeEn || slide.badge || ""}
                      onChange={(e) => handleUpdateSlide(idx, "badgeEn", e.target.value)}
                      className="w-full bg-neutral-900 border border-neutral-800 rounded-lg px-2.5 py-1.5 text-white text-xs focus:outline-none focus:border-emerald-500"
                    />
                  </div>
                  <div>
                    <label className="block text-neutral-400 mb-1">Headline</label>
                    <input
                      type="text"
                      value={slide.headlineEn || slide.headline || ""}
                      onChange={(e) => handleUpdateSlide(idx, "headlineEn", e.target.value)}
                      className="w-full bg-neutral-900 border border-neutral-800 rounded-lg px-2.5 py-1.5 text-white text-xs focus:outline-none focus:border-emerald-500"
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-neutral-400 mb-1">Subheadline</label>
                  <input
                    type="text"
                    value={slide.subheadlineEn || slide.subheadline || ""}
                    onChange={(e) => handleUpdateSlide(idx, "subheadlineEn", e.target.value)}
                    className="w-full bg-neutral-900 border border-neutral-800 rounded-lg px-2.5 py-1.5 text-white text-xs focus:outline-none focus:border-emerald-500"
                  />
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                  <div>
                    <label className="block text-neutral-400 mb-1">Background Image URL</label>
                    <div className="flex gap-1.5">
                      <input
                        type="text"
                        value={slide.bgImage || ""}
                        onChange={(e) => handleUpdateSlide(idx, "bgImage", e.target.value)}
                        placeholder="https://..."
                        className="flex-1 bg-neutral-900 border border-neutral-800 rounded-lg px-2.5 py-1.5 text-white text-xs focus:outline-none focus:border-emerald-500"
                      />
                      <label className="px-2.5 py-1.5 rounded-lg bg-neutral-800 hover:bg-neutral-700 text-neutral-200 cursor-pointer flex items-center gap-1 shrink-0">
                        {uploadingSlot === `${idx}-bgImage` ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Upload className="w-3.5 h-3.5" />}
                        <input
                          type="file"
                          accept="image/*"
                          className="hidden"
                          onChange={(e) => {
                            const f = e.target.files?.[0];
                            if (f) handleUploadSlideImage(idx, "bgImage", f);
                            e.target.value = "";
                          }}
                        />
                      </label>
                    </div>
                  </div>
                  <div>
                    <label className="block text-neutral-400 mb-1">Showcase Product Image URL</label>
                    <div className="flex gap-1.5">
                      <input
                        type="text"
                        value={slide.productImage || ""}
                        onChange={(e) => handleUpdateSlide(idx, "productImage", e.target.value)}
                        placeholder="https://..."
                        className="flex-1 bg-neutral-900 border border-neutral-800 rounded-lg px-2.5 py-1.5 text-white text-xs focus:outline-none focus:border-emerald-500"
                      />
                      <label className="px-2.5 py-1.5 rounded-lg bg-neutral-800 hover:bg-neutral-700 text-neutral-200 cursor-pointer flex items-center gap-1 shrink-0">
                        {uploadingSlot === `${idx}-productImage` ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Upload className="w-3.5 h-3.5" />}
                        <input
                          type="file"
                          accept="image/*"
                          className="hidden"
                          onChange={(e) => {
                            const f = e.target.files?.[0];
                            if (f) handleUploadSlideImage(idx, "productImage", f);
                            e.target.value = "";
                          }}
                        />
                      </label>
                    </div>
                  </div>
                </div>

                {products.length > 0 && (
                  <div>
                    <label className="block text-neutral-400 mb-1">Linked Product</label>
                    <select
                      value={slide.productId || ""}
                      onChange={(e) => handleUpdateSlide(idx, "productId", e.target.value)}
                      className="w-full bg-neutral-900 border border-neutral-800 rounded-lg px-2.5 py-1.5 text-white text-xs focus:outline-none focus:border-emerald-500"
                    >
                      <option value="">-- Select Product --</option>
                      {products.map((p) => (
                        <option key={p.id} value={p.id}>{p.name}</option>
                      ))}
                    </select>
                  </div>
                )}
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Trust Badges */}
      <div className="bg-neutral-900 p-5 rounded-2xl border border-neutral-800 space-y-4 text-xs">
        <div className="flex items-center justify-between">
          <div>
            <h4 className="text-xs font-bold text-white uppercase tracking-wider flex items-center gap-1.5">
              <ShieldCheck className="w-3.5 h-3.5 text-emerald-400" />
              <span>Home Page Trust Badges</span>
            </h4>
            <p className="text-[11px] text-neutral-400 mt-0.5">
              3 core trust badges displayed under the hero banner
            </p>
          </div>
          <input
            type="checkbox"
            checked={homePage.showTrustBadges ?? true}
            onChange={(e) => handleUpdate("showTrustBadges", e.target.checked)}
            className="w-5 h-5 accent-emerald-500 cursor-pointer"
          />
        </div>

        {homePage.showTrustBadges && (
          <div className="grid grid-cols-1 md:grid-cols-3 gap-3 pt-2 border-t border-neutral-800/60">
            <div>
              <label className="block text-neutral-300 font-semibold mb-1">Badge 1</label>
              <input
                type="text"
                value={sanitizeText(homePage.trustBadge1, "") || ""}
                onChange={(e) => handleUpdate("trustBadge1", e.target.value)}
                placeholder="100% Authentic Products"
                className="w-full bg-neutral-950 border border-neutral-800 rounded-xl px-3 py-2 text-white text-xs focus:outline-none focus:border-emerald-500"
              />
            </div>
            <div>
              <label className="block text-neutral-300 font-semibold mb-1">Badge 2</label>
              <input
                type="text"
                value={sanitizeText(homePage.trustBadge2, "") || ""}
                onChange={(e) => handleUpdate("trustBadge2", e.target.value)}
                placeholder="7-Day Replacement"
                className="w-full bg-neutral-950 border border-neutral-800 rounded-xl px-3 py-2 text-white text-xs focus:outline-none focus:border-emerald-500"
              />
            </div>
            <div>
              <label className="block text-neutral-300 font-semibold mb-1">Badge 3</label>
              <input
                type="text"
                value={sanitizeText(homePage.trustBadge3, "") || ""}
                onChange={(e) => handleUpdate("trustBadge3", e.target.value)}
                placeholder="Cash on Delivery"
                className="w-full bg-neutral-950 border border-neutral-800 rounded-xl px-3 py-2 text-white text-xs focus:outline-none focus:border-emerald-500"
              />
            </div>
          </div>
        )}
      </div>

      {/* Visibility Toggles */}
      <div className="bg-neutral-900 p-5 rounded-2xl border border-neutral-800 space-y-4 text-xs">
        <h4 className="text-xs font-bold text-neutral-200 uppercase tracking-wider flex items-center gap-1.5">
          <Layers className="w-3.5 h-3.5 text-blue-400" />
          <span>Section Display Settings</span>
        </h4>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div className="p-3.5 rounded-xl bg-neutral-950 border border-neutral-800 flex items-center justify-between">
            <span className="text-white font-medium">Show Category Button Filter</span>
            <input
              type="checkbox"
              checked={homePage.showCategoryPills ?? true}
              onChange={(e) => handleUpdate("showCategoryPills", e.target.checked)}
              className="w-4 h-4 accent-emerald-500 cursor-pointer"
            />
          </div>

          <div className="p-3.5 rounded-xl bg-neutral-950 border border-neutral-800 flex items-center justify-between">
            <span className="text-white font-medium">Show Featured / Best Deals Section</span>
            <input
              type="checkbox"
              checked={homePage.showFeaturedSection ?? true}
              onChange={(e) => handleUpdate("showFeaturedSection", e.target.checked)}
              className="w-4 h-4 accent-emerald-500 cursor-pointer"
            />
          </div>

          <div className="p-3.5 rounded-xl bg-neutral-950 border border-neutral-800 flex items-center justify-between sm:col-span-2">
            <div>
              <span className="text-white font-medium block">Show 3D Customer Reviews Coverflow</span>
              <span className="text-[11px] text-neutral-400">3D animated reviews carousel on storefront and landing pages</span>
            </div>
            <input
              type="checkbox"
              checked={homePage.showReviews ?? true}
              onChange={(e) => handleUpdate("showReviews", e.target.checked)}
              className="w-4 h-4 accent-emerald-500 cursor-pointer"
            />
          </div>
        </div>

        {homePage.showReviews !== false && (
          <div className="pt-3 border-t border-neutral-800/80 space-y-3">
            <div>
              <label className="block text-neutral-300 font-semibold mb-1">
                Reviews Section Headline (Section Title)
              </label>
              <input
                type="text"
                value={sanitizeText(homePage.reviewsTitle, "") || ""}
                onChange={(e) => handleUpdate("reviewsTitle", e.target.value)}
                placeholder="Customer Experiences & Testimonials"
                className="w-full bg-neutral-950 border border-neutral-800 rounded-xl px-3 py-2 text-white text-xs focus:outline-none focus:border-emerald-500"
              />
            </div>
            <div>
              <label className="block text-neutral-300 font-semibold mb-1">
                Reviews Section Sub-headline (Subtitle)
              </label>
              <input
                type="text"
                value={sanitizeText(homePage.reviewsSubtitle, "") || ""}
                onChange={(e) => handleUpdate("reviewsSubtitle", e.target.value)}
                placeholder="Real verified reviews from satisfied customers across Bangladesh."
                className="w-full bg-neutral-950 border border-neutral-800 rounded-xl px-3 py-2 text-white text-xs focus:outline-none focus:border-emerald-500"
              />
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

