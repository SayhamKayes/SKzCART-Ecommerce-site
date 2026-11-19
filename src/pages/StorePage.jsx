import React, { useRef } from 'react';
import {
  RotateCcw,
  Search,
  ChevronLeft,
  ChevronRight,
  ArrowRight,
} from 'lucide-react';
import { HeroSection } from '../components/hero';
import { ProductCard } from '../components/Product/ProductCard';
import { Footer } from '../components/Footer';
import { CustomerReviewsCoverflow } from '../components/Reviews/CustomerReviewsCoverflow';
import { useLanguage } from '../Context/LanguageContext';
import { useThemeConfig } from '../components/frontPanel/FrontPanelContext';
import { sanitizeText } from '../utils/textSanitizer';

export const StorePage = ({
  products,
  filteredProducts,
  categories,
  selectedCategory,
  setSelectedCategory,
  onAddToCart,
  onQuickBuy,
  onSelectProduct,
  onNavigateToLanding,
  onNavigateToView,
  isLoading = false,
  onClearFilters,
}) => {
  const { isEnglish, t, getCategoryName } = useLanguage();
  const { themeConfig } = useThemeConfig();
  const homeConfig = themeConfig?.homePage || {};
  const pcTheme = themeConfig?.themesColors?.productCards || {};
  const globalT = themeConfig?.themesColors?.globalTheme || {};
  const categoryScrollRef = useRef(null);

  // Limit landing page to strictly 2 rows (4 cols x 2 rows = 8 products)
  const LANDING_MAX_PRODUCTS = 8;
  const displayedProducts = (filteredProducts || []).slice(0, LANDING_MAX_PRODUCTS);

  const scrollCategories = (direction) => {
    if (categoryScrollRef.current) {
      categoryScrollRef.current.scrollBy({
        left: direction === 'left' ? -220 : 220,
        behavior: 'smooth',
      });
    }
  };

  return (
    <div className="flex-1 flex flex-col w-full">
      {/* 100vh Frameless & Borderless Modern Hero Section */}
      <HeroSection
        products={products}
        onNavigateToLanding={onNavigateToLanding}
        onNavigateToView={onNavigateToView}
        onSelectProduct={onSelectProduct}
      />

      <main className="flex-1 max-w-7xl w-full mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-8">

        {/* Category Filter Pills - with Left & Right Arrow Navigation & Hidden Native Scrollbar */}
        <div className="relative flex items-center group/cats w-full">
          {/* Left Arrow Button */}
          <button
            type="button"
            onClick={() => scrollCategories('left')}
            className="flex items-center justify-center w-8 h-8 rounded-full bg-white border border-neutral-200/90 shadow-xs text-neutral-600 hover:text-neutral-900 hover:bg-neutral-50 active:scale-95 shrink-0 mr-1.5 transition-all z-10 cursor-pointer"
            aria-label="Scroll categories left"
            title={"Scroll Left"}
          >
            <ChevronLeft className="w-4 h-4" />
          </button>

          {/* Scrollable Container without visible native scrollbar */}
          <div
            ref={categoryScrollRef}
            className="flex items-center gap-2 overflow-x-auto no-scrollbar py-1 text-xs font-semibold scroll-smooth flex-1"
            style={{ scrollbarWidth: 'none', msOverflowStyle: 'none' }}
          >
            {categories.map((cat) => (
              <button
                key={cat}
                onClick={() => setSelectedCategory(cat)}
                style={
                  selectedCategory === cat
                    ? {
                        backgroundColor: pcTheme.categoryPillActiveBg || undefined,
                        color: pcTheme.categoryPillActiveText || undefined,
                      }
                    : {
                        backgroundColor: pcTheme.categoryPillBg || undefined,
                        color: pcTheme.categoryPillText || undefined,
                      }
                }
                className={`px-4 py-2 rounded-2xl whitespace-nowrap transition-all cursor-pointer ${
                  selectedCategory === cat
                    ? 'bg-neutral-900 text-white shadow-xs'
                    : 'bg-white text-neutral-600 hover:bg-neutral-200 border border-neutral-200'
                }`}
              >
                {cat === 'ALL' ? ('🔥 All Products') : getCategoryName(cat)}
              </button>
            ))}
          </div>

          {/* Right Arrow Button */}
          <button
            type="button"
            onClick={() => scrollCategories('right')}
            className="flex items-center justify-center w-8 h-8 rounded-full bg-white border border-neutral-200/90 shadow-xs text-neutral-600 hover:text-neutral-900 hover:bg-neutral-50 active:scale-95 shrink-0 ml-1.5 transition-all z-10 cursor-pointer"
            aria-label="Scroll categories right"
            title={"Scroll Right"}
          >
            <ChevronRight className="w-4 h-4" />
          </button>
        </div>

        {/* Product Grid / Trending Collection - Strictly 2 Rows */}
        <section id="products-grid" className="space-y-4 scroll-mt-44 relative">
          <div id="trending-collection" className="absolute -top-36 left-0 pointer-events-none" />
          <div className="flex items-center justify-between">
            <h2
              style={{ color: globalT.headingColor || undefined }}
              className="text-xl font-bold text-neutral-900"
            >
              {selectedCategory === 'ALL'
                ? ('Trending Collection')
                : getCategoryName(selectedCategory)}
            </h2>
          </div>

          {/* Skeletons when initial loading and no products yet */}
          {isLoading && (!products || products.length === 0) ? (
            <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-5">
              {Array.from({ length: 8 }).map((_, i) => (
                <div
                  key={`skeleton-${i}`}
                  className="bg-white rounded-2xl p-3 border border-neutral-200/80 shadow-xs animate-pulse flex flex-col space-y-3"
                >
                  <div className="w-full aspect-square bg-neutral-200 rounded-xl" />
                  <div className="space-y-2 flex-1 pt-1">
                    <div className="h-3 bg-neutral-200 rounded-full w-1/3" />
                    <div className="h-4 bg-neutral-200 rounded-full w-4/5" />
                    <div className="h-4 bg-neutral-200 rounded-full w-2/3" />
                  </div>
                  <div className="pt-2 flex items-center justify-between border-t border-neutral-100">
                    <div className="h-5 bg-neutral-200 rounded-full w-1/3" />
                    <div className="h-8 bg-neutral-200 rounded-xl w-1/2" />
                  </div>
                </div>
              ))}
            </div>
          ) : filteredProducts.length === 0 ? (
            /* Clean Empty State when search/category has no matches */
            <div className="bg-white rounded-3xl border border-neutral-200/80 p-8 sm:p-12 text-center space-y-4 max-w-lg mx-auto shadow-xs">
              <div className="w-16 h-16 rounded-2xl bg-neutral-100 text-neutral-400 mx-auto flex items-center justify-center">
                <Search className="w-8 h-8 text-neutral-400" />
              </div>
              <div className="space-y-1">
                <h3 className="text-lg font-bold text-neutral-800">
                  {"No products found"}
                </h3>
                <p className="text-xs sm:text-sm text-neutral-500">
                  {"We couldn't find any products matching your search or category."}
                </p>
              </div>
              {onClearFilters && (
                <button
                  type="button"
                  onClick={onClearFilters}
                  className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white text-xs sm:text-sm font-bold shadow-xs transition-all cursor-pointer"
                >
                  <RotateCcw className="w-3.5 h-3.5" />
                  <span>{"View All Products"}</span>
                </button>
              )}
            </div>
          ) : (
            /* Real Backend Products Grid (Max 2 rows) */
            <>
              <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-5">
                {displayedProducts.map((product, index) => (
                  <ProductCard
                    key={`${product.id}-${index}`}
                    product={product}
                    onAddToCart={onAddToCart}
                    onQuickBuy={onQuickBuy}
                    onSelect={(p) => onSelectProduct(p)}
                  />
                ))}
              </div>

              {/* View More Products Button after 2 rows */}
              {filteredProducts.length > LANDING_MAX_PRODUCTS && onNavigateToView && (
                <div className="pt-6 flex flex-col sm:flex-row items-center justify-center gap-3">
                  <button
                    type="button"
                    onClick={() => onNavigateToView('shop')}
                    style={{
                      backgroundColor: pcTheme.viewMoreBtnBg || undefined,
                      color: pcTheme.viewMoreBtnText || undefined,
                    }}
                    className="w-full sm:w-auto inline-flex items-center justify-center gap-2 px-8 py-3.5 rounded-2xl bg-neutral-900 hover:bg-emerald-700 text-white font-bold text-sm shadow-md hover:shadow-lg transition-all active:scale-98 cursor-pointer group"
                  >
                    <span>{"View More"}</span>
                    <ArrowRight className="w-4 h-4 group-hover:translate-x-1 transition-all" />
                  </button>
                </div>
              )}
            </>
          )}
        </section>
      </main>

      {/* 3D Customer Reviews Coverflow Section */}
      {homeConfig.showReviews !== false && (
        <CustomerReviewsCoverflow
          isEnglish={true}
          title={sanitizeText(homeConfig.reviewsTitle, 'Customer Experiences & Testimonials')}
          subtitle={sanitizeText(homeConfig.reviewsSubtitle, 'Real verified reviews from satisfied customers across Bangladesh.')}
        />
      )}

      {/* Unified Footer */}
      <Footer />
    </div>
  );
};
