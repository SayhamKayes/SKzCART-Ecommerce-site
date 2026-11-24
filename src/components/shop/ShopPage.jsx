import React, { useState, useMemo, useEffect, useRef } from "react";
import {
  LayoutGrid,
  Grid3X3,
  Columns2,
  List,
  SlidersHorizontal,
  Filter,
  X,
  ChevronLeft,
  ChevronRight,
  ChevronDown,
  RotateCcw,
  Search,
  Star,
  ShoppingBag,
  Zap,
  Sparkles,
  Tag,
  Flame,
  Clock,
  Truck,
  ArrowRight,
  Check,
} from "lucide-react";
import { ProductCard } from "../Product/ProductCard";
import { Footer } from "../Footer";
import { formatBDT, toBengaliNumber } from "../../utils/bangladesh";
import { getProductTagInfo } from "../../utils/productTags";
import { useLanguage } from "../../Context/LanguageContext";
import { getProductImage, handleProductImageError } from "../../utils/productImage";

export const ShopPage = ({
  products = [],
  categories = [],
  onAddToCart,
  onQuickBuy,
  onSelectProduct,
  onNavigateToView,
  initialCategory = "ALL",
  initialSearch = "",
  isLoading = false,
}) => {
  const { isEnglish, t, getProductName, getCategoryName } = useLanguage();
  const topProductsRef = useRef(null);

  // Layout View State: '4-col', '3-col', '2-col', 'list'
  const [viewMode, setViewMode] = useState("4-col");

  // Filters State
  const [selectedCategory, setSelectedCategory] = useState(initialCategory || "ALL");
  const [searchQuery, setSearchQuery] = useState(initialSearch || "");
  const [sortBy, setSortBy] = useState("default");
  const [priceRange, setPriceRange] = useState({ min: 0, max: 20000 });
  const [maxPriceLimit, setMaxPriceLimit] = useState(20000);
  const [inStockOnly, setInStockOnly] = useState(false);
  const [discountOnly, setDiscountOnly] = useState(false);
  const [hotDealsOnly, setHotDealsOnly] = useState(false);
  const [minRating, setMinRating] = useState(0);

  // Mobile Filter Drawer Toggle
  const [isMobileFilterOpen, setIsMobileFilterOpen] = useState(false);

  // Pagination State
  const [currentPage, setCurrentPage] = useState(1);
  const [itemsPerPage, setItemsPerPage] = useState(12);

  // Calculate highest price among products for the slider max
  useEffect(() => {
    if (products && products.length > 0) {
      const highest = Math.max(...products.map((p) => Number(p.price) || 0), 2000);
      const roundedMax = Math.ceil(highest / 500) * 500;
      setMaxPriceLimit(roundedMax);
      setPriceRange({ min: 0, max: roundedMax });
    }
  }, [products]);

  // Reset page to 1 whenever any filter changes
  useEffect(() => {
    setCurrentPage(1);
  }, [
    selectedCategory,
    searchQuery,
    sortBy,
    priceRange,
    inStockOnly,
    discountOnly,
    hotDealsOnly,
    minRating,
    itemsPerPage,
  ]);

  // Calculate Category Product Counts
  const categoryCounts = useMemo(() => {
    const map = { ALL: products.length };
    products.forEach((p) => {
      const cat = p.category || "General";
      map[cat] = (map[cat] || 0) + 1;
    });
    return map;
  }, [products]);

  // Filtered & Sorted Products
  const processedProducts = useMemo(() => {
    return products
      .filter((product) => {
        // Category Filter
        if (selectedCategory !== "ALL") {
          const pCat = (product.category || "").toLowerCase();
          const target = selectedCategory.toLowerCase();
          if (pCat !== target && !pCat.includes(target) && !target.includes(pCat)) {
            return false;
          }
        }

        // Search Query Filter
        if (searchQuery.trim()) {
          const q = searchQuery.toLowerCase().trim();
          const nameEn = (product.name || "").toLowerCase();
          const nameBn = (product.nameBn || "").toLowerCase();
          const sku = (product.sku || "").toLowerCase();
          const cat = (product.category || "").toLowerCase();
          if (
            !nameEn.includes(q) &&
            !nameBn.includes(q) &&
            !sku.includes(q) &&
            !cat.includes(q)
          ) {
            return false;
          }
        }

        // Price Filter
        const price = Number(product.price) || 0;
        if (price < priceRange.min || price > priceRange.max) {
          return false;
        }

        // In Stock Filter
        const isOutOfStock =
          Boolean(product.isOutOfStock) ||
          (product.stock !== undefined && Number(product.stock) <= 0);
        if (inStockOnly && isOutOfStock) {
          return false;
        }

        // Discount Filter
        const regularPrice = Number(product.regularPrice) || price;
        const hasDiscount = regularPrice > price;
        if (discountOnly && !hasDiscount) {
          return false;
        }

        // Hot Deals / Best Sellers Filter
        if (hotDealsOnly) {
          const isHot =
            product.isHotDeal ||
            product.badge === "BESTSELLER" ||
            product.badge === "HOT_DEAL" ||
            product.tag === "BESTSELLER" ||
            product.tag === "HOT_DEAL";
          if (!isHot) return false;
        }

        // Minimum Rating Filter
        if (minRating > 0) {
          const rating = Number(product.rating) || 5;
          if (rating < minRating) return false;
        }

        return true;
      })
      .sort((a, b) => {
        const priceA = Number(a.price) || 0;
        const priceB = Number(b.price) || 0;
        const ratingA = Number(a.rating) || 5;
        const ratingB = Number(b.rating) || 5;
        const discA =
          a.regularPrice && a.regularPrice > a.price
            ? (a.regularPrice - a.price) / a.regularPrice
            : 0;
        const discB =
          b.regularPrice && b.regularPrice > b.price
            ? (b.regularPrice - b.price) / b.regularPrice
            : 0;

        switch (sortBy) {
          case "price-low":
            return priceA - priceB;
          case "price-high":
            return priceB - priceA;
          case "rating":
            return ratingB - ratingA;
          case "discount":
            return discB - discA;
          case "newest":
            return (b.id || "").toString().localeCompare((a.id || "").toString());
          default:
            return 0; // Natural admin/backend order
        }
      });
  }, [
    products,
    selectedCategory,
    searchQuery,
    priceRange,
    inStockOnly,
    discountOnly,
    hotDealsOnly,
    minRating,
    sortBy,
  ]);

  // Active filters count for mobile badge
  const activeFiltersCount = useMemo(() => {
    let count = 0;
    if (selectedCategory !== "ALL") count++;
    if (searchQuery.trim()) count++;
    if (priceRange.min > 0 || priceRange.max < maxPriceLimit) count++;
    if (inStockOnly) count++;
    if (discountOnly) count++;
    if (hotDealsOnly) count++;
    if (minRating > 0) count++;
    return count;
  }, [
    selectedCategory,
    searchQuery,
    priceRange,
    maxPriceLimit,
    inStockOnly,
    discountOnly,
    hotDealsOnly,
    minRating,
  ]);

  // Clear all filters handler
  const handleClearAllFilters = () => {
    setSelectedCategory("ALL");
    setSearchQuery("");
    setPriceRange({ min: 0, max: maxPriceLimit });
    setInStockOnly(false);
    setDiscountOnly(false);
    setHotDealsOnly(false);
    setMinRating(0);
    setSortBy("default");
    setCurrentPage(1);
  };

  // Pagination calculation
  const totalProducts = processedProducts.length;
  const totalPages = Math.ceil(totalProducts / itemsPerPage) || 1;
  const startIndex = (currentPage - 1) * itemsPerPage;
  const endIndex = Math.min(startIndex + itemsPerPage, totalProducts);
  const paginatedProducts = processedProducts.slice(startIndex, endIndex);

  const handlePageChange = (newPage) => {
    setCurrentPage(newPage);
    if (topProductsRef.current) {
      topProductsRef.current.scrollIntoView({ behavior: "smooth", block: "start" });
    }
  };

  // Render Sidebar Filters Content (Shared between desktop sidebar & mobile drawer)
  const renderFilterPanel = () => (
    <div className="space-y-6">
      {/* Header / Reset */}
      <div className="flex items-center justify-between pb-3 border-b border-neutral-200">
        <div className="flex items-center gap-2">
          <Filter className="w-4 h-4 text-emerald-700" />
          <h3 className="font-extrabold text-sm text-neutral-900">
            {"Filter Products"}
          </h3>
          {activeFiltersCount > 0 && (
            <span className="w-5 h-5 rounded-full bg-emerald-600 text-white text-[11px] font-bold flex items-center justify-center">
              {activeFiltersCount}
            </span>
          )}
        </div>
        {activeFiltersCount > 0 && (
          <button
            type="button"
            onClick={handleClearAllFilters}
            className="text-xs text-rose-600 hover:text-rose-700 font-bold flex items-center gap-1 cursor-pointer"
          >
            <RotateCcw className="w-3 h-3" />
            <span>{"Clear All"}</span>
          </button>
        )}
      </div>

      {/* 1. Category Filter List with Counts */}
      <div className="space-y-2.5">
        <label className="text-xs font-bold text-neutral-700 uppercase tracking-wider block">
          {"Categories"}
        </label>
        <div className="space-y-1 max-h-56 overflow-y-auto pr-1">
          {categories.map((cat) => {
            const isSelected = selectedCategory === cat;
            const count = categoryCounts[cat] ?? 0;
            const label =
              cat === "ALL"
                ? "All Categories"
                : getCategoryName(cat);

            return (
              <button
                key={cat}
                type="button"
                onClick={() => setSelectedCategory(cat)}
                className={`w-full flex items-center justify-between px-3 py-2 rounded-xl text-xs font-semibold transition-all cursor-pointer ${
                  isSelected
                    ? "bg-neutral-900 text-white shadow-xs"
                    : "text-neutral-600 hover:bg-neutral-100"
                }`}
              >
                <span className="truncate text-left">{label}</span>
                <span
                  className={`text-[11px] px-1.5 py-0.5 rounded-full font-bold ml-2 shrink-0 ${
                    isSelected
                      ? "bg-white/20 text-white"
                      : "bg-neutral-100 text-neutral-500"
                  }`}
                >
                  {count}
                </span>
              </button>
            );
          })}
        </div>
      </div>

      {/* 2. Price Range Filter */}
      <div className="space-y-3 pt-3 border-t border-neutral-200">
        <div className="flex items-center justify-between">
          <label className="text-xs font-bold text-neutral-700 uppercase tracking-wider">
            {"Price Range"}
          </label>
          <span className="text-xs font-extrabold text-emerald-700 font-mono">
            {formatBDT(priceRange.min)} - {formatBDT(priceRange.max)}
          </span>
        </div>

        {/* Range Slider for Max Price */}
        <input
          type="range"
          min="0"
          max={maxPriceLimit}
          step="50"
          value={priceRange.max}
          onChange={(e) =>
            setPriceRange((prev) => ({ ...prev, max: Number(e.target.value) }))
          }
          className="w-full h-1.5 bg-neutral-200 rounded-lg appearance-none cursor-pointer accent-emerald-600"
        />

        {/* Quick Price Preset Chips */}
        <div className="flex flex-wrap gap-1.5 pt-1">
          {[
            { label: "< ৳500", max: 500 },
            { label: "৳500 - 1000", min: 500, max: 1000 },
            { label: "৳1000 - 2500", min: 1000, max: 2500 },
            { label: "> ৳2500", min: 2500, max: maxPriceLimit },
          ].map((preset, idx) => (
            <button
              key={idx}
              type="button"
              onClick={() =>
                setPriceRange({
                  min: preset.min ?? 0,
                  max: preset.max,
                })
              }
              className="text-[11px] font-semibold px-2.5 py-1 bg-neutral-100 hover:bg-neutral-200 text-neutral-700 rounded-lg transition-colors cursor-pointer"
            >
              {preset.label}
            </button>
          ))}
        </div>
      </div>

      {/* 3. Availability & Offers Checkboxes */}
      <div className="space-y-3 pt-3 border-t border-neutral-200">
        <label className="text-xs font-bold text-neutral-700 uppercase tracking-wider block">
          {"Availability & Deals"}
        </label>

        <div className="space-y-2 text-xs">
          {/* In Stock Only */}
          <label className="flex items-center gap-2.5 cursor-pointer text-neutral-700 hover:text-neutral-900 select-none">
            <input
              type="checkbox"
              checked={inStockOnly}
              onChange={(e) => setInStockOnly(e.target.checked)}
              className="w-4 h-4 rounded text-emerald-600 focus:ring-emerald-500 border-neutral-300"
            />
            <span className="font-medium">
              {"In Stock Only"}
            </span>
          </label>

          {/* Discount / On Sale Only */}
          <label className="flex items-center gap-2.5 cursor-pointer text-neutral-700 hover:text-neutral-900 select-none">
            <input
              type="checkbox"
              checked={discountOnly}
              onChange={(e) => setDiscountOnly(e.target.checked)}
              className="w-4 h-4 rounded text-emerald-600 focus:ring-emerald-500 border-neutral-300"
            />
            <span className="font-medium">
              {"Discounted / On Sale"}
            </span>
          </label>

          {/* Hot Deals & Bestsellers */}
          <label className="flex items-center gap-2.5 cursor-pointer text-neutral-700 hover:text-neutral-900 select-none">
            <input
              type="checkbox"
              checked={hotDealsOnly}
              onChange={(e) => setHotDealsOnly(e.target.checked)}
              className="w-4 h-4 rounded text-emerald-600 focus:ring-emerald-500 border-neutral-300"
            />
            <span className="font-medium flex items-center gap-1">
              <Flame className="w-3.5 h-3.5 text-rose-500 fill-rose-500" />
              <span>{"Bestsellers & Hot Deals"}</span>
            </span>
          </label>
        </div>
      </div>

      {/* 4. Minimum Customer Rating */}
      <div className="space-y-2 pt-3 border-t border-neutral-200">
        <label className="text-xs font-bold text-neutral-700 uppercase tracking-wider block">
          {"Customer Rating"}
        </label>
        <div className="flex items-center gap-1.5">
          {[0, 4, 4.5, 5].map((star) => (
            <button
              key={star}
              type="button"
              onClick={() => setMinRating(star)}
              className={`flex-1 py-1.5 px-2 rounded-xl text-xs font-bold border transition-all flex items-center justify-center gap-1 cursor-pointer ${
                minRating === star
                  ? "bg-amber-50 border-amber-300 text-amber-900 shadow-2xs"
                  : "bg-white border-neutral-200 text-neutral-600 hover:bg-neutral-50"
              }`}
            >
              {star === 0 ? (
                <span>{"All"}</span>
              ) : (
                <>
                  <Star className="w-3 h-3 text-amber-500 fill-amber-400" />
                  <span>{star}★+</span>
                </>
              )}
            </button>
          ))}
        </div>
      </div>
    </div>
  );

  return (
    <div className="flex-1 flex flex-col w-full bg-neutral-100 min-h-screen">
      {/* Shop Page Banner / Breadcrumbs Header */}
      <section className="bg-white border-b border-neutral-200">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6 sm:py-8">
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
            <div>
              {/* Breadcrumb */}
              <nav className="flex items-center gap-2 text-xs font-semibold text-neutral-500 mb-2">
                <button
                  type="button"
                  onClick={() => onNavigateToView && onNavigateToView("store")}
                  className="hover:text-emerald-700 transition-colors cursor-pointer"
                >
                  {"Home"}
                </button>
                <span>/</span>
                <span className="text-neutral-900 font-bold">
                  {"Shop Catalog"}
                </span>
                {selectedCategory !== "ALL" && (
                  <>
                    <span>/</span>
                    <span className="text-emerald-700 font-bold">
                      {getCategoryName(selectedCategory)}
                    </span>
                  </>
                )}
              </nav>

              <h1 className="text-2xl sm:text-3xl font-black text-neutral-900 tracking-tight">
                {selectedCategory === "ALL"
                  ? "Shop All Products"
                  : getCategoryName(selectedCategory)}
              </h1>
              <p className="text-xs sm:text-sm text-neutral-500 mt-1">
                {`Browse authentic collections. ${totalProducts} products available.`}
              </p>
            </div>

            {/* In-Catalog Fast Search Bar */}
            <div className="w-full md:w-80">
              <div className="relative">
                <Search className="w-4 h-4 absolute left-3.5 top-1/2 -translate-y-1/2 text-neutral-400" />
                <input
                  type="text"
                  placeholder={
                    "Search products by name or SKU..."
                  }
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="w-full pl-10 pr-9 py-2.5 bg-neutral-50 hover:bg-neutral-100/80 focus:bg-white text-xs sm:text-sm rounded-2xl border border-neutral-200 focus:border-emerald-600 focus:outline-hidden transition-all shadow-2xs"
                />
                {searchQuery && (
                  <button
                    type="button"
                    onClick={() => setSearchQuery("")}
                    className="absolute right-3 top-1/2 -translate-y-1/2 p-0.5 text-neutral-400 hover:text-neutral-700 cursor-pointer"
                  >
                    <X className="w-3.5 h-3.5" />
                  </button>
                )}
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Main Catalog Workspace */}
      <main
        ref={topProductsRef}
        className="flex-1 max-w-7xl w-full mx-auto px-4 sm:px-6 lg:px-8 py-6 sm:py-8"
      >
        <div className="flex items-start gap-8">
          {/* Desktop WooCommerce Sidebar */}
          <aside className="hidden lg:block w-72 shrink-0 sticky top-24 bg-white rounded-3xl p-6 border border-neutral-200/90 shadow-xs">
            {renderFilterPanel()}
          </aside>

          {/* Right Product Grid & Controls Area */}
          <div className="flex-1 min-w-0 space-y-5">
            {/* Top Toolbar: View Toggles, Sorting, Items Per Page, Mobile Filter Trigger */}
            <div className="bg-white rounded-2xl sm:rounded-3xl p-3.5 sm:p-4 border border-neutral-200 shadow-xs flex flex-wrap items-center justify-between gap-3">
              <div className="flex items-center gap-2">
                {/* Mobile Filter Button */}
                <button
                  type="button"
                  onClick={() => setIsMobileFilterOpen(true)}
                  className="lg:hidden inline-flex items-center gap-2 px-3.5 py-2 rounded-xl bg-neutral-900 text-white font-bold text-xs shadow-xs hover:bg-neutral-800 transition-colors cursor-pointer"
                >
                  <SlidersHorizontal className="w-3.5 h-3.5" />
                  <span>{"Filters"}</span>
                  {activeFiltersCount > 0 && (
                    <span className="w-4 h-4 rounded-full bg-emerald-500 text-white text-[10px] flex items-center justify-center">
                      {activeFiltersCount}
                    </span>
                  )}
                </button>

                {/* Products Count Indicator */}
                <div className="text-xs font-semibold text-neutral-500 hidden sm:block">
                  {`Showing ${totalProducts > 0 ? startIndex + 1 : 0}-${endIndex} of ${totalProducts} results`}
                </div>
              </div>

              <div className="flex items-center gap-2 sm:gap-3 flex-wrap">
                {/* Sort Dropdown */}
                <div className="flex items-center gap-1.5">
                  <span className="text-xs text-neutral-400 font-medium hidden md:inline">
                    {"Sort by:"}
                  </span>
                  <select
                    value={sortBy}
                    onChange={(e) => setSortBy(e.target.value)}
                    className="px-3 py-2 bg-neutral-50 hover:bg-neutral-100 rounded-xl border border-neutral-200 text-xs font-bold text-neutral-800 focus:outline-hidden focus:border-emerald-600 transition-all cursor-pointer"
                  >
                    <option value="default">
                      {"Default Sorting"}
                    </option>
                    <option value="price-low">
                      {"Price: Low to High"}
                    </option>
                    <option value="price-high">
                      {"Price: High to Low"}
                    </option>
                    <option value="rating">
                      {"Highest Rating"}
                    </option>
                    <option value="discount">
                      {"Biggest Discount"}
                    </option>
                    <option value="newest">
                      {"Newest Arrival"}
                    </option>
                  </select>
                </div>

                {/* Items Per Page Selector */}
                <div className="hidden sm:flex items-center gap-1 text-xs">
                  <span className="text-neutral-400 font-medium">
                    {"Show:"}
                  </span>
                  {[8, 12, 16, 24].map((count) => (
                    <button
                      key={count}
                      type="button"
                      onClick={() => setItemsPerPage(count)}
                      className={`px-2 py-1 rounded-lg font-bold transition-colors cursor-pointer ${
                        itemsPerPage === count
                          ? "bg-neutral-900 text-white"
                          : "text-neutral-600 hover:bg-neutral-100"
                      }`}
                    >
                      {count}
                    </button>
                  ))}
                </div>

                {/* View Switcher Controls (4-col, 3-col, 2-col, list) */}
                <div className="flex items-center gap-1 bg-neutral-100 p-1 rounded-xl border border-neutral-200">
                  {/* 4 Column Grid */}
                  <button
                    type="button"
                    onClick={() => setViewMode("4-col")}
                    className={`p-1.5 rounded-lg transition-colors cursor-pointer ${
                      viewMode === "4-col"
                        ? "bg-white text-emerald-700 shadow-2xs font-bold"
                        : "text-neutral-500 hover:text-neutral-900"
                    }`}
                    title={"4 Columns Grid"}
                  >
                    <LayoutGrid className="w-3.5 h-3.5" />
                  </button>

                  {/* 3 Column Grid */}
                  <button
                    type="button"
                    onClick={() => setViewMode("3-col")}
                    className={`p-1.5 rounded-lg transition-colors cursor-pointer ${
                      viewMode === "3-col"
                        ? "bg-white text-emerald-700 shadow-2xs font-bold"
                        : "text-neutral-500 hover:text-neutral-900"
                    }`}
                    title={"3 Columns Grid"}
                  >
                    <Grid3X3 className="w-3.5 h-3.5" />
                  </button>

                  {/* 2 Column Grid */}
                  <button
                    type="button"
                    onClick={() => setViewMode("2-col")}
                    className={`p-1.5 rounded-lg transition-colors cursor-pointer ${
                      viewMode === "2-col"
                        ? "bg-white text-emerald-700 shadow-2xs font-bold"
                        : "text-neutral-500 hover:text-neutral-900"
                    }`}
                    title={"2 Columns Grid"}
                  >
                    <Columns2 className="w-3.5 h-3.5" />
                  </button>

                  {/* List View */}
                  <button
                    type="button"
                    onClick={() => setViewMode("list")}
                    className={`p-1.5 rounded-lg transition-colors cursor-pointer ${
                      viewMode === "list"
                        ? "bg-white text-emerald-700 shadow-2xs font-bold"
                        : "text-neutral-500 hover:text-neutral-900"
                    }`}
                    title={"List View"}
                  >
                    <List className="w-3.5 h-3.5" />
                  </button>
                </div>
              </div>
            </div>

            {/* Active Filters Chips Bar */}
            {activeFiltersCount > 0 && (
              <div className="flex flex-wrap items-center gap-2 pt-1">
                <span className="text-xs font-semibold text-neutral-400">
                  {"Active Filters:"}
                </span>

                {selectedCategory !== "ALL" && (
                  <span className="inline-flex items-center gap-1.5 px-3 py-1 bg-white border border-neutral-200 text-neutral-800 rounded-xl text-xs font-bold shadow-2xs">
                    <span>{getCategoryName(selectedCategory)}</span>
                    <button
                      type="button"
                      onClick={() => setSelectedCategory("ALL")}
                      className="hover:text-rose-600 cursor-pointer"
                    >
                      <X className="w-3 h-3" />
                    </button>
                  </span>
                )}

                {searchQuery.trim() && (
                  <span className="inline-flex items-center gap-1.5 px-3 py-1 bg-white border border-neutral-200 text-neutral-800 rounded-xl text-xs font-bold shadow-2xs">
                    <span>&ldquo;{searchQuery}&rdquo;</span>
                    <button
                      type="button"
                      onClick={() => setSearchQuery("")}
                      className="hover:text-rose-600 cursor-pointer"
                    >
                      <X className="w-3 h-3" />
                    </button>
                  </span>
                )}

                {(priceRange.min > 0 || priceRange.max < maxPriceLimit) && (
                  <span className="inline-flex items-center gap-1.5 px-3 py-1 bg-white border border-neutral-200 text-neutral-800 rounded-xl text-xs font-bold shadow-2xs">
                    <span>
                      {formatBDT(priceRange.min)} - {formatBDT(priceRange.max)}
                    </span>
                    <button
                      type="button"
                      onClick={() => setPriceRange({ min: 0, max: maxPriceLimit })}
                      className="hover:text-rose-600 cursor-pointer"
                    >
                      <X className="w-3 h-3" />
                    </button>
                  </span>
                )}

                {inStockOnly && (
                  <span className="inline-flex items-center gap-1.5 px-3 py-1 bg-emerald-50 border border-emerald-200 text-emerald-800 rounded-xl text-xs font-bold shadow-2xs">
                    <span>{"In Stock"}</span>
                    <button
                      type="button"
                      onClick={() => setInStockOnly(false)}
                      className="hover:text-rose-600 cursor-pointer"
                    >
                      <X className="w-3 h-3" />
                    </button>
                  </span>
                )}

                {discountOnly && (
                  <span className="inline-flex items-center gap-1.5 px-3 py-1 bg-rose-50 border border-rose-200 text-rose-800 rounded-xl text-xs font-bold shadow-2xs">
                    <span>{"On Sale"}</span>
                    <button
                      type="button"
                      onClick={() => setDiscountOnly(false)}
                      className="hover:text-rose-600 cursor-pointer"
                    >
                      <X className="w-3 h-3" />
                    </button>
                  </span>
                )}

                {hotDealsOnly && (
                  <span className="inline-flex items-center gap-1.5 px-3 py-1 bg-amber-50 border border-amber-200 text-amber-800 rounded-xl text-xs font-bold shadow-2xs">
                    <span>{"Hot Deals"}</span>
                    <button
                      type="button"
                      onClick={() => setHotDealsOnly(false)}
                      className="hover:text-rose-600 cursor-pointer"
                    >
                      <X className="w-3 h-3" />
                    </button>
                  </span>
                )}

                {minRating > 0 && (
                  <span className="inline-flex items-center gap-1.5 px-3 py-1 bg-white border border-neutral-200 text-neutral-800 rounded-xl text-xs font-bold shadow-2xs">
                    <span>{minRating}★+</span>
                    <button
                      type="button"
                      onClick={() => setMinRating(0)}
                      className="hover:text-rose-600 cursor-pointer"
                    >
                      <X className="w-3 h-3" />
                    </button>
                  </span>
                )}

                <button
                  type="button"
                  onClick={handleClearAllFilters}
                  className="text-xs text-rose-600 hover:underline font-bold ml-1 cursor-pointer"
                >
                  {"Reset all"}
                </button>
              </div>
            )}

            {/* Empty State */}
            {paginatedProducts.length === 0 ? (
              <div className="bg-white rounded-3xl border border-neutral-200 p-12 text-center space-y-4 shadow-xs">
                <div className="w-16 h-16 rounded-2xl bg-neutral-100 text-neutral-400 mx-auto flex items-center justify-center">
                  <Search className="w-8 h-8 text-neutral-400" />
                </div>
                <div className="space-y-1">
                  <h3 className="text-lg font-bold text-neutral-900">
                    {"No products found"}
                  </h3>
                  <p className="text-xs text-neutral-500 max-w-md mx-auto">
                    {"No products match your current filters. Try resetting the filters or searching for something else."}
                  </p>
                </div>
                <button
                  type="button"
                  onClick={handleClearAllFilters}
                  className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold shadow-xs transition-all cursor-pointer"
                >
                  <RotateCcw className="w-3.5 h-3.5" />
                  <span>{"Clear Filters"}</span>
                </button>
              </div>
            ) : viewMode === "list" ? (
              /* --- LIST VIEW --- */
              <div className="space-y-4">
                {paginatedProducts.map((product, idx) => {
                  const displayName = getProductName(product);
                  const isOutOfStock =
                    Boolean(product.isOutOfStock) ||
                    (product.stock !== undefined && Number(product.stock) <= 0);
                  const discountPercent =
                    product.regularPrice && product.regularPrice > product.price
                      ? Math.round(
                          ((product.regularPrice - product.price) /
                            product.regularPrice) *
                            100
                        )
                      : 0;
                  const tagInfo = getProductTagInfo(product, isEnglish);
                  const imageSrc = getProductImage(product);

                  return (
                    <div
                      key={`list-${product.id}-${idx}`}
                      className="bg-white rounded-2xl sm:rounded-3xl border border-neutral-200/90 p-4 sm:p-5 hover:border-emerald-300 hover:shadow-md transition-all flex flex-col sm:flex-row gap-4 sm:gap-6 items-start sm:items-center justify-between group"
                    >
                      {/* Left: Thumbnail with badges */}
                      <div
                        className="relative w-full sm:w-40 sm:h-40 aspect-square sm:aspect-auto rounded-2xl bg-neutral-100 overflow-hidden shrink-0 cursor-pointer"
                        onClick={() => onSelectProduct && onSelectProduct(product)}
                      >
                        <img
                          src={imageSrc}
                          alt={displayName}
                          className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                          loading="lazy"
                          onError={handleProductImageError}
                        />
                        {discountPercent > 0 && (
                          <span className="absolute top-2 left-2 bg-rose-600 text-white text-[10px] font-black px-2 py-0.5 rounded-full shadow-xs">
                            -{discountPercent}%
                          </span>
                        )}
                        {tagInfo && (
                          <span
                            className={`absolute top-2 right-2 w-5 h-5 rounded-full flex items-center justify-center shadow-xs ${tagInfo.color}`}
                            title={tagInfo.label}
                          >
                            {tagInfo.icon === 'zap' && <Zap className="w-3 h-3 text-white fill-white" />}
                            {tagInfo.icon === 'sparkles' && <Sparkles className="w-3 h-3 text-white fill-white" />}
                            {tagInfo.icon === 'tag' && <Tag className="w-3 h-3 text-white" />}
                            {tagInfo.icon === 'flame' && <Flame className="w-3 h-3 text-white fill-white" />}
                            {tagInfo.icon === 'clock' && <Clock className="w-3 h-3 text-white" />}
                          </span>
                        )}
                      </div>

                      {/* Middle: Details */}
                      <div className="flex-1 min-w-0 space-y-1.5">
                        <span className="text-[11px] font-bold text-neutral-400 uppercase tracking-wider block">
                          {getCategoryName(product.category)}
                        </span>
                        <h4
                          onClick={() => onSelectProduct && onSelectProduct(product)}
                          className="text-base sm:text-lg font-black text-neutral-900 hover:text-emerald-700 transition-colors cursor-pointer line-clamp-1"
                        >
                          {displayName}
                        </h4>

                        {/* Rating & SKU */}
                        <div className="flex items-center gap-3 text-xs text-neutral-500">
                          <span className="flex items-center gap-1 font-bold text-neutral-800">
                            <Star className="w-3.5 h-3.5 text-amber-500 fill-amber-400" />
                            <span>{product.rating || "4.8"}</span>
                            <span className="text-neutral-400 font-normal">
                              ({product.reviewsCount || 1})
                            </span>
                          </span>
                          {product.sku && (
                            <span className="font-mono text-[11px] text-neutral-400">
                              SKU: {product.sku}
                            </span>
                          )}
                        </div>

                        {/* Short Description */}
                        <p className="text-xs text-neutral-500 line-clamp-2 pt-1">
                          {product.shortDescription || product.description}
                        </p>

                        {/* Delivery badge */}
                        {product.deliveryDays && (
                          <div className="pt-1 flex items-center gap-1.5 text-[11px] text-emerald-700 font-semibold">
                            <Truck className="w-3.5 h-3.5 text-emerald-600" />
                            <span>{product.deliveryDays}</span>
                          </div>
                        )}
                      </div>

                      {/* Right: Price & CTA Buttons */}
                      <div className="w-full sm:w-48 shrink-0 flex flex-col justify-between items-start sm:items-end pt-3 sm:pt-0 border-t sm:border-t-0 border-neutral-100 gap-3">
                        <div className="text-left sm:text-right">
                          <div className="text-xl sm:text-2xl font-black text-neutral-900">
                            {formatBDT(product.price)}
                          </div>
                          {product.regularPrice && product.regularPrice > product.price && (
                            <div className="text-xs text-neutral-400 line-through">
                              {formatBDT(product.regularPrice)}
                            </div>
                          )}
                          <div className="mt-1">
                            {isOutOfStock ? (
                              <span className="text-[11px] font-bold text-rose-600 bg-rose-50 px-2 py-0.5 rounded-md">
                                {"Out of Stock"}
                              </span>
                            ) : product.stock <= 10 ? (
                              <span className="text-[11px] font-bold text-amber-700 bg-amber-50 px-2 py-0.5 rounded-md">
                                {`Only ${product.stock} left!`}
                              </span>
                            ) : (
                              <span className="text-[11px] font-bold text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded-md">
                                {"In Stock"}
                              </span>
                            )}
                          </div>
                        </div>

                        <div className="w-full flex items-center gap-2">
                          <button
                            type="button"
                            onClick={() => onAddToCart && onAddToCart(product)}
                            disabled={isOutOfStock}
                            className="flex-1 sm:flex-initial p-2.5 rounded-xl border border-neutral-200 hover:bg-neutral-100 disabled:opacity-40 text-neutral-700 font-bold text-xs flex items-center justify-center gap-1.5 transition-colors cursor-pointer"
                            title={"Add to Cart"}
                          >
                            <ShoppingBag className="w-4 h-4 text-emerald-700" />
                            <span className="sm:hidden">{"Add"}</span>
                          </button>

                          <button
                            type="button"
                            onClick={() => onQuickBuy && onQuickBuy(product)}
                            disabled={isOutOfStock}
                            className="flex-1 px-4 py-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs shadow-xs disabled:opacity-40 transition-colors flex items-center justify-center gap-1 cursor-pointer"
                          >
                            <span>{"Order Now"}</span>
                          </button>
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            ) : (
              /* --- GRID VIEWS (4-col, 3-col, 2-col) --- */
              <div
                className={`grid gap-3 sm:gap-5 ${
                  viewMode === "4-col"
                    ? "grid-cols-2 md:grid-cols-3 lg:grid-cols-4"
                    : viewMode === "3-col"
                    ? "grid-cols-2 md:grid-cols-3 lg:grid-cols-3"
                    : "grid-cols-1 sm:grid-cols-2"
                }`}
              >
                {paginatedProducts.map((product, index) => (
                  <ProductCard
                    key={`grid-${product.id}-${index}`}
                    product={product}
                    onAddToCart={onAddToCart}
                    onQuickBuy={onQuickBuy}
                    onSelect={(p) => onSelectProduct && onSelectProduct(p)}
                  />
                ))}
              </div>
            )}

            {/* Full WooCommerce / Shopify Style Bottom Pagination Bar */}
            {totalProducts > 0 && totalPages > 1 && (
              <div className="bg-white rounded-2xl sm:rounded-3xl p-4 border border-neutral-200 shadow-xs flex flex-wrap items-center justify-between gap-3 text-xs">
                <div className="text-neutral-500 font-medium">
                  {`Showing ${startIndex + 1}-${endIndex} of ${totalProducts} products`}
                </div>

                <div className="flex items-center gap-1">
                  <button
                    type="button"
                    disabled={currentPage === 1}
                    onClick={() => handlePageChange(Math.max(1, currentPage - 1))}
                    className="px-3 py-2 rounded-xl border border-neutral-200 hover:bg-neutral-100 disabled:opacity-40 disabled:hover:bg-transparent text-neutral-700 font-semibold transition-colors flex items-center gap-1 cursor-pointer"
                  >
                    <ChevronLeft className="w-3.5 h-3.5" />
                    <span className="hidden sm:inline">
                      {"Previous"}
                    </span>
                  </button>

                  {Array.from({ length: totalPages }, (_, i) => i + 1)
                    .filter(
                      (num) =>
                        num === 1 ||
                        num === totalPages ||
                        (num >= currentPage - 1 && num <= currentPage + 1)
                    )
                    .reduce((acc, num, idx, arr) => {
                      if (idx > 0 && num - arr[idx - 1] > 1) {
                        acc.push("...");
                      }
                      acc.push(num);
                      return acc;
                    }, [])
                    .map((item, idx) =>
                      item === "..." ? (
                        <span
                          key={`dots-${idx}`}
                          className="px-2 text-neutral-400 font-bold"
                        >
                          ...
                        </span>
                      ) : (
                        <button
                          key={`page-${item}`}
                          onClick={() => handlePageChange(item)}
                          className={`w-8 h-8 rounded-xl font-bold text-xs transition-colors cursor-pointer ${
                            currentPage === item
                              ? "bg-neutral-900 text-white shadow-xs"
                              : "hover:bg-neutral-100 text-neutral-700 border border-neutral-200"
                          }`}
                        >
                          {item}
                        </button>
                      )
                    )}

                  <button
                    type="button"
                    disabled={currentPage === totalPages}
                    onClick={() => handlePageChange(Math.min(totalPages, currentPage + 1))}
                    className="px-3 py-2 rounded-xl border border-neutral-200 hover:bg-neutral-100 disabled:opacity-40 disabled:hover:bg-transparent text-neutral-700 font-semibold transition-colors flex items-center gap-1 cursor-pointer"
                  >
                    <span className="hidden sm:inline">
                      {"Next"}
                    </span>
                    <ChevronRight className="w-3.5 h-3.5" />
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>
      </main>

      {/* Mobile Slide-over Filter Drawer */}
      {isMobileFilterOpen && (
        <div className="fixed inset-0 z-50 lg:hidden overflow-hidden">
          <div
            className="absolute inset-0 bg-black/60 backdrop-blur-xs transition-opacity"
            onClick={() => setIsMobileFilterOpen(false)}
          />
          <div className="absolute inset-y-0 right-0 max-w-full flex pl-10">
            <div className="w-screen max-w-sm bg-white p-6 shadow-2xl flex flex-col justify-between overflow-y-auto">
              <div className="space-y-6">
                <div className="flex items-center justify-between pb-3 border-b border-neutral-200">
                  <h3 className="font-extrabold text-base text-neutral-900">
                    {"Filters"}
                  </h3>
                  <button
                    type="button"
                    onClick={() => setIsMobileFilterOpen(false)}
                    className="p-1.5 text-neutral-400 hover:text-neutral-700 rounded-lg cursor-pointer"
                  >
                    <X className="w-5 h-5" />
                  </button>
                </div>
                {renderFilterPanel()}
              </div>

              <div className="pt-6 border-t border-neutral-200 flex items-center gap-3">
                <button
                  type="button"
                  onClick={handleClearAllFilters}
                  className="flex-1 py-3 text-xs font-bold text-neutral-700 bg-neutral-100 rounded-xl hover:bg-neutral-200 cursor-pointer"
                >
                  {"Reset"}
                </button>
                <button
                  type="button"
                  onClick={() => setIsMobileFilterOpen(false)}
                  className="flex-1 py-3 text-xs font-bold text-white bg-emerald-600 rounded-xl hover:bg-emerald-700 shadow-xs cursor-pointer"
                >
                  {`Show ${totalProducts} Items`}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Unified Footer */}
      <Footer />
    </div>
  );
};
export default ShopPage;
