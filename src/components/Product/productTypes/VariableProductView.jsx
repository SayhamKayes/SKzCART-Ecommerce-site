import React from 'react';
import { Layers, Check } from 'lucide-react';

export const VariableProductView = ({
  product,
  selectedVariant,
  onSelectVariant,
  isEnglish = false,
  formatBDT,
  language = 'bn',
}) => {
  if (!product || !product.variants || product.variants.length === 0) {
    return null;
  }

  const variantGroups = Array.isArray(product.variants) ? product.variants : [];

  return (
    <div className="space-y-3 mb-4">
      {variantGroups.map((variantGroup, gIdx) => {
        const attributeName = variantGroup.name || ('Option');
        const options = Array.isArray(variantGroup.options) ? variantGroup.options : [];
        if (options.length === 0) return null;

        const activeSelectedName = typeof selectedVariant === 'object'
          ? (selectedVariant?.name || '')
          : (selectedVariant || '');
        const groupHasSelected = options.some(
          (o) => (typeof o === 'object' ? o.name : o) === activeSelectedName
        );

        return (
          <div key={gIdx} className="p-3 bg-neutral-50/80 rounded-2xl border border-neutral-200/70">
            <div className="flex items-center justify-between mb-2">
              <label className="text-xs font-bold text-neutral-800 flex items-center gap-1.5">
                <Layers className="w-3.5 h-3.5 text-emerald-600" />
                <span>
                  {attributeName} {'Selection:'}
                </span>
              </label>
              {groupHasSelected && (
                <span className="text-[11px] font-bold text-emerald-700 bg-emerald-100/60 px-2 py-0.5 rounded-full">
                  {activeSelectedName}
                </span>
              )}
            </div>

            <div className="flex flex-wrap gap-2">
              {options.map((opt, idx) => {
                const optName = typeof opt === 'object' ? (opt.name || opt.label || '') : opt;
                const optImage = typeof opt === 'object' ? opt.image : (product.images && product.images[idx] ? product.images[idx] : null);
                const optPrice = typeof opt === 'object' ? opt.price : null;
                const isSelected = activeSelectedName === optName;

                return (
                  <button
                    key={idx}
                    type="button"
                    onClick={() => onSelectVariant(opt, optImage, optPrice)}
                    className={`group flex items-center gap-2 px-3 py-1.5 rounded-xl border text-xs font-semibold transition-all cursor-pointer ${
                      isSelected
                        ? 'bg-neutral-900 text-white border-neutral-900 shadow-sm scale-[1.02]'
                        : 'bg-white text-neutral-700 border-neutral-300 hover:border-emerald-500 hover:bg-neutral-50'
                    }`}
                  >
                    {/* Variant Mini Thumbnail (if image available) */}
                    {optImage && (
                      <span className="w-5 h-5 rounded-md overflow-hidden border border-neutral-200/80 shrink-0 inline-block bg-neutral-100">
                        <img src={optImage} alt={optName} className="w-full h-full object-cover" />
                      </span>
                    )}

                    <span>{optName}</span>

                    {/* Show price difference if this variant has specific price */}
                    {optPrice && optPrice !== product.price && formatBDT && (
                      <span className={`text-[10px] px-1.5 py-0.5 rounded-md font-bold ${
                        isSelected ? 'bg-neutral-800 text-amber-300' : 'bg-neutral-100 text-emerald-700'
                      }`}>
                        ৳{optPrice}
                      </span>
                    )}

                    {isSelected && (
                      <Check className="w-3.5 h-3.5 text-emerald-400 shrink-0 ml-0.5" />
                    )}
                  </button>
                );
              })}
            </div>
          </div>
        );
      })}
    </div>
  );
};

export default VariableProductView;
