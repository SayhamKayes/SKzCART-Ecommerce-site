import React, { useState, useEffect, useCallback } from 'react';
import {
  Star,
  Plus,
  Trash2,
  CheckCircle2,
  XCircle,
  Eye,
  EyeOff,
  Sparkles,
  MessageSquare,
  RefreshCw,
  Search,
  User,
  MapPin,
  PackageCheck,
  ChevronLeft,
  ChevronRight
} from 'lucide-react';
import { apiClient } from '../../services/api';
import { realtimeService } from '../../services/realtime';
import { useLanguage } from '../../Context/LanguageContext';

export const AdminCustomerReviews = ({ isEnglish: propIsEnglish, products = [] }) => {
  const { isEnglish: contextIsEnglish } = useLanguage?.() || {};
  const isEnglish = propIsEnglish !== undefined ? propIsEnglish : (contextIsEnglish ?? false);
  const [reviews, setReviews] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [filterRating, setFilterRating] = useState('ALL');
  const [currentPage, setCurrentPage] = useState(1);
  const itemsPerPage = 10;
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  const [actionSuccessMsg, setActionSuccessMsg] = useState('');

  // Reset pagination to first page when search query or filter changes
  useEffect(() => {
    setCurrentPage(1);
  }, [searchQuery, filterRating]);

  // Form states for manual review creation
  const [newName, setNewName] = useState('');
  const [newPhone, setNewPhone] = useState('');
  const [newLocation, setNewLocation] = useState('');
  const [newRating, setNewRating] = useState(5);
  const [newComment, setNewComment] = useState('');
  const [newProductId, setNewProductId] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  const fetchReviews = useCallback(async () => {
    try {
      setIsLoading(true);
      const data = await apiClient.getReviews();
      if (Array.isArray(data)) {
        setReviews(data);
      }
    } catch (err) {
      console.error('Error fetching admin reviews:', err);
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchReviews();
  }, [fetchReviews]);

  const handleToggleApproval = async (review) => {
    try {
      const updatedStatus = !review.is_approved;
      await apiClient.updateReview(review.id, { is_approved: updatedStatus });
      setReviews((prev) =>
        prev.map((r) => (r.id === review.id ? { ...r, is_approved: updatedStatus } : r))
      );
      showTemporaryMsg(
        updatedStatus
          ? ('Review approved and visible on site')
          : ('Review hidden from site')
      );
    } catch (err) {
      console.error('Failed to toggle approval:', err);
    }
  };

  const handleDeleteReview = async (id) => {
    if (!window.confirm('Move this review to the Recycle Bin? You can restore it anytime.')) {
      return;
    }
    try {
      await apiClient.deleteReview(id);
      setReviews((prev) => prev.filter((r) => r.id !== id));
      try {
        realtimeService.broadcast('REVIEW_UPDATED', { id, deleted: true });
        realtimeService.broadcast('RECYCLE_BIN_UPDATED', { itemType: 'REVIEW' });
      } catch {}
      showTemporaryMsg('Review moved to Recycle Bin');
    } catch (err) {
      console.error('Failed to delete review:', err);
    }
  };

  const handleAddManualReview = async (e) => {
    e.preventDefault();
    if (!newName.trim() || newName.trim().toLowerCase() === 'customer') {
      alert('Please provide a valid customer name.');
      return;
    }
    if (!newComment.trim()) {
      alert('Please provide review text.');
      return;
    }

    setIsSubmitting(true);
    try {
      const selectedProd = products.find((p) => p.id === newProductId);
      const payload = {
        customer_name: newName.trim(),
        customer_phone: newPhone.trim(),
        location: newLocation.trim() || 'Dhaka, Bangladesh',
        rating: Number(newRating),
        comment: newComment.trim(),
        product: newProductId || null,
        product_name: selectedProd?.name || '',
        is_verified_purchase: true,
        is_approved: true,
        source: 'ADMIN_MANUAL',
      };

      const res = await apiClient.createReview(payload);
      if (res?.review) {
        setReviews((prev) => [res.review, ...prev]);
      } else {
        await fetchReviews();
      }

      setIsAddModalOpen(false);
      setNewName('');
      setNewPhone('');
      setNewLocation('');
      setNewRating(5);
      setNewComment('');
      setNewProductId('');
      showTemporaryMsg('New review added successfully!');
    } catch (err) {
      console.error('Failed to create manual review:', err);
      alert('Failed to save review. Please try again.');
    } finally {
      setIsSubmitting(false);
    }
  };

  const showTemporaryMsg = (msg) => {
    setActionSuccessMsg(msg);
    setTimeout(() => setActionSuccessMsg(''), 4000);
  };

  const filteredReviews = reviews.filter((r) => {
    const q = searchQuery.toLowerCase().trim();
    const matchQuery =
      !q ||
      r.customer_name?.toLowerCase().includes(q) ||
      r.location?.toLowerCase().includes(q) ||
      r.comment?.toLowerCase().includes(q) ||
      r.product_name?.toLowerCase().includes(q);

    const matchRating =
      filterRating === 'ALL' || String(r.rating) === String(filterRating);

    return matchQuery && matchRating;
  });

  const totalReviews = filteredReviews.length;
  const totalPages = Math.ceil(totalReviews / itemsPerPage) || 1;
  const startIndex = (currentPage - 1) * itemsPerPage;
  const endIndex = Math.min(startIndex + itemsPerPage, totalReviews);
  const paginatedReviews = filteredReviews.slice(startIndex, endIndex);

  return (
    <div className="bg-white rounded-3xl p-6 sm:p-8 border border-neutral-200 shadow-xs space-y-6">
      {/* Header */}
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-cyan-50 text-cyan-700 font-bold text-xs">
            <Sparkles className="w-3.5 h-3.5 text-cyan-600" />
            <span>{'Customer Satisfaction Hub'}</span>
          </div>
          <h2 className="text-xl font-black text-neutral-900 mt-2 flex items-center gap-2">
            <MessageSquare className="w-5 h-5 text-cyan-600" />
            <span>{'Store Reviews & Testimonials'}</span>
          </h2>
          <p className="text-xs text-neutral-500 mt-0.5">
            {'Manage authentic reviews from delivered orders, add manual testimonials, and control storefront coverflow visibility.'}
          </p>
        </div>

        <div className="flex flex-col sm:items-end gap-2.5">
          <div className="flex items-center gap-2.5">
            <button
              type="button"
              onClick={fetchReviews}
              className="p-2.5 rounded-xl border border-neutral-200 hover:bg-neutral-50 text-neutral-600 transition-colors cursor-pointer"
              title="Refresh"
            >
              <RefreshCw className={`w-4 h-4 ${isLoading ? 'animate-spin text-cyan-600' : ''}`} />
            </button>

            <button
              type="button"
              onClick={() => setIsAddModalOpen(true)}
              className="px-4 py-2.5 rounded-xl bg-[#02312E] hover:bg-[#034440] text-white font-bold text-xs flex items-center gap-2 shadow-sm transition-all hover:scale-[1.02] cursor-pointer"
            >
              <Plus className="w-4 h-4" />
              <span>{'Add Customer Review'}</span>
            </button>
          </div>

          {/* Top Pagination Control (matching user-marked red box) */}
          {totalPages > 1 && (
            <div className="flex items-center gap-1">
              <button
                type="button"
                disabled={currentPage === 1}
                onClick={() => setCurrentPage((p) => Math.max(1, p - 1))}
                className="p-1.5 rounded-lg border border-neutral-200 hover:bg-neutral-100 disabled:opacity-40 disabled:hover:bg-transparent text-neutral-700 font-semibold transition-colors flex items-center cursor-pointer text-xs"
                title={"Previous page"}
              >
                <ChevronLeft className="w-3.5 h-3.5" />
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
                    <span key={`top-dots-${idx}`} className="px-1 text-neutral-400 font-bold text-xs">
                      ...
                    </span>
                  ) : (
                    <button
                      key={`top-page-${item}`}
                      type="button"
                      onClick={() => setCurrentPage(item)}
                      className={`w-7 h-7 rounded-lg font-bold text-xs transition-colors cursor-pointer ${
                        currentPage === item
                          ? "bg-neutral-900 text-white shadow-xs"
                          : "hover:bg-neutral-100 text-neutral-700 border border-neutral-200 bg-white"
                      }`}
                    >
                      {item}
                    </button>
                  )
                )}

              <button
                type="button"
                disabled={currentPage === totalPages}
                onClick={() => setCurrentPage((p) => Math.min(totalPages, p + 1))}
                className="p-1.5 rounded-lg border border-neutral-200 hover:bg-neutral-100 disabled:opacity-40 disabled:hover:bg-transparent text-neutral-700 font-semibold transition-colors flex items-center cursor-pointer text-xs"
                title={"Next page"}
              >
                <ChevronRight className="w-3.5 h-3.5" />
              </button>
            </div>
          )}
        </div>
      </div>

      {/* Success alert message */}
      {actionSuccessMsg && (
        <div className="p-3.5 rounded-2xl bg-emerald-50 border border-emerald-200 text-emerald-800 text-xs font-bold flex items-center gap-2">
          <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
          <span>{actionSuccessMsg}</span>
        </div>
      )}

      {/* Filter and Search Bar */}
      <div className="flex flex-wrap items-center justify-between gap-3 pt-2">
        <div className="relative flex-1 min-w-[240px]">
          <Search className="w-4 h-4 text-neutral-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder={'Search by customer, city, comment...'}
            className="w-full pl-9 pr-4 py-2 rounded-xl bg-neutral-50 border border-neutral-200 text-xs text-neutral-800 focus:bg-white focus:border-cyan-500 focus:outline-none transition-all"
          />
        </div>

        <div className="flex items-center gap-2">
          <span className="text-xs text-neutral-500 font-semibold">
            {'Filter Rating:'}
          </span>
          <select
            value={filterRating}
            onChange={(e) => setFilterRating(e.target.value)}
            className="px-3 py-2 rounded-xl bg-neutral-50 border border-neutral-200 text-xs font-bold text-neutral-800 focus:outline-none focus:border-cyan-500 cursor-pointer"
          >
            <option value="ALL">{'All Ratings'}</option>
            <option value="5">★★★★★ (5 Stars)</option>
            <option value="4">★★★★☆ (4 Stars)</option>
            <option value="3">★★★☆☆ (3 Stars)</option>
            <option value="2">★★☆☆☆ (2 Stars)</option>
            <option value="1">★☆☆☆☆ (1 Star)</option>
          </select>
        </div>
      </div>

      {/* Reviews Table / Grid */}
      {isLoading ? (
        <div className="py-12 text-center text-xs text-neutral-400">
          <RefreshCw className="w-6 h-6 animate-spin mx-auto text-cyan-600 mb-2" />
          <span>{'Loading customer reviews...'}</span>
        </div>
      ) : filteredReviews.length === 0 ? (
        <div className="py-12 text-center rounded-2xl bg-neutral-50 border border-dashed border-neutral-200 p-6">
          <MessageSquare className="w-8 h-8 mx-auto text-neutral-300 mb-2" />
          <h4 className="text-sm font-bold text-neutral-700">
            {'No reviews found'}
          </h4>
          <p className="text-xs text-neutral-400 mt-1 max-w-sm mx-auto">
            {'When orders are delivered, customers will submit reviews via order tracking. You can also manually add your existing reviews above.'}
          </p>
        </div>
      ) : (
        <div className="space-y-3">
          {paginatedReviews.map((rev) => (
            <div
              key={rev.id}
              className={`p-4 sm:p-5 rounded-2xl border transition-all ${
                rev.is_approved
                  ? 'bg-neutral-50/70 border-neutral-200 hover:border-cyan-300'
                  : 'bg-neutral-100/50 border-dashed border-neutral-300 opacity-60'
              }`}
            >
              <div className="flex flex-wrap items-start justify-between gap-3">
                <div className="flex items-start gap-3">
                  <div className="w-10 h-10 rounded-full bg-gradient-to-tr from-cyan-600 to-emerald-600 text-white font-extrabold flex items-center justify-center text-xs shrink-0 shadow-xs">
                    {(() => {
                      const name = rev.customer_name || rev.name;
                      const valid = name && name.trim().toLowerCase() !== 'customer' ? name.trim() : ('Customer');
                      return valid.charAt(0).toUpperCase();
                    })()}
                  </div>

                  <div>
                    <div className="flex items-center gap-2 flex-wrap">
                      <h4 className="text-xs font-bold text-neutral-900">
                        {(() => {
                          const name = rev.customer_name || rev.name;
                          if (name && name.trim() && name.trim().toLowerCase() !== 'customer') {
                            return name.trim();
                          }
                          return 'Verified Customer';
                        })()}
                      </h4>
                      {rev.customer_phone && (
                        <span className="text-[11px] font-mono text-neutral-400">
                          ({rev.customer_phone})
                        </span>
                      )}
                      <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-cyan-100 text-cyan-800">
                        {rev.source === 'ORDER_TRACKING'
                          ? ('Order Tracking')
                          : ('Admin Added')}
                      </span>
                    </div>

                    <div className="flex items-center gap-2 mt-1">
                      <div className="flex items-center text-amber-400">
                        {[1, 2, 3, 4, 5].map((s) => (
                          <Star
                            key={s}
                            className={`w-3.5 h-3.5 ${s <= rev.rating ? 'fill-amber-400 text-amber-400' : 'text-neutral-300'}`}
                          />
                        ))}
                      </div>
                      <span className="text-[11px] text-neutral-500">•</span>
                      <span className="text-[11px] text-neutral-500 flex items-center gap-1">
                        <MapPin className="w-3 h-3" />
                        {rev.location || 'Bangladesh'}
                      </span>
                      {rev.order_id && (
                        <>
                          <span className="text-[11px] text-neutral-500">•</span>
                          <span className="text-[11px] font-mono text-emerald-700 bg-emerald-50 px-1.5 py-0.5 rounded">
                            #{rev.order_id}
                          </span>
                        </>
                      )}
                    </div>
                  </div>
                </div>

                {/* Actions */}
                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    onClick={() => handleToggleApproval(rev)}
                    className={`px-3 py-1.5 rounded-xl text-xs font-bold flex items-center gap-1.5 transition-all cursor-pointer ${
                      rev.is_approved
                        ? 'bg-emerald-50 text-emerald-700 border border-emerald-200 hover:bg-emerald-100'
                        : 'bg-neutral-200 text-neutral-700 border border-neutral-300 hover:bg-neutral-300'
                    }`}
                  >
                    {rev.is_approved ? <Eye className="w-3.5 h-3.5" /> : <EyeOff className="w-3.5 h-3.5" />}
                    <span>{rev.is_approved ? ('Live on Store') : ('Hidden')}</span>
                  </button>

                  <button
                    type="button"
                    onClick={() => handleDeleteReview(rev.id)}
                    className="p-1.5 rounded-xl text-neutral-400 hover:text-rose-600 hover:bg-rose-50 transition-colors cursor-pointer"
                    title="Delete"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>
              </div>

              {/* Review Text */}
              <p className="text-xs text-neutral-700 italic mt-3 bg-white p-3 rounded-xl border border-neutral-100 leading-relaxed">
                "{rev.comment}"
              </p>
            </div>
          ))}

          {/* Bottom Pagination Bar */}
          {totalPages > 1 && (
            <div className="p-4 rounded-2xl border border-neutral-200 bg-white flex flex-wrap items-center justify-between gap-3 text-xs shadow-xs">
              <div className="text-neutral-500 font-medium">
                {`Showing ${totalReviews > 0 ? startIndex + 1 : 0}-${endIndex} of ${totalReviews} reviews`}
              </div>

              <div className="flex items-center gap-1">
                <button
                  type="button"
                  disabled={currentPage === 1}
                  onClick={() => setCurrentPage((p) => Math.max(1, p - 1))}
                  className="px-2.5 py-1.5 rounded-lg border border-neutral-200 hover:bg-neutral-100 disabled:opacity-40 disabled:hover:bg-transparent text-neutral-700 font-semibold transition-colors flex items-center gap-1 cursor-pointer"
                >
                  <ChevronLeft className="w-3.5 h-3.5" />
                  <span className="hidden sm:inline">{"Previous"}</span>
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
                      <span key={`dots-${idx}`} className="px-2 text-neutral-400 font-bold">
                        ...
                      </span>
                    ) : (
                      <button
                        key={`page-${item}`}
                        type="button"
                        onClick={() => setCurrentPage(item)}
                        className={`w-8 h-8 rounded-lg font-bold text-xs transition-colors cursor-pointer ${
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
                  onClick={() => setCurrentPage((p) => Math.min(totalPages, p + 1))}
                  className="px-2.5 py-1.5 rounded-lg border border-neutral-200 hover:bg-neutral-100 disabled:opacity-40 disabled:hover:bg-transparent text-neutral-700 font-semibold transition-colors flex items-center gap-1 cursor-pointer"
                >
                  <span className="hidden sm:inline">{"Next"}</span>
                  <ChevronRight className="w-3.5 h-3.5" />
                </button>
              </div>
            </div>
          )}
        </div>
      )}

      {/* Manual Add Review Modal */}
      {isAddModalOpen && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl max-w-md w-full p-6 space-y-4 shadow-2xl border border-neutral-200 animate-in fade-in zoom-in-95">
            <div className="flex justify-between items-center border-b border-neutral-100 pb-3">
              <h3 className="text-sm font-bold text-neutral-900 flex items-center gap-2">
                <Plus className="w-4 h-4 text-cyan-600" />
                <span>{'Add Customer Review Manually'}</span>
              </h3>
              <button
                type="button"
                onClick={() => setIsAddModalOpen(false)}
                className="text-neutral-400 hover:text-neutral-700 font-bold p-1 cursor-pointer"
              >
                ✕
              </button>
            </div>

            <form onSubmit={handleAddManualReview} className="space-y-3.5 text-xs">
              <div>
                <label className="block font-bold text-neutral-700 mb-1">
                  {'Customer Full Name *'}
                </label>
                <input
                  type="text"
                  value={newName}
                  onChange={(e) => setNewName(e.target.value)}
                  placeholder="e.g. Sayham Kayes"
                  className="w-full px-3 py-2 rounded-xl bg-neutral-50 border border-neutral-200 focus:bg-white focus:border-cyan-500 focus:outline-none"
                  required
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block font-bold text-neutral-700 mb-1">
                    {'City / Location'}
                  </label>
                  <input
                    type="text"
                    value={newLocation}
                    onChange={(e) => setNewLocation(e.target.value)}
                    placeholder="e.g. Mirpur, Dhaka / Sylhet"
                    className="w-full px-3 py-2 rounded-xl bg-neutral-50 border border-neutral-200 focus:bg-white focus:border-cyan-500 focus:outline-none"
                  />
                </div>

                <div>
                  <label className="block font-bold text-neutral-700 mb-1">
                    {'Star Rating (1-5)'}
                  </label>
                  <select
                    value={newRating}
                    onChange={(e) => setNewRating(e.target.value)}
                    className="w-full px-3 py-2 rounded-xl bg-neutral-50 border border-neutral-200 focus:bg-white focus:border-cyan-500 focus:outline-none font-bold"
                  >
                    <option value={5}>★★★★★ (5 Stars)</option>
                    <option value={4}>★★★★☆ (4 Stars)</option>
                    <option value={3}>★★★☆☆ (3 Stars)</option>
                    <option value={2}>★★☆☆☆ (2 Stars)</option>
                    <option value={1}>★☆☆☆☆ (1 Star)</option>
                  </select>
                </div>
              </div>

              <div>
                <label className="block font-bold text-neutral-700 mb-1">
                  {'Related Product (Optional)'}
                </label>
                <select
                  value={newProductId}
                  onChange={(e) => setNewProductId(e.target.value)}
                  className="w-full px-3 py-2 rounded-xl bg-neutral-50 border border-neutral-200 focus:bg-white focus:border-cyan-500 focus:outline-none font-medium truncate"
                >
                  <option value="">{'General Store Review'}</option>
                  {products.map((p) => (
                    <option key={p.id} value={p.id}>
                      {p.name}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block font-bold text-neutral-700 mb-1">
                  {'Review Comment / Feedback *'}
                </label>
                <textarea
                  rows={3}
                  value={newComment}
                  onChange={(e) => setNewComment(e.target.value)}
                  placeholder="Write the customer review here..."
                  className="w-full px-3 py-2 rounded-xl bg-neutral-50 border border-neutral-200 focus:bg-white focus:border-cyan-500 focus:outline-none resize-none"
                  required
                />
              </div>

              <div className="flex items-center justify-end gap-2 pt-2 border-t border-neutral-100">
                <button
                  type="button"
                  onClick={() => setIsAddModalOpen(false)}
                  className="px-4 py-2 rounded-xl border border-neutral-200 hover:bg-neutral-50 font-bold text-neutral-600 cursor-pointer"
                >
                  {'Cancel'}
                </button>
                <button
                  type="submit"
                  disabled={isSubmitting}
                  className="px-5 py-2 rounded-xl bg-[#02312E] hover:bg-[#034440] text-white font-bold transition-all shadow-sm cursor-pointer disabled:opacity-50"
                >
                  {isSubmitting ? ('Saving...') : ('Save Review')}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
