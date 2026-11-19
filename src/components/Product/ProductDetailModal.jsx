import { useState, useEffect, useRef, useMemo } from "react";
import {
  X,
  Star,
  ShieldCheck,
  Truck,
  RotateCcw,
  Zap,
  Sparkles,
  Tag,
  Flame,
  Clock,
  ShoppingBag,
  CheckCircle2,
  AlertCircle
} from "lucide-react";
import { formatBDT, toBengaliNumber } from '../../utils/bangladesh';
import { getProductTagInfo, hasLimitedOfferBadge } from '../../utils/productTags';
import { useLanguage } from '../../Context/LanguageContext';
import { useThemeConfig } from '../frontPanel/FrontPanelContext';
import { marketingTracker } from '../../services/marketing';
import { StandardProductView, VariableProductView } from './productTypes';
import { sanitizeText } from '../../utils/textSanitizer';
import { DEFAULT_PRODUCT_PLACEHOLDER } from '../../utils/productImage';
import { renderTrustBadgeIcon, resolveEditorialConfig } from '../../utils/productEditorial';

// Helper for bold and italic markdown parsing
const renderFormattedText = (text) => {
  if (!text) return null;
  const parts = String(text).split(/(\*\*[^*]+\*\*|\*[^*]+\*)/g);
  return parts.map((part, i) => {
    if (part.startsWith('**') && part.endsWith('**')) {
      return <strong key={i} className="font-bold text-neutral-900">{part.slice(2, -2)}</strong>;
    }
    if (part.startsWith('*') && part.endsWith('*')) {
      return <em key={i} className="italic text-neutral-800">{part.slice(1, -1)}</em>;
    }
    return part;
  });
};

