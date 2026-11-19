import { Star, ShoppingBag, Zap, Sparkles, Tag, Flame, Truck } from "lucide-react";
import { formatBDT, toBengaliNumber } from '../../utils/bangladesh';
import { getProductTagInfo } from '../../utils/productTags';
import { useLanguage } from '../../Context/LanguageContext';
import { useThemeConfig } from '../frontPanel/FrontPanelContext';
import { getProductImage, handleProductImageError } from '../../utils/productImage';

const ProductCard = ({
  product,
  onSelect,
  onAddToCart,
  onQuickBuy
}) => {
  const { language, isEnglish, getProductName, getCategoryName } = useLanguage();
  const { themeConfig } = useThemeConfig();
  const pcTheme = themeConfig?.themesColors?.productCards || {};
  const discountPercent = Math.round(
    (product.regularPrice - product.price) / product.regularPrice * 100
  );
  const tagInfo = getProductTagInfo(product, isEnglish);
  const displayName = getProductName(product);
  const isOutOfStock = Boolean(product.isOutOfStock) || Number(product.stock) <= 0;

  return (
    <div
      style={{
        backgroundColor: pcTheme.cardBg || undefined,
        borderColor: pcTheme.cardBorderColor || undefined,
      }}
      className="group bg-white rounded-2xl border border-neutral-200/90 overflow-hidden hover:border-emerald-300 hover:shadow-md hover:-translate-y-1 transition-all duration-200 flex flex-col justify-between"
    >
      {/* Product Image Area */}
      <div
        className="relative bg-neutral-100 aspect-square overflow-hidden cursor-pointer"
        onClick={() => onSelect(product)}
      >
        <img
          src={getProductImage(product)}
          alt={displayName}
          className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
          loading="lazy"
          referrerPolicy="no-referrer"
          onError={handleProductImageError}
        />

        {/* Discount Badge */}
        {discountPercent > 0 && (
          <span
            style={{
              backgroundColor: pcTheme.discountBadgeBg || undefined,
              color: pcTheme.discountBadgeText || undefined,
            }}
            className="absolute top-2.5 left-2.5 bg-rose-600 text-white text-[11px] font-bold px-2 py-0.5 rounded-full shadow-xs z-10"
          >
            -{discountPercent}% {'OFF'}
          </span>
        )}

        {/* Top-Right Badges: Tag Icon + Low Stock Pill */}
        <div className="absolute top-2.5 right-2.5 flex items-center gap-1.5 z-10">
          {tagInfo && (
            <span
              title={tagInfo.label}
              className={`w-6 h-6 rounded-full flex items-center justify-center shadow-xs cursor-default transition-transform hover:scale-110 ${tagInfo.color}`}
            >
              {tagInfo.icon === 'zap' && <Zap className="w-3.5 h-3.5 fill-white text-white" />}
              {tagInfo.icon === 'sparkles' && <Sparkles className="w-3.5 h-3.5 fill-white text-white" />}
              {tagInfo.icon === 'tag' && <Tag className="w-3.5 h-3.5 text-white" />}
              {tagInfo.icon === 'flame' && <Flame className="w-3.5 h-3.5 fill-white text-white" />}
            </span>
          )}

          {(isOutOfStock || product.stock <= 10) && (
            <span className={`${isOutOfStock ? "bg-rose-600" : "bg-amber-500"} text-white text-[11px] font-semibold px-2 py-0.5 rounded-full shadow-xs whitespace-nowrap`}>
              {isOutOfStock
                ? ("Out of Stock")
                : (`Only ${product.stock} left!`)}
            </span>
          )}
        </div>

        {/* Quick Delivery Badge */}
        <div className="absolute bottom-2 left-2 right-2 bg-neutral-900/80 backdrop-blur-xs text-white text-[10px] py-1 px-2 rounded-lg flex items-center justify-between opacity-0 group-hover:opacity-100 transition-opacity">
          <span className="flex items-center gap-1">
            <Truck className="w-3 h-3 text-emerald-400" />
            <span>{'Cash on Delivery'}</span>
          </span>
          <span className="text-emerald-300 font-medium">
            {'Dhaka 24h'}
          </span>
        </div>
      </div>

      {/* Details Area */}
      <div className="p-3 sm:p-4 flex-1 flex flex-col justify-between">
        <div>
          {/* Category */}
          <span
            style={{ color: pcTheme.categoryLabelColor || undefined }}
            className="text-[10px] sm:text-[11px] font-semibold tracking-wider uppercase text-emerald-700"
          >
            {getCategoryName(product.category)}
          </span>

          {/* Title - ONLY one language, never both together */}
          <h3
            onClick={() => onSelect(product)}
            style={{ color: pcTheme.productNameColor || undefined }}
            className="text-xs sm:text-sm font-semibold text-neutral-900 line-clamp-2 mt-1 hover:text-emerald-700 cursor-pointer transition-colors leading-snug"
            title={displayName}
          >
            {displayName}
          </h3>

          {/* Rating */}
          <div className="flex items-center gap-1.5 mt-1.5 sm:mt-2">
            <div className="flex items-center text-amber-400">
              <Star className="w-3.5 h-3.5 fill-amber-400" />
            </div>
            <span
              style={{ color: pcTheme.ratingTextColor || undefined }}
              className="text-xs font-semibold text-neutral-800"
            >
              {product.rating}
            </span>
            <span className="text-xs text-neutral-400">
              ({product.reviewsCount} {product.reviewsCount === 1 ? 'review' : 'reviews'})
            </span>
          </div>
        </div>

        {/* Price & Action Buttons */}
        <div className="mt-3 sm:mt-4 pt-2.5 sm:pt-3 border-t border-neutral-100">
          <div className="flex items-baseline gap-2 mb-2.5 sm:mb-3">
            <span
              style={{ color: pcTheme.priceColor || undefined }}
              className="text-base sm:text-lg font-extrabold text-neutral-900"
            >
              {formatBDT(product.price, language)}
            </span>
            {product.regularPrice > product.price && (
              <span
                style={{ color: pcTheme.regularPriceColor || undefined }}
                className="text-xs text-neutral-400 line-through"
              >
                {formatBDT(product.regularPrice, language)}
              </span>
            )}
          </div>

          {/* Action Buttons: Stacked vertically on mobile (Add to Cart on top, Order Now below), 2-col grid on sm+ */}
          <div className="flex flex-col sm:grid sm:grid-cols-2 gap-1.5 sm:gap-2">
            <button
              type="button"
              disabled={isOutOfStock}
              onClick={() => !isOutOfStock && onAddToCart(product)}
              style={
                !isOutOfStock
                  ? {
                      backgroundColor: pcTheme.addToCartBg || undefined,
                      color: pcTheme.addToCartText || undefined,
                      borderColor: pcTheme.addToCartBorder || undefined,
                    }
                  : undefined
              }
              className={`w-full py-2 px-2 rounded-xl border text-xs font-semibold flex items-center justify-center gap-1.5 transition-colors cursor-pointer ${
                isOutOfStock
                  ? 'bg-neutral-100 text-neutral-400 border-neutral-200 cursor-not-allowed select-none'
                  : 'border-neutral-300 hover:border-neutral-400 hover:bg-neutral-50 text-neutral-800'
              }`}
            >
              <ShoppingBag
                style={!isOutOfStock ? { color: pcTheme.addToCartIconColor || undefined } : undefined}
                className="w-3.5 h-3.5 text-neutral-400 shrink-0"
              />
              <span className="truncate">{isOutOfStock ? ('Unavailable') : ('Add to Cart')}</span>
            </button>
            <button
              type="button"
              disabled={isOutOfStock}
              onClick={() => !isOutOfStock && onQuickBuy(product)}
              style={
                !isOutOfStock
                  ? {
                      backgroundColor: pcTheme.buyNowBg || undefined,
                      color: pcTheme.buyNowText || undefined,
                    }
                  : undefined
              }
              className={`w-full py-2 px-2 rounded-xl text-xs font-semibold flex items-center justify-center gap-1 transition-colors cursor-pointer ${
                isOutOfStock
                  ? 'bg-neutral-200 text-neutral-400 border border-neutral-300 cursor-not-allowed select-none'
                  : 'bg-emerald-600 hover:bg-emerald-700 active:bg-emerald-800 text-white shadow-xs shadow-emerald-600/30'
              }`}
            >
              {isOutOfStock ? (
                <span className="truncate">{'Out of Stock'}</span>
              ) : (
                <>
                  <Zap className="w-3.5 h-3.5 fill-current shrink-0" />
                  <span className="truncate">{'Order Now'}</span>
                </>
              )}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

export { ProductCard };
