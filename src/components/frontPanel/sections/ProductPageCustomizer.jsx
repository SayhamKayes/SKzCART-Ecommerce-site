import React from "react";
import { Package, ShieldCheck, Clock, Truck, Zap, ShoppingCart } from "lucide-react";
import { sanitizeText } from "../../../utils/textSanitizer";

export const ProductPageCustomizer = ({ config, onChange }) => {
  const productPage = config.productPage || {};

  const handleUpdate = (field, value) => {
    onChange("productPage", { [field]: value });
  };

  return (
    <div className="space-y-6">
      {/* Header Info */}
      <div className="bg-gradient-to-r from-emerald-950/40 via-neutral-900 to-neutral-950 p-5 rounded-2xl border border-emerald-800/30">
        <h3 className="text-sm font-bold text-white flex items-center gap-2">
          <Package className="w-4 h-4 text-emerald-400" />
          <span>Product Page & Details Customizer</span>
        </h3>
        <p className="text-xs text-neutral-400 mt-1">
          Manage stock scarcity alerts, warranty boxes, delivery timelines, and CTA button text.
        </p>
      </div>

      {/* Stock Urgency Alert */}
      <div className="bg-neutral-900 p-5 rounded-2xl border border-neutral-800 space-y-4 text-xs">
        <div className="flex items-center justify-between">
          <div>
            <h4 className="text-xs font-bold text-white uppercase tracking-wider flex items-center gap-1.5">
              <Zap className="w-3.5 h-3.5 text-amber-400" />
              <span>Stock Alert & Urgency Badge</span>
            </h4>
            <p className="text-[11px] text-neutral-400 mt-0.5">
              Encourage visitors to purchase quickly when stock is low
            </p>
          </div>
          <input
            type="checkbox"
            checked={productPage.showUrgencyBadge ?? true}
            onChange={(e) => handleUpdate("showUrgencyBadge", e.target.checked)}
            className="w-5 h-5 accent-emerald-500 cursor-pointer"
          />
        </div>

        {productPage.showUrgencyBadge && (
          <div className="space-y-3 pt-2 border-t border-neutral-800/60">
            <div>
              <label className="block text-neutral-300 font-semibold mb-1">
                Urgency Notice Message
              </label>
              <input
                type="text"
                value={sanitizeText(productPage.urgencyText) || ""}
                onChange={(e) => handleUpdate("urgencyText", e.target.value)}
                placeholder="🔥 Very limited stock remaining! Order now."
                className="w-full bg-neutral-950 border border-neutral-800 rounded-xl px-3 py-2 text-white text-xs focus:outline-none focus:border-emerald-500"
              />
            </div>
          </div>
        )}
      </div>

      {/* Guarantee & Return Box */}
      <div className="bg-neutral-900 p-5 rounded-2xl border border-neutral-800 space-y-4 text-xs">
        <div className="flex items-center justify-between">
          <div>
            <h4 className="text-xs font-bold text-white uppercase tracking-wider flex items-center gap-1.5">
              <ShieldCheck className="w-3.5 h-3.5 text-emerald-400" />
              <span>Warranty & Return Guarantee Box</span>
            </h4>
            <p className="text-[11px] text-neutral-400 mt-0.5">
              Display authentic product and 7-day return guarantee box below the main CTA
            </p>
          </div>
          <input
            type="checkbox"
            checked={productPage.showGuaranteeBox ?? true}
            onChange={(e) => handleUpdate("showGuaranteeBox", e.target.checked)}
            className="w-5 h-5 accent-emerald-500 cursor-pointer"
          />
        </div>

        {productPage.showGuaranteeBox && (
          <div className="pt-2 border-t border-neutral-800/60 text-[11px] text-emerald-300/90">
            Trust &amp; Guarantee badge icons and text are managed dynamically from <strong>Admin Panel → Product Editorial → Summary &amp; Quick-View Badges</strong>.
          </div>
        )}
      </div>

      {/* Button Texts */}
      <div className="bg-neutral-900 p-5 rounded-2xl border border-neutral-800 space-y-4 text-xs">
        <h4 className="text-xs font-bold text-neutral-200 uppercase tracking-wider flex items-center gap-1.5">
          <ShoppingCart className="w-3.5 h-3.5 text-emerald-400" />
          <span>Action Button Text</span>
        </h4>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <label className="block text-neutral-300 font-semibold mb-1">
              Quick Buy Button Text (Quick Buy)
            </label>
            <input
              type="text"
              value={sanitizeText(productPage.quickBuyBtnText) || ""}
              onChange={(e) => handleUpdate("quickBuyBtnText", e.target.value)}
              placeholder="Order Now"
              className="w-full bg-neutral-950 border border-neutral-800 rounded-xl px-3 py-2 text-white text-xs focus:outline-none focus:border-emerald-500"
            />
          </div>
          <div>
            <label className="block text-neutral-300 font-semibold mb-1">
              Cart Button Text (Add to Cart)
            </label>
            <input
              type="text"
              value={sanitizeText(productPage.addToCartBtnText) || ""}
              onChange={(e) => handleUpdate("addToCartBtnText", e.target.value)}
              placeholder="Add to Cart"
              className="w-full bg-neutral-950 border border-neutral-800 rounded-xl px-3 py-2 text-white text-xs focus:outline-none focus:border-emerald-500"
            />
          </div>
        </div>
      </div>
    </div>
  );
};