const ProductDetailModal = ({
  product,
  onClose,
  onAddToCart,
  onQuickBuy,
  onNavigateToLanding
}) => {
  if (!product) return null;
  const { language, isEnglish, getProductName, getCategoryName } = useLanguage();
  const { themeConfig } = useThemeConfig();
  const prodConfig = resolveEditorialConfig(themeConfig);
  const activeTrustBadges = (prodConfig.trustBadges || []).filter((b) => b && b.enabled !== false && b.text);
  // Compute all product images including any variation images
  const allImages = useMemo(() => {
    const base = Array.isArray(product.images) && product.images.length > 0
      ? [...product.images]
      : (product.image ? [product.image] : [DEFAULT_PRODUCT_PLACEHOLDER]);
    if (product.productType === 'variable' && Array.isArray(product.variants)) {
      for (const vGrp of product.variants) {
        if (Array.isArray(vGrp?.options)) {
          for (const opt of vGrp.options) {
            const vImg = typeof opt === 'object' ? opt.image : null;
            if (vImg && typeof vImg === 'string' && vImg.trim() && !base.includes(vImg.trim())) {
              base.push(vImg.trim());
            }
          }
        }
      }
    }
    return base;
  }, [product.images, product.image, product.variants, product.productType]);

  const isVariableProduct = product.productType === 'variable' && Array.isArray(product.variants) && product.variants.length > 0 && product.variants[0]?.options?.length > 0;
  const primaryImg = (allImages && allImages[0]) || product.image || DEFAULT_PRODUCT_PLACEHOLDER;

  // Active state: default display image, no variation selected initially
  const [selectedImage, setSelectedImage] = useState(primaryImg);
  const [selectedVariant, setSelectedVariant] = useState(null);
  const [selectedVariantObj, setSelectedVariantObj] = useState(null);

  const activeStock = selectedVariantObj?.stock !== undefined ? selectedVariantObj.stock : product.stock;
  const isOutOfStock = Boolean(product.isOutOfStock) || (activeStock !== undefined && Number(activeStock) <= 0);

  // Desktop hover zoom handler (matches CampaignLandingPage)
  const [zoomStyle, setZoomStyle] = useState({
    transformOrigin: 'center center',
    transform: 'scale(1)',
    transition: 'transform 0.25s ease-out'
  });
  const imageContainerRef = useRef(null);

  const handleMouseMove = (e) => {
    if (!imageContainerRef.current) return;
    const { left, top, width, height } = imageContainerRef.current.getBoundingClientRect();
    const x = Math.max(0, Math.min(100, ((e.clientX - left) / width) * 100));
    const y = Math.max(0, Math.min(100, ((e.clientY - top) / height) * 100));

    setZoomStyle({
      transformOrigin: `${x}% ${y}%`,
      transform: 'scale(1.9)',
      transition: 'transform 0.1s ease-out'
    });
  };

  const handleMouseLeave = () => {
    setZoomStyle({
      transformOrigin: 'center center',
      transform: 'scale(1)',
      transition: 'transform 0.25s ease-out'
    });
  };

  // Toggle selection: clicking a selected variant deselects and resets to default image
  const handleSelectVariant = (opt, optImage, optPrice) => {
    const optName = typeof opt === 'object' ? (opt.name || opt.label || '') : opt;
    const isCurrentlySelected = (selectedVariant === optName);

    if (isCurrentlySelected) {
      // Toggle off / deselect
      setSelectedVariant(null);
      setSelectedVariantObj(null);
      setSelectedImage(primaryImg);
      setZoomStyle({
        transformOrigin: 'center center',
        transform: 'scale(1)',
        transition: 'transform 0.25s ease-out'
      });
      return;
    }

    setSelectedVariant(optName);
    setSelectedVariantObj(typeof opt === 'object' ? opt : { name: optName, image: optImage, price: optPrice });

    const targetImg = optImage || (typeof opt === 'object' && opt.image);
    if (targetImg) {
      setSelectedImage(targetImg);
      setZoomStyle({
        transformOrigin: 'center center',
        transform: 'scale(1)',
        transition: 'transform 0.25s ease-out'
      });
    }
  };

  const lastModalProdIdRef = useRef(null);

  useEffect(() => {
    if (product && lastModalProdIdRef.current !== product.id) {
      lastModalProdIdRef.current = product.id;

      // Start with no variant selected
      setSelectedVariant(null);
      setSelectedVariantObj(null);

      // ALWAYS retain the product's primary display image on initial load!
      const initialImg = (allImages && allImages[0]) || product.image || "";
      setSelectedImage(initialImg);
      setZoomStyle({
        transformOrigin: 'center center',
        transform: 'scale(1)',
        transition: 'transform 0.25s ease-out'
      });
      marketingTracker.track('ViewContent', {
        productId: product.id,
        name: product.name,
        value: product.price,
        currency: 'BDT',
        category: product.category,
      }, {
        productId: product.id
      });
    }
  }, [product?.id, product?.productType, allImages]);

  const activePrice = (selectedVariantObj && typeof selectedVariantObj === 'object' && selectedVariantObj.price !== undefined && selectedVariantObj.price !== null)
    ? selectedVariantObj.price
    : product.price;
  const activeRegularPrice = (selectedVariantObj && typeof selectedVariantObj === 'object' && selectedVariantObj.regularPrice !== undefined && selectedVariantObj.regularPrice !== null)
    ? selectedVariantObj.regularPrice
    : (product.regularPrice || product.price);
  const discountPercent = Math.round(
    ((activeRegularPrice || 1) - activePrice) / (activeRegularPrice || 1) * 100
  );
  const tagInfo = getProductTagInfo(product, isEnglish);
  const displayName = getProductName(product);

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70 backdrop-blur-xs animate-in fade-in duration-200">
      <div
        className="bg-white rounded-3xl max-w-3xl w-full overflow-hidden shadow-2xl relative max-h-[90vh] flex flex-col md:flex-row"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Close Button */}
        <button
          onClick={onClose}
          aria-label="Close"
          className="group absolute top-3 right-3 sm:top-4 sm:right-4 z-20 w-11 h-11 sm:w-10 sm:h-10 rounded-full bg-neutral-100 hover:bg-neutral-200 text-neutral-600 hover:text-neutral-900 flex items-center justify-center shadow-md backdrop-blur-xs transition-all duration-200 cursor-pointer"
        >
          <X className="w-5 h-5 sm:w-4 sm:h-4 group-hover:rotate-90 transition-transform duration-200" />
        </button>

        {/* Left: Gallery & Key Features */}
        <div className="md:w-1/2 p-6 bg-neutral-50 flex flex-col justify-between overflow-y-auto">
          <div>
            <div
              ref={imageContainerRef}
              onMouseMove={handleMouseMove}
              onMouseLeave={handleMouseLeave}
              className="aspect-square rounded-2xl overflow-hidden bg-white border border-neutral-200 mb-3 relative cursor-crosshair group shadow-xs"
            >
              <img
                src={selectedImage}
                alt={displayName}
                style={zoomStyle}
                className="w-full h-full object-cover select-none pointer-events-none"
              />
              {discountPercent > 0 && (
                <span className="absolute top-3 left-3 bg-rose-600 text-white text-xs font-bold px-2.5 py-1 rounded-full shadow-xs pointer-events-none">
                  -{discountPercent}% {'OFF'}
                </span>
              )}
              {tagInfo && (
                <span
                  className={`absolute top-3 right-3 text-white text-xs font-bold px-2.5 py-1 rounded-full shadow-xs flex items-center gap-1 ${tagInfo.color} pointer-events-none`}
                >
                  {tagInfo.icon === 'zap' && <Zap className="w-3.5 h-3.5 fill-white" />}
                  {tagInfo.icon === 'sparkles' && <Sparkles className="w-3.5 h-3.5 fill-white" />}
                  {tagInfo.icon === 'tag' && <Tag className="w-3.5 h-3.5" />}
                  {tagInfo.icon === 'flame' && <Flame className="w-3.5 h-3.5 fill-white" />}
                  {tagInfo.icon === 'clock' && <Clock className="w-3.5 h-3.5" />}
                  <span>{tagInfo.label}</span>
                </span>
              )}
              {/* Zoom hint overlay */}
              <div className="absolute bottom-2 inset-x-2 bg-neutral-950/70 text-white text-[10px] py-1 px-2 rounded-lg text-center backdrop-blur-xs opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none">
                {"🔍 Move mouse to zoom in for details (Zoom)"}
              </div>
            </div>

            {/* Thumbnails */}
            {allImages.length > 1 && (
              <div className="flex gap-2 overflow-x-auto pb-1 mb-2">
                {allImages.map((img, i) => (
                  <button
                    key={i}
                    onClick={() => {
                      setSelectedImage(img);
                      setZoomStyle({
                        transformOrigin: 'center center',
                        transform: 'scale(1)',
                        transition: 'transform 0.25s ease-out'
                      });
                      if (isVariableProduct && Array.isArray(product.variants)) {
                        let matched = false;
                        for (const vGrp of product.variants) {
                          if (Array.isArray(vGrp?.options)) {
                            const matchedOpt = vGrp.options.find((o, idx) => {
                              const oImg = typeof o === 'object' ? o.image : product.images?.[idx];
                              return oImg === img;
                            });
                            if (matchedOpt) {
                              const optName = typeof matchedOpt === 'object' ? matchedOpt.name : matchedOpt;
                              setSelectedVariant(optName);
                              setSelectedVariantObj(matchedOpt);
                              matched = true;
                              break;
                            }
                          }
                        }
                        if (!matched) {
                          // Clicked an image that does not belong to a specific variant (e.g. default primary image)
                          setSelectedVariant(null);
                          setSelectedVariantObj(null);
                        }
                      }
                    }}
                    className={`w-16 h-16 rounded-xl overflow-hidden border-2 transition-all shrink-0 cursor-pointer ${
                      selectedImage === img
                        ? "border-emerald-600 ring-2 ring-emerald-500/60 shadow-md scale-95 opacity-100"
                        : "border-neutral-200 opacity-60 hover:opacity-100"
                    }`}
                  >
                    <img src={img} alt="" className="w-full h-full object-cover" />
                  </button>
                ))}
              </div>
            )}
          </div>

          {/* Dynamic Trust & Guarantee Badges (Synced with Product Editorial & Order Summary) */}
          {prodConfig.showTrustBadgesBox !== false && prodConfig.showGuaranteeBox !== false && activeTrustBadges.length > 0 && (
            <div className="mt-4 pt-4 border-t border-neutral-200/80 space-y-2 text-xs text-neutral-600">
              {activeTrustBadges.map((badge, idx) => (
                <div key={badge.id || idx} className="flex items-center gap-2">
                  {renderTrustBadgeIcon(badge.icon, badge.color, "w-4 h-4")}
                  <span>{sanitizeText(badge.text)}</span>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Right: Info & Buy */}
        <div className="md:w-1/2 p-6 flex flex-col justify-between overflow-y-auto">
          <div>
            {/* Category & SKU */}
            <div className="flex items-center justify-between text-xs text-neutral-500 mb-2">
              <span className="font-semibold text-emerald-700 uppercase tracking-wider">
                {getCategoryName(product.category)}
              </span>
              <span>SKU: {selectedVariantObj?.sku || product.sku}</span>
            </div>

            {/* Title - ONLY ONE language, never both together */}
            <h2 className="text-xl font-bold text-neutral-900 leading-snug">
              {displayName}
            </h2>

            {/* Rating & Stock */}
            <div className="flex items-center gap-4 mt-3 pb-4 border-b border-neutral-100 text-xs">
              <div className="flex items-center gap-1 text-amber-500 font-semibold">
                <Star className="w-4 h-4 fill-amber-400" />
                <span>{product.rating}</span>
                <span className="text-neutral-400">
                  ({product.reviewsCount} {product.reviewsCount === 1 ? 'customer review' : 'customer reviews'})
                </span>
              </div>
              <span className="text-neutral-300">|</span>
              <span className={`font-semibold ${!isOutOfStock && activeStock > 5 ? "text-emerald-700" : "text-rose-600"}`}>
                {!isOutOfStock && activeStock > 0
                  ? (`In Stock (${activeStock} available)`)
                  : ('Out of Stock')}
              </span>
            </div>

            {/* Price */}
            <div className="my-4">
              <div className="flex items-baseline gap-3">
                <span className="text-2xl font-black text-neutral-900">
                  {formatBDT(activePrice, language)}
                </span>
                {activeRegularPrice > activePrice && (
                  <span className="text-sm text-neutral-400 line-through">
                    {formatBDT(activeRegularPrice, language)}
                  </span>
                )}
                {discountPercent > 0 && (
                  <span className="text-xs font-bold text-rose-600 bg-rose-50 px-2 py-0.5 rounded-md">
                    {'You save '}
                    {formatBDT(activeRegularPrice - activePrice, language)}!
                  </span>
                )}
              </div>
            </div>

            {/* Dynamic Product Type View: Variable only (Standard products do not display any badge) */}
            {isVariableProduct && (
              <VariableProductView
                product={product}
                selectedVariant={selectedVariant}
                onSelectVariant={handleSelectVariant}
                isEnglish={isEnglish}
                formatBDT={formatBDT}
                language={language}
              />
            )}

            {/* Key Features (Max 3) */}
            {(() => {
              const rawFeats = product.keyFeatures || product.features;
              const featsList = Array.isArray(rawFeats)
                ? rawFeats
                : typeof rawFeats === 'string'
                ? rawFeats.split('\n').map(s => s.trim().replace(/^[•\-\*✓]\s*/, '')).filter(Boolean)
                : [];
              if (!featsList || featsList.length === 0) return null;
              const displayFeats = featsList.slice(0, 3);
              return (
                <div className="mb-4 p-3.5 bg-emerald-50/50 rounded-2xl border border-emerald-100/70 shadow-2xs">
                  <span className="text-xs font-bold text-neutral-900 flex items-center gap-1.5">
                    <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600 shrink-0" />
                    <span>{'Key Features:'}</span>
                  </span>
                  <div className="space-y-1.5 mt-2">
                    {displayFeats.map((feat, i) => (
                      <div key={i} className="flex items-start gap-2 text-xs text-neutral-700 leading-snug">
                        <span className="text-emerald-600 font-bold text-sm leading-none shrink-0">•</span>
                        <span>{renderFormattedText(feat)}</span>
                      </div>
                    ))}
                  </div>
                </div>
              );
            })()}
          </div>

          {/* Bottom Actions */}
          <div className="pt-4 border-t border-neutral-100 space-y-2">
            {isOutOfStock ? (
              <div className="p-3 rounded-xl bg-rose-50 border border-rose-200 text-rose-800 text-xs font-bold flex items-center gap-2">
                <AlertCircle className="w-4 h-4 text-rose-600 shrink-0" />
                <span>{"Sorry, this product is currently unavailable (Out of Stock)."}</span>
              </div>
            ) : (
              hasLimitedOfferBadge(product) && prodConfig.showUrgencyBadge !== false && (
                <div className="p-2.5 rounded-xl bg-amber-50 border border-amber-200 text-amber-900 text-xs font-bold flex items-center gap-2 animate-pulse">
                  <Flame className="w-4 h-4 text-amber-600 shrink-0" />
                  <span>{sanitizeText(prodConfig.urgencyText, '🔥 Very limited stock remaining! Complete your order quickly.')}</span>
                </div>
              )
            )}

            <button
              disabled={isOutOfStock}
              onClick={() => !isOutOfStock && onQuickBuy(product, selectedVariant, selectedVariantObj)}
              className={`w-full py-3.5 px-4 rounded-xl font-bold text-sm flex items-center justify-center gap-2 transition-all ${
                isOutOfStock
                  ? "bg-neutral-200 text-neutral-400 border border-neutral-300 cursor-not-allowed select-none"
                  : "bg-emerald-600 hover:bg-emerald-700 active:bg-emerald-800 text-white shadow-md shadow-emerald-600/30 hover:scale-[1.01] cursor-pointer"
              }`}
            >
              {isOutOfStock ? (
                <span>{"Out of Stock"}</span>
              ) : (
                <>
                  <Zap className="w-4 h-4 fill-white" />
                  <span>{sanitizeText(prodConfig.quickBuyBtnText, 'Order Now')}</span>
                </>
              )}
            </button>

            <button
              disabled={isOutOfStock}
              onClick={() => !isOutOfStock && onAddToCart(product, selectedVariant, selectedVariantObj)}
              className={`w-full py-2.5 px-4 rounded-xl font-semibold text-xs flex items-center justify-center gap-2 transition-colors ${
                isOutOfStock
                  ? "bg-neutral-100 text-neutral-400 border border-neutral-200 cursor-not-allowed select-none"
                  : "border border-neutral-300 hover:bg-neutral-50 text-neutral-800 cursor-pointer"
              }`}
            >
              <ShoppingBag className="w-4 h-4 text-neutral-400" />
              <span>{isOutOfStock ? ("Unavailable") : sanitizeText(prodConfig.addToCartBtnText, 'Add to Cart')}</span>
            </button>

            {onNavigateToLanding && (
              <button
                onClick={() => onNavigateToLanding(product)}
                className="w-full py-2.5 px-4 rounded-xl bg-orange-100/50 border border-orange-200 hover:bg-orange-100 text-orange-700 font-bold text-xs flex items-center justify-center gap-2 transition-colors cursor-pointer"
              >
                <span>{'Show More Details'}</span>
              </button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

export { ProductDetailModal };
