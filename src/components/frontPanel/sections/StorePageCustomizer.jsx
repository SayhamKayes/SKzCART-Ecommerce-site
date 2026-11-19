import React from "react";
import { Store, Grid, SlidersHorizontal, Info } from "lucide-react";

export const StorePageCustomizer = ({ config, onChange }) => {
  const storePage = config.storePage || {};

  const handleUpdate = (field, value) => {
    onChange("storePage", { [field]: value });
  };

  return (
    <div className="space-y-6">
      {/* Header Info */}
      <div className="bg-gradient-to-r from-emerald-950/40 via-neutral-900 to-neutral-950 p-5 rounded-2xl border border-emerald-800/30">
        <h3 className="text-sm font-bold text-white flex items-center gap-2">
          <Store className="w-4 h-4 text-emerald-400" />
          <span>Store Page & Catalog Grid Customizer</span>
        </h3>
        <p className="text-xs text-neutral-400 mt-1">
          Control grid columns, filters, and catalog layouts across the full store page.
        </p>
      </div>

      <div className="p-4 rounded-2xl bg-amber-950/20 border border-amber-800/30 text-xs text-amber-300 flex items-start gap-2.5">
        <Info className="w-4 h-4 text-amber-400 shrink-0 mt-0.5" />
        <div>
          <span className="font-bold text-amber-200">Note:</span> Store catalog grid and responsive layout options can be managed directly from here without changing any code.
        </div>
      </div>

      {/* Grid Settings */}
      <div className="bg-neutral-900 p-5 rounded-2xl border border-neutral-800 space-y-4 text-xs">
        <h4 className="text-xs font-bold text-neutral-200 uppercase tracking-wider flex items-center gap-1.5">
          <Grid className="w-3.5 h-3.5 text-emerald-400" />
          <span>Product Grid Layout</span>
        </h4>

        <div>
          <label className="block text-neutral-300 font-semibold mb-2">
            Desktop Columns per Row:
          </label>
          <div className="grid grid-cols-3 gap-3">
            {[2, 3, 4].map((cols) => (
              <button
                key={cols}
                type="button"
                onClick={() => handleUpdate("productsPerRow", cols)}
                className={`py-3 rounded-xl border text-center font-bold transition-all cursor-pointer ${
                  (storePage.productsPerRow || 3) === cols
                    ? "bg-emerald-600 text-white border-emerald-500 shadow-md"
                    : "bg-neutral-950 text-neutral-400 border-neutral-800 hover:bg-neutral-800 hover:text-white"
                }`}
              >
                {cols} Column Grid
              </button>
            ))}
          </div>
        </div>

        <div className="pt-2 border-t border-neutral-800/60 flex items-center justify-between">
          <div>
            <span className="text-white font-medium block">Enable Category Filter Sidebar</span>
            <span className="text-[11px] text-neutral-400">Show filtering sidebar on store catalog</span>
          </div>
          <input
            type="checkbox"
            checked={storePage.showFilters ?? true}
            onChange={(e) => handleUpdate("showFilters", e.target.checked)}
            className="w-4 h-4 accent-emerald-500 cursor-pointer"
          />
        </div>
      </div>
    </div>
  );
};
