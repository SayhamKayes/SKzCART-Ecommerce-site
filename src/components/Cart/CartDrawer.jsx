import { useState } from "react";
import {
  X,
  ShoppingBag,
  Trash2,
  Plus,
  Minus,
  Tag,
  ArrowRight,
  ShieldCheck,
  Check
} from "lucide-react";
import { formatBDT } from '../../utils/bangladesh';
import { useLanguage } from '../../Context/LanguageContext';
import { DEFAULT_PRODUCT_PLACEHOLDER, handleProductImageError } from '../../utils/productImage';

const CartDrawer = ({
  isOpen,
  onClose,
  cartItems,
  onUpdateQuantity,
  onRemoveItem,
  onProceedToCheckout,
  availableCoupons
}) => {
  if (!isOpen) return null;
  const { language, isEnglish } = useLanguage();
  const [couponCodeInput, setCouponCodeInput] = useState("");
  const [appliedCoupon, setAppliedCoupon] = useState(null);
  const [couponError, setCouponError] = useState("");
  const totalItemsCount = cartItems.reduce((acc, i) => acc + i.quantity, 0);
  const subtotal = cartItems.reduce((acc, item) => acc + item.price * item.quantity, 0);
  const discountAmount = appliedCoupon
    ? appliedCoupon.discountType === "percentage"
      ? Math.round(subtotal * appliedCoupon.value / 100)
      : appliedCoupon.value
    : 0;

  const handleApplyCoupon = () => {
    setCouponError("");
    if (!couponCodeInput.trim()) return;
    const code = couponCodeInput.trim().toUpperCase();
    const found = (availableCoupons || []).find((c) => c.code.toUpperCase() === code && c.isActive);
    if (!found) {
      setCouponError("Invalid or expired coupon code.");
      return;
    }
    if (subtotal < found.minSpend) {
      setCouponError(
        `Minimum order of ${formatBDT(found.minSpend, language)} required for this coupon.`
      );
      return;
    }
    setAppliedCoupon(found);
    setCouponCodeInput("");
  };

  const handleRemoveCoupon = () => {
    setAppliedCoupon(null);
    setCouponError("");
  };

  return (
    <div className="fixed inset-0 z-[100] overflow-hidden bg-black/50 backdrop-blur-xs">
      <div className="absolute inset-0" onClick={onClose} />

      <div className="absolute inset-y-0 right-0 max-w-full flex pl-10 z-[101]">
        <div className="w-screen max-w-md bg-white shadow-2xl flex flex-col justify-between relative z-[102]">
          {/* Top Header */}
          <div className="p-4 sm:p-5 border-b border-neutral-200 flex items-center justify-between bg-neutral-50">
            <div className="flex items-center gap-2">
              <ShoppingBag className="w-5 h-5 text-emerald-700" />
              <h2 className="text-base font-bold text-neutral-900">
                {`Your Shopping Bag (${totalItemsCount} ${totalItemsCount === 1 ? 'item' : 'items'})`}
              </h2>
            </div>
            <button
              onClick={onClose}
              className="p-1.5 rounded-full hover:bg-neutral-200 text-neutral-500 transition-colors cursor-pointer"
              aria-label="Close cart"
            >
              <X className="w-5 h-5" />
            </button>
          </div>

          {/* Cart Items List */}
          <div className="flex-1 overflow-y-auto p-4 sm:p-5 space-y-4">
            {cartItems.length === 0 ? (
              <div className="text-center py-16">
                <div className="w-16 h-16 rounded-full bg-emerald-50 text-emerald-600 flex items-center justify-center mx-auto mb-3">
                  <ShoppingBag className="w-8 h-8" />
                </div>
                <h3 className="text-base font-bold text-neutral-900 mb-1">
                  {"Your bag is currently empty!"}
                </h3>
                <p className="text-xs text-neutral-500 max-w-xs mx-auto mb-6">
                  {"Add your favorite products from our collection to place an order."}
                </p>
                <button
                  onClick={onClose}
                  className="px-6 py-2.5 rounded-xl bg-neutral-900 text-white text-xs font-semibold hover:bg-neutral-800 transition-colors cursor-pointer"
                >
                  {"Start Shopping"}
                </button>
              </div>
            ) : (
              cartItems.map((item) => (
                <div
                  key={item.id}
                  className="flex gap-3 p-3 rounded-2xl bg-neutral-50 border border-neutral-200"
                >
                  <img
                    src={item.image || DEFAULT_PRODUCT_PLACEHOLDER}
                    alt={item.name}
                    className="w-18 h-18 rounded-xl object-cover bg-white shrink-0"
                    referrerPolicy="no-referrer"
                    onError={handleProductImageError}
                  />
                  <div className="flex-1 flex flex-col justify-between min-w-0">
                    <div>
                      <div className="flex items-start justify-between gap-1">
                        <h4 className="text-xs font-semibold text-neutral-900 line-clamp-1">
                          {item.name}
                        </h4>
                        <button
                          onClick={() => onRemoveItem(item.id)}
                          className="text-neutral-400 hover:text-rose-600 transition-colors p-1 cursor-pointer"
                          title="Remove item"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </div>
                      {item.variant && (
                        <span className="text-[11px] text-emerald-700 font-medium">
                          {item.variant}
                        </span>
                      )}
                    </div>

                    <div className="flex items-center justify-between mt-2">
                      <span className="text-xs font-bold text-neutral-900">
                        {formatBDT(item.price * item.quantity, language)}
                      </span>
                      <div className="flex items-center border border-neutral-200 rounded-lg bg-white overflow-hidden">
                        <button
                          onClick={() => onUpdateQuantity(item.id, item.quantity - 1)}
                          className="px-2 py-1 text-neutral-600 hover:bg-neutral-100 transition-colors cursor-pointer"
                        >
                          <Minus className="w-3 h-3" />
                        </button>
                        <span className="px-2 text-xs font-bold text-neutral-800">
                          {item.quantity}
                        </span>
                        <button
                          onClick={() => onUpdateQuantity(item.id, item.quantity + 1)}
                          className="px-2 py-1 text-neutral-600 hover:bg-neutral-100 transition-colors cursor-pointer"
                        >
                          <Plus className="w-3 h-3" />
                        </button>
                      </div>
                    </div>
                  </div>
                </div>
              ))
            )}
          </div>

          {/* Bottom Summary & Checkout */}
          {cartItems.length > 0 && (
            <div className="p-4 sm:p-5 border-t border-neutral-200 bg-white space-y-4">
              {/* Coupon Field */}
              <div className="space-y-1.5">
                {appliedCoupon ? (
                  <div className="flex items-center justify-between p-2 rounded-xl bg-emerald-50 border border-emerald-200 text-xs">
                    <div className="flex items-center gap-1.5 text-emerald-800 font-semibold">
                      <Check className="w-4 h-4 text-emerald-600" />
                      <span>
                        {`Coupon '${appliedCoupon.code}' applied (-${formatBDT(discountAmount, language)})`}
                      </span>
                    </div>
                    <button
                      onClick={handleRemoveCoupon}
                      className="text-rose-600 hover:underline text-[11px] font-medium cursor-pointer"
                    >
                      {"Remove"}
                    </button>
                  </div>
                ) : (
                  <div>
                    <div className="flex gap-2">
                      <div className="relative flex-1">
                        <Tag className="w-3.5 h-3.5 text-neutral-400 absolute left-3 top-1/2 -translate-y-1/2" />
                        <input
                          type="text"
                          placeholder={(() => {
                            const activeSample = (availableCoupons || []).find((c) => c && c.isActive && c.code);
                            return activeSample ? `Promo code (e.g. ${activeSample.code})` : "Enter promo code";
                          })()}
                          value={couponCodeInput}
                          onChange={(e) => setCouponCodeInput(e.target.value)}
                          className="w-full pl-9 pr-3 py-2 bg-neutral-50 border border-neutral-200 rounded-xl text-xs uppercase placeholder:normal-case focus:bg-white focus:border-emerald-500 focus:outline-hidden"
                        />
                      </div>
                      <button
                        onClick={handleApplyCoupon}
                        className="px-4 py-2 bg-neutral-900 hover:bg-neutral-800 text-white rounded-xl text-xs font-semibold transition-colors cursor-pointer"
                      >
                        {"Apply"}
                      </button>
                    </div>
                    {couponError && <p className="text-[11px] text-rose-600 mt-1">{couponError}</p>}
                  </div>
                )}
              </div>

              {/* Subtotal Calculation */}
              <div className="space-y-1.5 text-xs text-neutral-600 pt-2 border-t border-neutral-100">
                <div className="flex justify-between">
                  <span>{"Subtotal"}</span>
                  <span className="font-semibold text-neutral-900">{formatBDT(subtotal, language)}</span>
                </div>
                {appliedCoupon && (
                  <div className="flex justify-between text-emerald-700 font-medium">
                    <span>{"Coupon Discount"}</span>
                    <span>-{formatBDT(discountAmount, language)}</span>
                  </div>
                )}
                <div className="flex justify-between text-neutral-500">
                  <span>{"Delivery Fee"}</span>
                  <span className="text-[11px]">
                    {"Calculated by district at checkout"}
                  </span>
                </div>
                <div className="flex justify-between text-sm font-bold text-neutral-900 pt-1.5 border-t border-neutral-200">
                  <span>{"Total Payable (Estimated)"}</span>
                  <span className="text-base text-emerald-700">
                    {formatBDT(Math.max(0, subtotal - discountAmount), language)}
                  </span>
                </div>
              </div>

              {/* Checkout Button */}
              <button
                onClick={() => onProceedToCheckout(appliedCoupon || void 0)}
                className="w-full py-3.5 px-4 rounded-xl bg-emerald-600 hover:bg-emerald-700 active:bg-emerald-800 text-white font-bold text-sm flex items-center justify-center gap-2 shadow-md shadow-emerald-600/30 transition-all hover:scale-[1.01] cursor-pointer"
              >
                <span>{"Proceed to Checkout"}</span>
                <ArrowRight className="w-4 h-4" />
              </button>

              <div className="flex items-center justify-center gap-1 text-[11px] text-neutral-400">
                <ShieldCheck className="w-3.5 h-3.5 text-emerald-600" />
                <span>
                  {"Order in 1 minute with Cash on Delivery"}
                </span>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export { CartDrawer };
