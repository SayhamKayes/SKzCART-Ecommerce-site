import React, { useState, useEffect, useRef, useCallback } from 'react';
import { Star, ChevronLeft, ChevronRight } from 'lucide-react';
import { apiClient } from '../../services/api';
import { realtimeService } from '../../services/realtime';
import { sanitizeText } from '../../utils/textSanitizer';
import { useThemeConfig } from '../frontPanel/FrontPanelContext';
import { buildBgStyle } from '../../utils/themeHelper';

export const CustomerReviewsCoverflow = ({
  isEnglish = true,
  title: rawTitle,
  subtitle: rawSubtitle,
  productId = null,
  productName = null,
}) => {
  const { themeConfig } = useThemeConfig();
  const revT = themeConfig?.themesColors?.reviews || {};
  const revSectionStyle = buildBgStyle(revT, '#f8fafc');
  const title = sanitizeText(rawTitle, 'What Our Happy Customers Say');
  const subtitle = sanitizeText(rawSubtitle, 'Real, verified feedback from customers who received orders across Bangladesh.');
  const [reviews, setReviews] = useState([]);
  const [activeIndex, setActiveIndex] = useState(0);
  const [isHovered, setIsHovered] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const touchStartX = useRef(null);

  // Fetch verified reviews from database
  const loadReviews = useCallback(async () => {
    try {
      setIsLoading(true);
      const params = { approved_only: true };
      if (productId) {
        params.product_id = productId;
      }
      const data = await apiClient.getReviews(params);
      if (Array.isArray(data) && data.length > 0) {
        let list = data;
        // If productId or productName is specified, strictly isolate to this product
        if (productId) {
          list = data.filter((r) => {
            const matchId = String(r.product || r.product_id || '') === String(productId);
            const matchName = productName && r.product_name && r.product_name.toLowerCase().includes(productName.toLowerCase());
            return matchId || matchName;
          });
        }
        setReviews(list);
        setActiveIndex(Math.floor(list.length / 2));
      } else {
        setReviews([]);
      }
    } catch (err) {
      console.warn('Failed to load reviews for coverflow:', err);
      setReviews([]);
    } finally {
      setIsLoading(false);
    }
  }, [productId, productName]);

  useEffect(() => {
    loadReviews();
    const unsub = realtimeService.subscribe((event) => {
      if (
        event.type === 'REVIEW_UPDATED' ||
        event.type === 'RECYCLE_BIN_UPDATED'
      ) {
        loadReviews();
      }
    });
    const onFocus = () => loadReviews();
    window.addEventListener('focus', onFocus);
    const interval = setInterval(() => loadReviews(), 10000);
    return () => {
      unsub();
      window.removeEventListener('focus', onFocus);
      clearInterval(interval);
    };
  }, [loadReviews]);

  // Autoplay carousel every 4.5 seconds when not hovered
  useEffect(() => {
    if (reviews.length <= 1 || isHovered) return;
    const interval = setInterval(() => {
      setActiveIndex((prev) => (prev + 1) % reviews.length);
    }, 4500);
    return () => clearInterval(interval);
  }, [reviews.length, isHovered]);

  const handlePrev = () => {
    setActiveIndex((prev) => (prev === 0 ? reviews.length - 1 : prev - 1));
  };

  const handleNext = () => {
    setActiveIndex((prev) => (prev + 1) % reviews.length);
  };

  // Touch swipe support
  const handleTouchStart = (e) => {
    touchStartX.current = e.touches[0].clientX;
  };

  const handleTouchEnd = (e) => {
    if (touchStartX.current === null) return;
    const touchEndX = e.changedTouches[0].clientX;
    const diff = touchStartX.current - touchEndX;
    if (Math.abs(diff) > 40) {
      if (diff > 0) handleNext();
      else handlePrev();
    }
    touchStartX.current = null;
  };

  // If no reviews exist
  if (!isLoading && reviews.length === 0) {
    if (productId) {
      return (
        <section className="relative overflow-hidden mt-12 sm:mt-16 py-12 bg-gradient-to-b from-slate-50 via-white to-slate-50 text-slate-800 select-none border-t border-slate-200/80">
          <div className="max-w-xl mx-auto px-4 text-center">
            <div className="w-12 h-12 mx-auto mb-3 rounded-2xl bg-emerald-50 border border-emerald-200 flex items-center justify-center text-[#02312E] shadow-xs">
              <Star className="w-6 h-6 fill-amber-400 text-amber-400" />
            </div>
            <h3 className="text-base font-extrabold text-slate-900">
              {"No reviews yet for this product"}
            </h3>
            <p className="text-xs text-slate-500 mt-1.5 leading-relaxed max-w-md mx-auto">
              {"Be the first to order and share your honest experience after successful delivery!"}
            </p>
          </div>
        </section>
      );
    }

    // Storefront Front Page: Always display the luxury section even when waiting for initial reviews
    return (
      <section
        style={revSectionStyle}
        className="relative overflow-hidden mt-12 sm:mt-16 py-14 sm:py-20 bg-gradient-to-b from-slate-50 via-white to-slate-50 text-slate-800 select-none border-t border-slate-200/80"
      >
        <div className="absolute top-1/4 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[700px] h-[350px] bg-emerald-100/40 rounded-full blur-[120px] pointer-events-none" />
        <div className="absolute bottom-0 right-1/4 w-[400px] h-[250px] bg-teal-100/30 rounded-full blur-[100px] pointer-events-none" />

        <div className="relative z-10 max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center max-w-3xl mx-auto mb-8 sm:mb-10">
            <h2
              style={{ color: revT.headingColor || undefined }}
              className="text-2xl sm:text-4xl font-black text-slate-900 tracking-tight"
            >
              {title || ('What Our Happy Customers Say')}
            </h2>
            <p
              style={{ color: revT.subtitleColor || undefined }}
              className="text-xs sm:text-sm text-slate-600 mt-2 max-w-xl mx-auto"
            >
              {subtitle || ('Real, verified feedback from customers who received orders across Bangladesh.')}
            </p>
            <div className="flex items-center justify-center gap-1.5 mt-3 text-amber-400">
              {[1, 2, 3, 4, 5].map((s) => (
                <Star
                  key={s}
                  style={{ color: revT.starColor || undefined, fill: revT.starColor || undefined }}
                  className="w-4 h-4 fill-amber-400 text-amber-400 drop-shadow-xs"
                />
              ))}
              <span className="text-xs font-bold text-slate-600 ml-1.5">
                (5.0 / 5.0 Star Rating)
              </span>
            </div>
          </div>

          <div
            style={{
              backgroundColor: revT.cardBg || undefined,
              borderColor: revT.cardBorderColor || undefined,
            }}
            className="max-w-md mx-auto p-6 sm:p-7 rounded-2xl bg-white border border-slate-200 shadow-md text-center space-y-2.5"
          >
            <div className="w-12 h-12 mx-auto rounded-2xl bg-emerald-50 border border-emerald-200 flex items-center justify-center text-[#02312E] shadow-xs">
              <Star className="w-6 h-6 fill-amber-400 text-amber-400" />
            </div>
            <h3 className="text-sm font-extrabold text-slate-900">
              {"Customer Reviews System is Active!"}
            </h3>
            <p className="text-xs text-slate-500 leading-relaxed">
              {"Reviews submitted by customers upon parcel delivery will automatically appear here in 3D Coverflow."}
            </p>
          </div>
        </div>
      </section>
    );
  }

  return (
    <section
      style={revSectionStyle}
      className="relative overflow-hidden mt-12 sm:mt-16 py-14 sm:py-20 bg-gradient-to-b from-slate-50 via-white to-slate-50 text-slate-800 select-none border-t border-slate-200/80"
      onMouseEnter={() => setIsHovered(true)}
      onMouseLeave={() => setIsHovered(false)}
      onTouchStart={handleTouchStart}
      onTouchEnd={handleTouchEnd}
    >
      {/* Background ambient lighting effects for light luxury theme */}
      <div className="absolute top-1/4 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[700px] h-[350px] bg-emerald-100/40 rounded-full blur-[120px] pointer-events-none" />
      <div className="absolute bottom-0 right-1/4 w-[400px] h-[250px] bg-teal-100/30 rounded-full blur-[100px] pointer-events-none" />

      {/* Grid Pattern Overlay */}
      <div
        className="absolute inset-0 opacity-[0.035] pointer-events-none bg-[radial-gradient(#02312E_1px,transparent_1px)] [background-size:24px_24px]"
      />

      <div className="relative z-10 max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        {/* Section Header */}
        <div className="text-center max-w-3xl mx-auto mb-10 sm:mb-14">
          <h2
            style={{ color: revT.headingColor || undefined }}
            className="text-2xl sm:text-4xl font-black text-slate-900 tracking-tight"
          >
            {title || ('What Our Happy Customers Say')}
          </h2>

          <p
            style={{ color: revT.subtitleColor || undefined }}
            className="text-xs sm:text-sm text-slate-600 mt-2 max-w-xl mx-auto"
          >
            {subtitle || ('Real, verified feedback from customers who received orders across Bangladesh.')}
          </p>

          <div className="flex items-center justify-center gap-1.5 mt-3 text-amber-400">
            {[1, 2, 3, 4, 5].map((s) => (
              <Star
                key={s}
                style={{ color: revT.starColor || undefined, fill: revT.starColor || undefined }}
                className="w-4 h-4 fill-amber-400 text-amber-400 drop-shadow-xs"
              />
            ))}
            <span className="text-xs font-bold text-slate-600 ml-1.5">
              (5.0 / 5.0 Star Rating)
            </span>
          </div>
        </div>

        {/* 3D Coverflow Container */}
        <div className="relative h-[380px] sm:h-[420px] flex items-center justify-center [perspective:1400px]">
          {reviews.map((rev, idx) => {
            const total = reviews.length;
            let offset = idx - activeIndex;

            // Handle wrap-around offset calculation for circular deck
            if (offset > total / 2) offset -= total;
            if (offset < -total / 2) offset += total;

            const isActive = offset === 0;
            const isVisible = Math.abs(offset) <= 3;
            if (!isVisible) return null;

            // 3D positioning metrics
            const translateX = offset * 210; // spread distance in px
            const rotateY = -offset * 32;    // rotation angle
            const scale = isActive ? 1.05 : Math.max(0.75, 1 - Math.abs(offset) * 0.14);
            const zIndex = 30 - Math.abs(offset) * 5;
            const opacity = isActive ? 1 : Math.max(0.4, 1 - Math.abs(offset) * 0.28);

            return (
              <div
                key={rev.id || idx}
                onClick={() => setActiveIndex(idx)}
                style={{
                  transform: `translateX(${translateX}px) translateZ(${isActive ? 80 : -Math.abs(offset) * 100}px) rotateY(${rotateY}deg) scale(${scale})`,
                  zIndex,
                  opacity,
                  transition: 'all 0.55s cubic-bezier(0.25, 1, 0.5, 1)',
                  backgroundColor: revT.cardBg || undefined,
                  borderColor: isActive
                    ? (revT.activeCardBorderColor || undefined)
                    : (revT.cardBorderColor || undefined),
                }}
                className={`absolute w-[290px] sm:w-[350px] p-6 sm:p-7 rounded-2xl cursor-pointer select-none backdrop-blur-xl ${isActive
                  ? 'bg-white border-2 border-[#02312E] shadow-[0_20px_45px_rgba(2,49,46,0.16)] ring-4 ring-[#02312E]/10'
                  : 'bg-white/90 border border-slate-200/90 shadow-md hover:border-slate-300'
                  }`}
              >
                {/* Large Stylized Quotation Mark in Top-Right */}
                <div className="flex justify-between items-start mb-4">
                  {/* Rating Stars */}
                  <div className="flex items-center gap-1">
                    {[1, 2, 3, 4, 5].map((st) => (
                      <Star
                        key={st}
                        style={
                          st <= (rev.rating || 5)
                            ? { color: revT.starColor || undefined, fill: revT.starColor || undefined }
                            : undefined
                        }
                        className={`w-4 h-4 ${st <= (rev.rating || 5)
                          ? 'fill-amber-400 text-amber-400 drop-shadow-xs'
                          : 'text-slate-200'
                          }`}
                      />
                    ))}
                  </div>

                  <span className="text-[#02312E] font-serif text-5xl leading-none opacity-20 select-none -mt-2 -mr-1">
                    ”
                  </span>
                </div>

                {/* Review Text */}
                <p
                  style={{ color: revT.reviewTextColor || undefined }}
                  className={`text-xs sm:text-sm leading-relaxed italic line-clamp-5 min-h-[70px] ${isActive ? 'text-slate-800 font-medium' : 'text-slate-600'
                  }`}
                >
                  "{rev.comment || rev.text}"
                </p>

                {/* Bottom Divider & Customer Info */}
                <div className="mt-6 pt-4 border-t border-slate-100 flex items-center justify-between">
                  <div className="min-w-0">
                    <h4
                      style={{ color: revT.reviewerNameColor || undefined }}
                      className="text-xs font-bold text-slate-900 tracking-wide truncate"
                    >
                      {(() => {
                        const name = rev.customer_name || rev.name;
                        if (name && name.trim() && name.trim().toLowerCase() !== 'customer') {
                          return name.trim();
                        }
                        return 'Verified Buyer';
                      })()}
                    </h4>
                    <p className="text-[11px] font-mono font-semibold text-[#02312E] uppercase tracking-wider truncate mt-0.5">
                      {rev.location || ('BANGLADESH')}
                    </p>
                  </div>
                </div>
              </div>
            );
          })}
        </div>

        {/* Navigation Controls: Arrows & Indicators */}
        <div className="flex items-center justify-center gap-4 mt-6">
          <button
            type="button"
            onClick={handlePrev}
            aria-label="Previous review"
            className="w-10 h-10 rounded-full bg-[#02312E] hover:bg-[#034440] text-white flex items-center justify-center transition-all hover:scale-110 shadow-md shadow-[#02312E]/25 cursor-pointer"
          >
            <ChevronLeft className="w-5 h-5 text-white" />
          </button>

          {/* Dots Indicator */}
          <div className="flex items-center gap-1.5 px-3 py-1.5 bg-slate-100 rounded-full border border-slate-200/90">
            {reviews.map((_, idx) => (
              <button
                key={idx}
                type="button"
                onClick={() => setActiveIndex(idx)}
                className={`transition-all rounded-full cursor-pointer ${idx === activeIndex
                  ? 'w-6 h-2 bg-[#02312E] shadow-xs'
                  : 'w-2 h-2 bg-slate-300 hover:bg-slate-400'
                  }`}
              />
            ))}
          </div>

          <button
            type="button"
            onClick={handleNext}
            aria-label="Next review"
            className="w-10 h-10 rounded-full bg-[#02312E] hover:bg-[#034440] text-white flex items-center justify-center transition-all hover:scale-110 shadow-md shadow-[#02312E]/25 cursor-pointer"
          >
            <ChevronRight className="w-5 h-5 text-white" />
          </button>
        </div>
      </div>
    </section>
  );
};
