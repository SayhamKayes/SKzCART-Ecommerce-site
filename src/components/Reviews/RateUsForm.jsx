import React, { useState, useEffect } from 'react';
import { Star, Send, CheckCircle2, MessageSquareHeart, Sparkles } from 'lucide-react';
import { apiClient } from '../../services/api';

const RATING_LABELS = {
  1: { bn: 'Poor', en: 'Poor' },
  2: { bn: 'Fair', en: 'Fair' },
  3: { bn: 'Good', en: 'Good' },
  4: { bn: 'Very Good', en: 'Very Good' },
  5: { bn: 'Excellent!', en: 'Excellent!' },
};

export const RateUsForm = ({ order, currentUser = null, isEnglish = false, onReviewSubmitted }) => {
  const [rating, setRating] = useState(5);
  const [hoverRating, setHoverRating] = useState(0);
  const [comment, setComment] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [submittedReview, setSubmittedReview] = useState(null);
  const [errorMsg, setErrorMsg] = useState('');

  const orderId = order?.id || order?.orderId;

  // Multi-tier customer name resolution
  const resolveCustomerName = () => {
    const candidate =
      order?.customerName ||
      order?.address?.customerName ||
      order?.address?.name ||
      order?.addressSummary?.customerName ||
      currentUser?.name ||
      currentUser?.fullName ||
      currentUser?.username;

    if (candidate && candidate.trim() && candidate.trim().toLowerCase() !== 'customer') {
      return candidate.trim();
    }

    try {
      const storedUser = JSON.parse(localStorage.getItem('amardokan_user_session') || '{}');
      const storedProfile = JSON.parse(localStorage.getItem('amardokan_customer_profile') || '{}');
      const uName = storedUser.name || storedUser.fullName || storedUser.username || storedProfile.name || storedProfile.fullName;
      if (uName && uName.trim() && uName.trim().toLowerCase() !== 'customer') {
        return uName.trim();
      }
    } catch {}

    return '';
  };

  const [reviewerName, setReviewerName] = useState(resolveCustomerName());

  useEffect(() => {
    if (!reviewerName) {
      const found = resolveCustomerName();
      if (found) setReviewerName(found);
    }
  }, [order, currentUser]);

  const customerPhone =
    order?.address?.phone ||
    order?.phone ||
    order?.addressSummary?.maskedPhone ||
    currentUser?.phone ||
    '';

  const customerLocation = [
    order?.address?.district || order?.addressSummary?.district,
    order?.address?.thana || order?.addressSummary?.thana || order?.address?.area
  ].filter(Boolean).join(', ');

  // Check if this order already has a review directly from central backend database
  useEffect(() => {
    let isMounted = true;
    const checkExisting = async () => {
      if (!orderId) return;
      try {
        const reviews = await apiClient.getReviews({ order_id: orderId });
        if (isMounted && Array.isArray(reviews) && reviews.length > 0) {
          setSubmittedReview(reviews[0]);
        }
      } catch (err) {
        console.warn('Could not verify existing review:', err);
      }
    };

    checkExisting();
    return () => { isMounted = false; };
  }, [orderId]);

  const handleSubmit = async (e) => {
    e.preventDefault();
    const finalName = (reviewerName || resolveCustomerName()).trim();
    if (!finalName || finalName.toLowerCase() === 'customer') {
      setErrorMsg('Please provide your name.');
      return;
    }
    if (!comment.trim()) {
      setErrorMsg('Please write a brief comment.');
      return;
    }
    setErrorMsg('');
    setIsSubmitting(true);

    const firstItem = order?.items?.[0] || {};
    const prodId = firstItem.productId || firstItem.product?.id || firstItem.id || null;
    const prodName = firstItem.name || firstItem.product?.name || '';

    try {
      const payload = {
        order_id: orderId,
        customer_name: finalName,
        customer_phone: customerPhone,
        location: customerLocation,
        rating,
        comment: comment.trim(),
        is_verified_purchase: true,
        is_approved: true,
        source: 'ORDER_TRACKING',
        product: prodId,
        product_name: prodName,
      };

      const res = await apiClient.createReview(payload);
      const createdReview = res?.review || payload;

      setSubmittedReview(createdReview);

      if (onReviewSubmitted) {
        onReviewSubmitted(createdReview);
      }
    } catch (err) {
      console.error('Failed to submit review:', err);
      setErrorMsg('Failed to submit review. Please try again.');
    } finally {
      setIsSubmitting(false);
    }
  };

  // If customer has already reviewed this order, show the appreciation card
  if (submittedReview) {
    return (
      <div className="p-5 sm:p-6 rounded-2xl bg-gradient-to-br from-emerald-50 via-white to-teal-50/50 border border-emerald-200 shadow-md text-slate-800 space-y-3 animate-in fade-in zoom-in-95 duration-300">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2 text-[#02312E]">
            <CheckCircle2 className="w-5 h-5 text-emerald-600" />
            <h4 className="text-sm font-extrabold text-slate-900">
              {'Thank You For Your Review!'}
            </h4>
          </div>
          <span className="text-[11px] font-mono font-semibold px-2.5 py-0.5 rounded-full bg-emerald-100 text-emerald-800 border border-emerald-300">
            {'Verified Delivery'}
          </span>
        </div>

        <div className="bg-white rounded-xl p-3.5 border border-emerald-100/90 shadow-xs space-y-2">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-1.5 text-amber-400">
              {[1, 2, 3, 4, 5].map((s) => (
                <Star
                  key={s}
                  className={`w-4 h-4 ${s <= submittedReview.rating ? 'fill-amber-400 text-amber-400' : 'text-slate-200'}`}
                />
              ))}
              <span className="text-xs text-slate-500 font-semibold ml-1">
                ({submittedReview.rating} / 5)
              </span>
            </div>
            {submittedReview.customer_name && (
              <span className="text-xs font-bold text-slate-900">
                {submittedReview.customer_name}
              </span>
            )}
          </div>
          <p className="text-xs text-slate-700 italic leading-relaxed">
            "{submittedReview.comment}"
          </p>
        </div>

        <p className="text-[11px] text-slate-600 flex items-center gap-1.5">
          <Sparkles className="w-3.5 h-3.5 text-amber-500" />
          <span>
            {'Your valuable feedback is live on our storefront and helps us maintain premium service.'}
          </span>
        </p>
      </div>
    );
  }

  // Active Rate Us Review Form (Clean Light Theme)
  return (
    <div className="p-5 sm:p-6 rounded-2xl bg-white border border-slate-200 shadow-md shadow-slate-100 text-slate-800 space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-2 border-b border-slate-100 pb-3">
        <div className="flex items-center gap-2.5">
          <div className="w-9 h-9 rounded-xl bg-emerald-50 border border-emerald-200 flex items-center justify-center text-[#02312E] shadow-xs">
            <MessageSquareHeart className="w-5 h-5" />
          </div>
          <div>
            <h4 className="text-sm font-extrabold text-slate-900 flex items-center gap-2">
              <span>{'Rate Us (Your Feedback)'}</span>
              <span className="text-[10px] uppercase font-bold tracking-wider px-2 py-0.5 rounded-full bg-emerald-50 text-emerald-800 border border-emerald-200">
                {'Order Delivered'}
              </span>
            </h4>
            <p className="text-[11px] text-slate-500">
              {'Your order has been delivered! How was your overall experience?'}
            </p>
          </div>
        </div>
      </div>

      <form onSubmit={handleSubmit} className="space-y-4">
        {/* Reviewer Name Input */}
        <div>
          <label className="block text-[11px] font-bold uppercase tracking-wider text-slate-700 mb-1.5">
            {'Your Name (Displayed with review):'}
          </label>
          <input
            type="text"
            value={reviewerName}
            onChange={(e) => setReviewerName(e.target.value)}
            placeholder={'Enter your full name'}
            className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3.5 py-2.5 text-xs text-slate-900 placeholder-slate-400 focus:outline-none focus:border-[#02312E] focus:ring-1 focus:ring-[#02312E]/30 focus:bg-white transition-all shadow-xs"
            required
          />
        </div>

        {/* Star Selection */}
        <div>
          <label className="block text-[11px] font-bold uppercase tracking-wider text-slate-700 mb-2">
            {'Select Rating (1 to 5 Stars):'}
          </label>
          <div className="flex items-center gap-2">
            <div className="flex items-center gap-1.5 bg-slate-50 px-3 py-2 rounded-xl border border-slate-200 w-fit">
              {[1, 2, 3, 4, 5].map((star) => {
                const isActive = (hoverRating || rating) >= star;
                return (
                  <button
                    type="button"
                    key={star}
                    onClick={() => setRating(star)}
                    onMouseEnter={() => setHoverRating(star)}
                    onMouseLeave={() => setHoverRating(0)}
                    className="p-1 transition-transform hover:scale-125 focus:outline-none cursor-pointer"
                  >
                    <Star
                      className={`w-6 h-6 transition-colors ${
                        isActive
                          ? 'fill-amber-400 text-amber-400 drop-shadow-[0_0_6px_rgba(251,191,36,0.5)]'
                          : 'text-slate-300 hover:text-amber-400'
                      }`}
                    />
                  </button>
                );
              })}
            </div>
            <span className="text-xs font-bold text-[#02312E] ml-2">
              {RATING_LABELS[hoverRating || rating]?.['en']}
            </span>
          </div>
        </div>

        {/* Comment Textarea */}
        <div>
          <label className="block text-[11px] font-bold uppercase tracking-wider text-slate-700 mb-1.5">
            {'Your Honest Review & Comments:'}
          </label>
          <textarea
            rows={3}
            value={comment}
            onChange={(e) => setComment(e.target.value)}
            placeholder={
              'Tell us about product quality, packing, and courier delivery experience...'
            }
            className="w-full bg-slate-50 border border-slate-200 rounded-xl p-3 text-xs text-slate-900 placeholder-slate-400 focus:outline-none focus:border-[#02312E] focus:ring-1 focus:ring-[#02312E]/30 focus:bg-white transition-all resize-none shadow-xs"
            required
          />
        </div>

        {errorMsg && (
          <p className="text-xs text-rose-500 font-medium">{errorMsg}</p>
        )}

        {/* Submit Button */}
        <div className="flex items-center justify-between pt-1">
          <span className="text-[11px] text-slate-500 font-medium">
            {reviewerName || ('Your Name')} • {customerLocation}
          </span>

          <button
            type="submit"
            disabled={isSubmitting}
            className="px-5 py-2.5 rounded-xl bg-[#02312E] hover:bg-[#034440] text-white text-xs font-bold transition-all shadow-md shadow-[#02312E]/25 hover:scale-[1.02] active:scale-95 flex items-center gap-2 cursor-pointer disabled:opacity-50"
          >
            {isSubmitting ? (
              <span className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
            ) : (
              <Send className="w-3.5 h-3.5" />
            )}
            <span>{'Submit Review'}</span>
          </button>
        </div>
      </form>
    </div>
  );
};
