import React, { useState, useEffect, useMemo } from "react";
import {
  X,
  ShieldCheck,
  Truck,
  RotateCcw,
  Lock,
  CreditCard,
  Banknote,
  Smartphone,
  Phone,
  User,
  Building,
  FileText,
  Mail,
  CheckCircle2,
  Tag
} from "lucide-react";
import {
  BANGLADESH_DISTRICTS,
  calculateDeliveryFee,
  formatBDT,
  isValidBangladeshPhone,
  normalizeBangladeshPhone,
  getThanasForDistrict
} from "../../utils/bangladesh";
import { COUNTRY_CODES } from "../../utils/countryCodes";
import { apiClient } from "../../services/api";
import { marketingTracker } from "../../services/marketing";
import { realtimeService } from "../../services/realtime";
import { useLanguage } from "../../Context/LanguageContext";
import { CustomModal } from "../common/CustomModal";
import { DEFAULT_PAYMENT_METHODS, formatAccountTypeLabel } from "../../utils/paymentConfig";
import codImg from "../../assets/COD.png";
import bkashImg from "../../assets/bkash.png";
import nagadImg from "../../assets/nagad2.png";
import rocketImg from "../../assets/rocket2.png";

const GuestCheckoutModal = ({
  isOpen,
  onClose,
  items,
  appliedCoupon,
  currentUser,
  onOrderSuccess,
  onUpdateQuantity,
}) => {
  const { isEnglish, t } = useLanguage();
  if (!isOpen || !items || items.length === 0) return null;

  // Local copy of items to allow instant quantity adjustment inside modal
  const [localItems, setLocalItems] = useState(items);
  useEffect(() => {
    setLocalItems(items);
  }, [items]);

  const [customerName, setCustomerName] = useState(currentUser?.name || currentUser?.fullName || "");
  const [countryCode, setCountryCode] = useState("+880");
  const [phone, setPhone] = useState(currentUser?.phone || "");
  const [email, setEmail] = useState(currentUser?.email || "");
  const [district, setDistrict] = useState(currentUser?.district || "Dhaka");
  const [thana, setThana] = useState(currentUser?.thana || "Dhanmondi");
  const [fullAddress, setFullAddress] = useState(currentUser?.fullAddress || currentUser?.address || "");
  const [orderNote, setOrderNote] = useState("");
  const [paymentMethod, setPaymentMethod] = useState("COD");
  const [paymentTrxId, setPaymentTrxId] = useState("");
  const [senderWallet, setSenderWallet] = useState("");
  const [errorModal, setErrorModal] = useState(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [formErrors, setFormErrors] = useState({});

  // Coupon State
  const [coupon, setCoupon] = useState(appliedCoupon || null);
  const [couponCodeInput, setCouponCodeInput] = useState("");
  const [couponError, setCouponError] = useState("");
  const [couponSuccess, setCouponSuccess] = useState("");
  const [availableCoupons, setAvailableCoupons] = useState([]);

  useEffect(() => {
    if (appliedCoupon) setCoupon(appliedCoupon);
  }, [appliedCoupon]);

  useEffect(() => {
    let isMounted = true;
    apiClient.getCoupons().then((coups) => {
      if (isMounted && Array.isArray(coups) && coups.length > 0) {
        setAvailableCoupons(coups);
      }
    }).catch(() => {});
    return () => { isMounted = false; };
  }, []);

  const handleApplyCoupon = (e) => {
    if (e) e.preventDefault();
    setCouponError("");
    setCouponSuccess("");
    if (!couponCodeInput.trim()) return;
    const code = couponCodeInput.trim().toUpperCase();
    const found = availableCoupons.find((c) => c.code.toUpperCase() === code && c.isActive);
    if (!found) {
      setCouponError("Invalid coupon code! (Try: WELCOME50 or EID100)");
      return;
    }
    if (subtotal < found.minSpend) {
      setCouponError(
        `Minimum order of ৳${found.minSpend} required for this coupon.`
      );
      return;
    }
    setCoupon(found);
    setCouponSuccess(`Coupon ${found.code} applied!`);
    setCouponCodeInput("");
  };

  const handleRemoveCoupon = (e) => {
    if (e) e.preventDefault();
    setCoupon(null);
    setCouponError("");
    setCouponSuccess("");
  };

  // Dynamic Payment Methods configuration synced with Backend Admin
  const [paymentConfigs, setPaymentConfigs] = useState(DEFAULT_PAYMENT_METHODS);

  useEffect(() => {
    let isMounted = true;
    apiClient.getPaymentMethods().then((methods) => {
      if (isMounted && Array.isArray(methods) && methods.length > 0) {
        setPaymentConfigs(methods);
      }
    }).catch(() => {});
    return () => { isMounted = false; };
  }, []);

  const isMethodActive = (methodKey) => {
    const key = methodKey.toLowerCase();
    const found = paymentConfigs.find((m) => m.method_id.toLowerCase() === key);
    return found ? found.is_active : true;
  };

  const getMethodConfig = (methodKey) => {
    const key = methodKey.toLowerCase();
    return paymentConfigs.find((m) => m.method_id.toLowerCase() === key) || {};
  };

  const activeManualMethods = useMemo(() => {
    return ['BKASH', 'NAGAD', 'ROCKET'].filter((m) => isMethodActive(m));
  }, [paymentConfigs]);

  const availableThanas = useMemo(() => {
    return getThanasForDistrict(district);
  }, [district]);

  const handleDistrictChange = (newDistrict) => {
    setDistrict(newDistrict);
    const thanasList = getThanasForDistrict(newDistrict);
    setThana(thanasList[0] || "");
    if (formErrors.district || formErrors.thana) {
      setFormErrors((prev) => ({ ...prev, district: undefined, thana: undefined }));
    }
  };

  useEffect(() => {
    if (currentUser) {
      if (currentUser.name || currentUser.fullName) {
        setCustomerName(currentUser.name || currentUser.fullName);
      }
      if (currentUser.phone) {
        setPhone(currentUser.phone);
      }
      if (currentUser.email) setEmail(currentUser.email);
      if (currentUser.district) {
        setDistrict(currentUser.district);
      }
      if (currentUser.thana) {
        setThana(currentUser.thana);
      } else {
        const defaultThanas = getThanasForDistrict(currentUser.district || "Dhaka");
        setThana(defaultThanas[0] || "");
      }
      if (currentUser.fullAddress || currentUser.address) {
        setFullAddress(currentUser.fullAddress || currentUser.address);
      }
    }
  }, [currentUser, isOpen]);

  // Quantity stepper handler
  const handleQtyChange = (delta) => {
    setLocalItems((prev) =>
      prev.map((item, idx) => {
        if (idx === 0) {
          const nextQty = Math.max(1, item.quantity + delta);
          if (onUpdateQuantity) {
            onUpdateQuantity(item.id, nextQty);
          }
          return { ...item, quantity: nextQty };
        }
        return item;
      })
    );
  };

  const handleItemQtyChange = (itemIdx, delta) => {
    setLocalItems((prev) => {
      const targetItem = prev[itemIdx];
      if (!targetItem) return prev;
      const nextQty = Math.max(1, targetItem.quantity + delta);
      if (onUpdateQuantity) {
        onUpdateQuantity(targetItem.id, nextQty);
      }
      return prev.map((it, idx) => (idx === itemIdx ? { ...it, quantity: nextQty } : it));
    });
  };

  const currentQty = localItems[0]?.quantity || 1;
  const totalItemCount = localItems.reduce((acc, item) => acc + item.quantity, 0);
  const subtotal = localItems.reduce((acc, item) => acc + item.price * item.quantity, 0);

  // Delivery fee calculation: Dhaka City ৳70, Sub-Dhaka ৳100, Outside Dhaka ৳130
  const deliveryCalc = calculateDeliveryFee(district, thana);
  const deliveryFee = district.toLowerCase() === "dhaka" ? 70 : deliveryCalc.fee;
  const zone = deliveryCalc.zone;

  const discount = coupon
    ? coupon.discountType === "percentage"
      ? Math.round((subtotal * coupon.value) / 100)
      : coupon.value
    : 0;

  const totalPayable = Math.max(0, subtotal + deliveryFee - discount);

  const validateForm = () => {
    const errors = {};
    if (!customerName.trim()) {
      errors.customerName = "Please enter your full name";
    }

    if (!email.trim()) {
      errors.email = "Please enter your email address";
    } else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email.trim())) {
      errors.email = "Please enter a valid email address (e.g. name@example.com)";
    }

    if (countryCode === "+880") {
      const normPhone = normalizeBangladeshPhone(phone);
      if (!normPhone) {
        errors.phone = "Please provide mobile number";
      } else if (!isValidBangladeshPhone(normPhone)) {
        errors.phone = "Please enter a valid 11-digit mobile number (e.g. 017XXXXXXXX)";
      }
    } else {
      const cleanDigits = phone.replace(/\D/g, "");
      if (!cleanDigits || cleanDigits.length < 6) {
        errors.phone = "Please enter a valid mobile number";
      }
    }

    if (!thana.trim()) {
      errors.thana = "Please enter thana or area";
    }

    if (!fullAddress.trim() || fullAddress.trim().length < 6) {
      errors.fullAddress = "Please enter your full address (house, road, area)";
    }

    if (paymentMethod !== "COD" && paymentMethod !== "SSLCOMMERZ") {
      if (!senderWallet.trim()) {
        errors.senderWallet = "Please enter your wallet/account number";
      }
      if (!paymentTrxId.trim()) {
        errors.paymentTrxId = "Please enter transaction ID (TrxID)";
      }
    }
    setFormErrors(errors);
    return Object.keys(errors).length === 0;
  };

  const handleSubmitOrder = async (e) => {
    e.preventDefault();
    if (!validateForm()) return;
    setIsSubmitting(true);
    try {
      const normalizedPhone =
        countryCode === "+880"
          ? normalizeBangladeshPhone(phone)
          : `${countryCode}${phone.replace(/\D/g, "")}`;

      const orderPayload = {
        items: localItems,
        customerEmail: email.trim() || undefined,
        address: {
          customerName: customerName.trim(),
          phone: normalizedPhone,
          email: email.trim() || undefined,
          district,
          thana: thana.trim() || (district === "Dhaka" ? "Dhaka City" : "General"),
          fullAddress: fullAddress.trim(),
          deliveryZone: zone,
          orderNote: orderNote.trim() || undefined,
          paymentTrxId: paymentTrxId.trim() || undefined,
          senderWallet: senderWallet.trim() || undefined,
        },
        paymentMethod,
        paymentTrxId: paymentTrxId.trim() || undefined,
        senderWallet: senderWallet.trim() || undefined,
        couponCode: coupon?.code,
        discount: discount,
        totalAmount: totalPayable,
        utm: {
          source: "website_checkout_modal",
          medium: "direct",
        },
      };

      const result = await apiClient.checkout(orderPayload);

      if (result && result.success && result.order) {
        const itemNames = (localItems || items || []).map(i => `${i.name || 'Product'} (x${i.quantity || 1})`).join(", ");
        const firstProdId = (localItems && localItems[0]?.productId) || (localItems && localItems[0]?.id) || '';

        marketingTracker.track("Purchase", {
          orderId: result.order.id,
          value: result.order.total || totalPayable,
          source: "checkout_modal",
          name: itemNames || "E-Commerce Purchase",
          productName: itemNames || "E-Commerce Purchase",
          productId: firstProdId,
          items: localItems || items,
        });

        const tempPassword = `Amar#${normalizedPhone.slice(-4)}`;
        const customerEmail = email.trim() || `${normalizedPhone}@customer.amardokan.com`;
        const autoAccount = {
          username: normalizedPhone,
          tempPassword,
          email: customerEmail,
        };

        const userObj = {
          id: currentUser?.id || `usr-${normalizedPhone}`,
          name: customerName.trim(),
          phone: normalizedPhone,
          email: customerEmail,
          district,
          thana: thana.trim(),
          fullAddress: fullAddress.trim(),
        };

        try {
          localStorage.setItem("amardokan_user_session", JSON.stringify(userObj));
          localStorage.setItem(
            "amardokan_customer_profile",
            JSON.stringify(userObj)
          );
        } catch { }

        // Clear cart from storage as order has been placed in DB
        try {
          localStorage.removeItem("amardokan_cart");
          localStorage.setItem("amardokan_cart", "[]");
        } catch { }

        // If SSLCommerz, initiate gateway payment session and redirect
        if (paymentMethod === "SSLCOMMERZ") {
          try {
            const payInit = await apiClient.initiatePayment({
              orderId: result.order.id,
              amount: result.order.total || totalPayable,
              customerData: {
                customerName: customerName.trim(),
                phone: normalizedPhone,
                email: customerEmail,
                fullAddress: fullAddress.trim(),
                district,
              }
            });

            if (payInit && payInit.success && payInit.gatewayUrl) {
              // Redirect directly without showing confirmation popup or playing chime before actual payment
              window.location.href = payInit.gatewayUrl;
              return;
            } else {
              setErrorModal({
                title: "Payment Gateway Error",
                message:
                  payInit?.message ||
                  ("Could not connect to SSLCommerz. Please try again."),
              });
              return;
            }
          } catch (initErr) {
            console.error("SSLCommerz initiation error:", initErr);
            setErrorModal({
              title: "Payment Gateway Error",
              message: "Failed to initiate SSLCommerz payment session.",
            });
            return;
          }
        }

        realtimeService.broadcast("ORDER_CREATED", result.order);
        onOrderSuccess(result.order, !currentUser ? autoAccount : undefined);
      } else {
        setErrorModal({
          title: "Failed to Place Order",
          message:
            result.message ||
            ("Failed to place order. Please try again."),
        });
      }
    } catch (err) {
      console.error("Checkout error:", err);
      setErrorModal({
        title: "Connection Error",
        message:
          err?.message && !err.message.includes("fetch")
            ? err.message
            : "Server connection error. Please try again.",
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  const displayNameHeader = currentUser
    ? (currentUser.name || currentUser.fullName || currentUser.phone || "User")
    : null;

  return (
    <div className="fixed inset-0 z-50 overflow-y-auto bg-black/60 backdrop-blur-xs flex items-center justify-center p-3 sm:p-4">
      <div className="relative bg-white rounded-3xl max-w-4xl w-full overflow-hidden shadow-2xl animate-in fade-in zoom-in-95 duration-200 my-4">
        {/* Header - Dynamically displays logged-in user name or Guest Checkout */}
        <div className="px-6 py-4 bg-neutral-900 text-white flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 rounded-lg bg-emerald-600 flex items-center justify-center font-bold text-white text-sm shrink-0">
              ✓
            </div>
            <div>
              <h2 className="text-base font-bold flex items-center gap-2">
                <span>
                  {displayNameHeader
                    ? `${displayNameHeader} - ${"Checkout"}`
                    : ("Guest Checkout")}
                </span>
                <span className="text-xs px-2 py-0.5 rounded-full bg-emerald-950 text-emerald-400 font-normal">
                  {displayNameHeader
                    ? ("Logged In")
                    : ("Cash on Delivery")}
                </span>
              </h2>
              <p className="text-xs text-neutral-400">
                {displayNameHeader
                  ? (`Logged in as ${currentUser.phone || currentUser.email}`)
                  : ("Confirm order instantly without any password or signup")}
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 rounded-full hover:bg-neutral-800 text-neutral-400 hover:text-white transition-colors cursor-pointer"
            aria-label="Close"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <form onSubmit={handleSubmitOrder}>
          <div className="grid grid-cols-1 lg:grid-cols-12 max-h-[82vh] overflow-y-auto">
            {/* Left Column: Delivery & Payment Details */}
            <div className="lg:col-span-7 p-6 sm:p-8 space-y-6 border-b lg:border-b-0 lg:border-r border-neutral-200">
              {/* 1. Delivery Information */}
              <div>
                <h3 className="text-base font-bold text-neutral-900 border-b border-neutral-100 pb-3 mb-4">
                  {"1. Your Delivery Information"}
                </h3>

                <div className="space-y-4 text-xs">
                  {/* Name */}
                  <div>
                    <label className="block text-xs font-bold text-neutral-700 mb-1.5">
                      {"Your Full Name"} <span className="text-rose-500">*</span>
                    </label>
                    <input
                      type="text"
                      name="customerName"
                      required
                      placeholder={"Enter your full name"}
                      value={customerName}
                      onChange={(e) => setCustomerName(e.target.value)}
                      className={`w-full px-4 py-3 rounded-xl border ${formErrors.customerName
                          ? "border-rose-500 bg-rose-50/20"
                          : "border-neutral-300 focus:border-emerald-600 focus:ring-2 focus:ring-emerald-600/20"
                        } text-sm outline-none transition-all`}
                    />
                    {formErrors.customerName && (
                      <p className="text-rose-600 text-[11px] mt-1">{formErrors.customerName}</p>
                    )}
                  </div>

                  {/* Email */}
                  <div>
                    <label className="block text-xs font-bold text-neutral-700 mb-1.5">
                      {"Your Email Address"} <span className="text-rose-500">*</span>
                    </label>
                    <div className="relative">
                      <Mail className="w-4 h-4 text-neutral-400 absolute left-3.5 top-1/2 -translate-y-1/2 pointer-events-none" />
                      <input
                        type="email"
                        name="customerEmail"
                        required
                        placeholder={"example@domain.com (for order tracking & invoice)"}
                        value={email}
                        onChange={(e) => {
                          setEmail(e.target.value);
                          if (formErrors.email) setFormErrors((prev) => ({ ...prev, email: undefined }));
                        }}
                        className={`w-full pl-10 pr-4 py-3 rounded-xl border ${formErrors.email
                            ? "border-rose-500 bg-rose-50/20"
                            : "border-neutral-300 focus:border-emerald-600 focus:ring-2 focus:ring-emerald-600/20"
                          } text-sm outline-none transition-all`}
                      />
                    </div>
                    {formErrors.email && (
                      <p className="text-rose-600 text-[11px] mt-1">{formErrors.email}</p>
                    )}
                  </div>

                  {/* Phone Input (Country Code commented out as requested) */}
                  <div>
                    <label className="block text-xs font-bold text-neutral-700 mb-1.5">
                      {"Mobile Number"} <span className="text-rose-500">*</span>
                    </label>
                    <div
                      className={`flex rounded-xl border ${formErrors.phone
                          ? "border-rose-500 bg-rose-50/20"
                          : "border-neutral-300 focus-within:border-emerald-600 focus-within:ring-2 focus-within:ring-emerald-600/20"
                        } bg-white overflow-hidden transition-all`}
                    >
                      {/* Country code selector - commented out per user request, can be easily re-enabled */}
                      {/*
                      <select
                        value={countryCode}
                        onChange={(e) => setCountryCode(e.target.value)}
                        className="bg-neutral-50 hover:bg-neutral-100 border-r border-neutral-300 px-3 py-3 text-xs sm:text-sm font-semibold text-neutral-800 outline-none cursor-pointer shrink-0 max-w-[130px] sm:max-w-[150px] truncate"
                        title="Select Country Code"
                      >
                        {COUNTRY_CODES.map((c) => (
                          <option key={`${c.code}-${c.dialCode}`} value={c.dialCode}>
                            {c.flag} {c.code} ({c.dialCode})
                          </option>
                        ))}
                      </select>
                      */}
                      <input
                        type="tel"
                        name="phone"
                        required
                        placeholder={
                          "01XXXXXXXXX (11 digits)"
                        }
                        value={phone}
                        onChange={(e) => setPhone(e.target.value)}
                        className="w-full px-4 py-3 text-sm outline-none bg-transparent"
                      />
                    </div>
                    {formErrors.phone ? (
                      <p className="text-rose-600 text-[11px] mt-1">{formErrors.phone}</p>
                    ) : (
                      <p className="text-[11px] text-neutral-400 mt-1">
                        {"Delivery rider will call this number before arrival"}
                      </p>
                    )}
                  </div>

                  {/* District & Thana (Side-by-side dropdowns) */}
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    <div>
                      <label className="block text-xs font-bold text-neutral-700 mb-1.5">
                        {"Select District"} <span className="text-rose-500">*</span>
                      </label>
                      <select
                        value={district}
                        onChange={(e) => handleDistrictChange(e.target.value)}
                        className="w-full px-4 py-3 rounded-xl border border-neutral-300 focus:border-emerald-600 focus:ring-2 focus:ring-emerald-600/20 text-sm outline-none transition-all bg-white font-medium cursor-pointer"
                      >
                        {BANGLADESH_DISTRICTS.map((dist) => (
                          <option key={dist} value={dist}>
                            {dist}{" "}
                            {dist === "Dhaka"
                              ? "(Dhaka City ৳70)"
                              : ["Gazipur", "Narayanganj", "Munshiganj", "Manikganj", "Narsingdi"].includes(dist)
                                ? "(Sub-Dhaka ৳100)"
                                : "(Outside Dhaka ৳130)"}
                          </option>
                        ))}
                      </select>
                    </div>

                    <div>
                      <label className="block text-xs font-bold text-neutral-700 mb-1.5">
                        {"Select Thana / Area"} <span className="text-rose-500">*</span>
                      </label>
                      <select
                        value={thana}
                        onChange={(e) => {
                          setThana(e.target.value);
                          if (formErrors.thana) {
                            setFormErrors((prev) => ({ ...prev, thana: undefined }));
                          }
                        }}
                        className={`w-full px-4 py-3 rounded-xl border ${formErrors.thana
                            ? "border-rose-500 bg-rose-50/20"
                            : "border-neutral-300 focus:border-emerald-600 focus:ring-2 focus:ring-emerald-600/20"
                          } text-sm outline-none transition-all bg-white font-medium cursor-pointer`}
                      >
                        <option value="">
                          {"-- Select Thana / Area --"}
                        </option>
                        {availableThanas.map((th) => (
                          <option key={th} value={th}>
                            {th}
                          </option>
                        ))}
                      </select>
                      {formErrors.thana && (
                        <p className="text-rose-600 text-[11px] mt-1">{formErrors.thana}</p>
                      )}
                    </div>
                  </div>

                  {/* Full Address Textarea */}
                  <div>
                    <label className="block text-xs font-bold text-neutral-700 mb-1.5">
                      {"Full Address"} <span className="text-rose-500">*</span>
                    </label>
                    <textarea
                      rows={2}
                      required
                      placeholder={
                        "House no, Road no, Area, Thana & District..."
                      }
                      value={fullAddress}
                      onChange={(e) => setFullAddress(e.target.value)}
                      className={`w-full px-4 py-3 rounded-xl border ${formErrors.fullAddress
                          ? "border-rose-500 bg-rose-50/20"
                          : "border-neutral-300 focus:border-emerald-600 focus:ring-2 focus:ring-emerald-600/20"
                        } text-sm outline-none transition-all resize-none`}
                    />
                    {formErrors.fullAddress && (
                      <p className="text-rose-600 text-[11px] mt-1">{formErrors.fullAddress}</p>
                    )}
                  </div>

                  {/* Quantity Stepper (Directly in form when single item) */}
                  {localItems.length === 1 && (
                    <div>
                      <label className="block text-xs font-bold text-neutral-700 mb-1.5">
                        {"Quantity"}
                      </label>
                      <div className="inline-flex items-center border border-neutral-300 rounded-xl overflow-hidden bg-slate-50">
                        <button
                          type="button"
                          onClick={() => handleQtyChange(-1)}
                          className="px-4 py-2 hover:bg-neutral-200 font-black text-sm select-none cursor-pointer"
                          title={"Decrease quantity"}
                        >
                          -
                        </button>
                        <span className="px-5 py-2 font-bold text-sm bg-white min-w-[44px] text-center select-none">
                          {currentQty}
                        </span>
                        <button
                          type="button"
                          onClick={() => handleQtyChange(1)}
                          className="px-4 py-2 hover:bg-neutral-200 font-black text-sm select-none cursor-pointer"
                          title={"Increase quantity"}
                        >
                          +
                        </button>
                      </div>
                    </div>
                  )}
                </div>
              </div>

              {/* 2. Payment Method Selection */}
              <div>
                <h3 className="text-base font-bold text-neutral-900 border-b border-neutral-100 pb-3 mb-3">
                  {"2. Select Payment Method:"}
                </h3>

                {/* 1. Primary Payment Gateways: SSLCOMMERZ & COD */}
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 mb-3">
                  {/* Pay Online via SSLCommerz */}
                  {isMethodActive("SSLCOMMERZ") && (
                    <label
                      onClick={() => setPaymentMethod("SSLCOMMERZ")}
                      className={`relative p-3.5 rounded-2xl border-2 flex flex-col justify-between gap-2.5 cursor-pointer transition-all ${
                        paymentMethod === "SSLCOMMERZ"
                          ? "border-blue-600 bg-blue-50/50 shadow-xs ring-2 ring-blue-600/20"
                          : "border-neutral-200 hover:border-neutral-300 bg-white"
                      }`}
                    >
                      <div className="flex items-center justify-between w-full">
                        <div className="h-8 px-2.5 py-0.5 rounded-lg bg-blue-900 border border-blue-800 shadow-2xs flex items-center gap-1.5 text-white font-extrabold text-[11px]">
                          <CreditCard className="w-4 h-4 text-blue-300 shrink-0" />
                          <span>SSLCOMMERZ</span>
                        </div>
                        <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-blue-100 text-blue-800">
                          {"Cards & MFS"}
                        </span>
                      </div>
                      <div>
                        <div className="font-bold text-xs text-neutral-900">
                          {"Pay Online (Cards / bKash / Nagad via SSLCommerz)"}
                        </div>
                        <div className="text-[10px] text-neutral-500">
                          Visa, MasterCard, UnionPay, bKash, Nagad, Rocket, DBBL Nexus
                        </div>
                      </div>
                    </label>
                  )}

                  {/* Cash on Delivery */}
                  {isMethodActive("COD") && (
                    <label
                      onClick={() => setPaymentMethod("COD")}
                      className={`relative p-3.5 rounded-2xl border-2 flex flex-col justify-between gap-2.5 cursor-pointer transition-all ${
                        paymentMethod === "COD"
                          ? "border-emerald-600 bg-emerald-50/40 shadow-xs ring-2 ring-emerald-600/20"
                          : "border-neutral-200 hover:border-neutral-300 bg-white"
                      }`}
                    >
                      <div className="flex items-center justify-between w-full">
                        <div className="h-8 w-fit px-2 py-0.5 rounded-lg bg-white border border-neutral-200/90 shadow-2xs flex items-center justify-center">
                          <img
                            src={codImg}
                            alt="Cash on Delivery"
                            className="h-5 sm:h-5.5 w-auto object-contain"
                          />
                        </div>
                        <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-emerald-100 text-emerald-800">
                          {"Pay on Delivery"}
                        </span>
                      </div>
                      <div>
                        <div className="font-bold text-xs text-neutral-900">Cash on Delivery</div>
                        <div className="text-[10px] text-neutral-500">
                          {"Pay the delivery rider after inspecting your parcel."}
                        </div>
                      </div>
                    </label>
                  )}
                </div>

                {/* 2. Manual MFS Channels (bKash, Nagad, Rocket) - Equal Width Grid */}
                {activeManualMethods.length > 0 && (
                  <div>
                    <div className="text-[11px] font-bold text-neutral-500 uppercase tracking-wider mb-2 flex items-center gap-1.5">
                      <Smartphone className="w-3.5 h-3.5 text-neutral-400" />
                      <span>{"Direct Mobile Banking (TrxID Manual):"}</span>
                    </div>

                    <div className={`grid gap-2.5 ${
                      activeManualMethods.length === 1
                        ? "grid-cols-1"
                        : activeManualMethods.length === 2
                          ? "grid-cols-2"
                          : "grid-cols-1 sm:grid-cols-3"
                    }`}>
                      {/* bKash Manual */}
                      {isMethodActive("BKASH") && (
                        <label
                          onClick={() => setPaymentMethod("BKASH")}
                          className={`relative p-3 rounded-2xl border-2 flex flex-col justify-between gap-2.5 cursor-pointer transition-all w-full ${
                            paymentMethod === "BKASH"
                              ? "border-pink-600 bg-pink-50/40 shadow-xs ring-2 ring-pink-600/20"
                              : "border-neutral-200 hover:border-neutral-300 bg-white"
                          }`}
                        >
                          <div className="flex items-center justify-between w-full">
                            <div className="h-8 w-fit px-2 py-0.5 rounded-lg bg-white border border-neutral-200/90 shadow-2xs flex items-center justify-center">
                              <img
                                src={bkashImg}
                                alt="bKash"
                                className="h-5 sm:h-5.5 w-auto object-contain"
                              />
                            </div>
                            <span className="text-[9px] font-bold px-1.5 py-0.5 rounded bg-pink-100 text-pink-700">
                              {getMethodConfig("BKASH")?.account_type === 'PERSONAL' ? 'Personal' : 'Merchant'}
                            </span>
                          </div>
                          <div>
                            <div className="font-bold text-xs text-neutral-900">bKash Manual</div>
                            <div className="text-[10px] text-neutral-500">
                              {"bKash TrxID"}
                            </div>
                          </div>
                        </label>
                      )}

                      {/* Nagad Manual */}
                      {isMethodActive("NAGAD") && (
                        <label
                          onClick={() => setPaymentMethod("NAGAD")}
                          className={`relative p-3 rounded-2xl border-2 flex flex-col justify-between gap-2.5 cursor-pointer transition-all w-full ${
                            paymentMethod === "NAGAD"
                              ? "border-amber-600 bg-amber-50/40 shadow-xs ring-2 ring-amber-600/20"
                              : "border-neutral-200 hover:border-neutral-300 bg-white"
                          }`}
                        >
                          <div className="flex items-center justify-between w-full">
                            <div className="h-8 w-fit px-2 py-0.5 rounded-lg bg-white border border-neutral-200/90 shadow-2xs flex items-center justify-center">
                              <img
                                src={nagadImg}
                                alt="Nagad"
                                className="h-5 sm:h-5.5 w-auto object-contain"
                              />
                            </div>
                            <span className="text-[9px] font-bold px-1.5 py-0.5 rounded bg-amber-100 text-amber-700">
                              {getMethodConfig("NAGAD")?.account_type === 'PERSONAL' ? 'Personal' : 'Merchant'}
                            </span>
                          </div>
                          <div>
                            <div className="font-bold text-xs text-neutral-900">Nagad Manual</div>
                            <div className="text-[10px] text-neutral-500">
                              {"Nagad TrxID"}
                            </div>
                          </div>
                        </label>
                      )}

                      {/* Rocket Manual */}
                      {isMethodActive("ROCKET") && (
                        <label
                          onClick={() => setPaymentMethod("ROCKET")}
                          className={`relative p-3 rounded-2xl border-2 flex flex-col justify-between gap-2.5 cursor-pointer transition-all w-full ${
                            paymentMethod === "ROCKET"
                              ? "border-purple-600 bg-purple-50/40 shadow-xs ring-2 ring-purple-600/20"
                              : "border-neutral-200 hover:border-neutral-300 bg-white"
                          }`}
                        >
                          <div className="flex items-center justify-between w-full">
                            <div className="h-8 w-fit px-2 py-0.5 rounded-lg bg-white border border-neutral-200/90 shadow-2xs flex items-center justify-center">
                              <img
                                src={rocketImg}
                                alt="Rocket"
                                className="h-5 sm:h-5.5 w-auto object-contain"
                              />
                            </div>
                            <span className="text-[9px] font-bold px-1.5 py-0.5 rounded bg-purple-100 text-purple-700">
                              {getMethodConfig("ROCKET")?.account_type === 'PERSONAL' ? 'Personal' : 'Merchant'}
                            </span>
                          </div>
                          <div>
                            <div className="font-bold text-xs text-neutral-900">Rocket Manual</div>
                            <div className="text-[10px] text-neutral-500">
                              {"Rocket TrxID"}
                            </div>
                          </div>
                        </label>
                      )}
                    </div>
                  </div>
                )}

                {/* COD highlight banner */}
                {paymentMethod === "COD" && (
                  <div className="mt-3 p-3.5 rounded-2xl bg-amber-50/90 border border-amber-200 flex items-center gap-2.5 text-xs text-amber-950 font-medium animate-in fade-in duration-150">
                    <span className="text-base shrink-0">💵</span>
                    <span>
                      {getMethodConfig("COD")?.instructions || ("Cash on Delivery: Pay the delivery rider after inspecting your parcel.")}
                    </span>
                  </div>
                )}

                {/* SSLCOMMERZ highlight banner */}
                {paymentMethod === "SSLCOMMERZ" && (
                  <div className="mt-3 p-4 rounded-2xl bg-linear-to-r from-blue-900 via-indigo-900 to-slate-900 text-white space-y-2.5 border border-blue-700/60 shadow-md animate-in fade-in duration-200">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <CreditCard className="w-4 h-4 text-blue-300" />
                        <span className="font-bold text-xs text-white">
                          {"SSLCommerz Secured Payment Gateway"}
                        </span>
                      </div>
                      <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-blue-500/20 text-blue-300 border border-blue-400/30">
                        Instant Auto-Verification
                      </span>
                    </div>
                    <p className="text-[11px] text-blue-100 leading-relaxed">
                      {"Pay instantly with Visa, MasterCard, UnionPay, bKash, Nagad, Rocket, or Internet Banking. You will be redirected to the secure SSLCommerz payment page upon clicking confirm."}
                    </p>
                    <div className="flex items-center gap-3 pt-1 text-[10px] font-medium text-blue-200/90 border-t border-blue-800/80">
                      <span>🛡️ 256-bit SSL Encryption</span>
                      <span>⚡ Instant Order Confirmation</span>
                      <span>💳 All BD Cards & MFS</span>
                    </div>
                  </div>
                )}

                {/* MFS instructions & TrxID box if bKash, Nagad or Rocket is selected */}
                {paymentMethod !== "COD" && paymentMethod !== "SSLCOMMERZ" && (
                  <div className="mt-3 p-4 rounded-2xl bg-neutral-900 text-white space-y-3 border border-neutral-800 animate-in fade-in duration-200">
                    <div className="flex items-center justify-between pb-2 border-b border-neutral-800">
                      <div className="flex items-center gap-2">
                        <Smartphone className="w-4 h-4 text-emerald-400" />
                        <span className="font-bold text-xs">
                          {paymentMethod === "BKASH"
                            ? ("bKash ")
                            : paymentMethod === "NAGAD"
                              ? ("Nagad ")
                              : ("Rocket ")}
                          {formatAccountTypeLabel(getMethodConfig(paymentMethod)?.account_type, isEnglish)}
                        </span>
                      </div>
                      <button
                        type="button"
                        onClick={() => {
                          const prefix = paymentMethod === "BKASH" ? "BK" : paymentMethod === "NAGAD" ? "NG" : "RK";
                          setPaymentTrxId(prefix + Date.now().toString(36).toUpperCase());
                          setSenderWallet(phone || "01712345678");
                        }}
                        className="text-[10px] font-bold px-2 py-0.5 rounded bg-emerald-500/20 text-emerald-300 border border-emerald-500/30 hover:bg-emerald-500/30 transition-colors cursor-pointer"
                        title={"Auto-fill for testing"}
                      >
                        ⚡ {"Test Auto-Fill TrxID"}
                      </button>
                    </div>

                    <div className="bg-neutral-800/80 p-3 rounded-xl space-y-1.5 text-[11px] text-neutral-300">
                      <div className="flex justify-between items-center">
                        <span className="text-neutral-400">
                          {getMethodConfig(paymentMethod)?.account_type === 'PERSONAL'
                            ? ("Personal Account No:")
                            : ("Merchant Number:")}
                        </span>
                        <span className="font-mono font-bold text-emerald-400 text-xs tracking-wider">
                          {getMethodConfig(paymentMethod)?.number ||
                            (paymentMethod === "BKASH"
                              ? "01892-019281"
                              : paymentMethod === "NAGAD"
                                ? "01918-293810"
                                : "01712-345678")}
                        </span>
                      </div>

                      {getMethodConfig(paymentMethod)?.counter && getMethodConfig(paymentMethod)?.account_type !== 'PERSONAL' && (
                        <div className="flex justify-between items-center">
                          <span className="text-neutral-400">
                            {"Counter No:"}
                          </span>
                          <span className="font-mono font-bold text-neutral-200 text-xs">
                            {getMethodConfig(paymentMethod)?.counter || "1"}
                          </span>
                        </div>
                      )}

                      <div className="flex justify-between items-center">
                        <span className="text-neutral-400">
                          {"Amount to Pay:"}
                        </span>
                        <span className="font-bold text-white text-xs">{formatBDT(totalPayable)}</span>
                      </div>

                      <p className="text-[10px] text-neutral-400 pt-1 border-t border-neutral-700/60 leading-relaxed">
                        {getMethodConfig(paymentMethod)?.instructions ||
                          (getMethodConfig(paymentMethod)?.account_type === 'PERSONAL'
                            ? ("Send Money to the personal number above from your mobile app and enter the Transaction ID (TrxID) below.")
                            : ("Make payment to the merchant number above from your app and enter the Transaction ID (TrxID) below."))}
                      </p>
                    </div>

                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs">
                      <div>
                        <label className="block font-semibold text-neutral-300 mb-1">
                          {"Your Wallet / Phone No *"}
                        </label>
                        <input
                          type="text"
                          value={senderWallet}
                          onChange={(e) => setSenderWallet(e.target.value)}
                          placeholder="01XXXXXXXXX"
                          className="w-full px-3 py-2 bg-neutral-800 rounded-xl border border-neutral-700 font-mono text-white text-xs focus:border-emerald-500 focus:outline-hidden"
                        />
                        {formErrors.senderWallet && (
                          <span className="text-[10px] text-rose-400 mt-0.5 block">{formErrors.senderWallet}</span>
                        )}
                      </div>

                      <div>
                        <label className="block font-semibold text-neutral-300 mb-1">
                          {"Transaction ID (TrxID) *"}
                        </label>
                        <input
                          type="text"
                          value={paymentTrxId}
                          onChange={(e) => setPaymentTrxId(e.target.value)}
                          placeholder="e.g. BK92819X"
                          className="w-full px-3 py-2 bg-neutral-800 rounded-xl border border-neutral-700 font-mono text-white text-xs uppercase focus:border-emerald-500 focus:outline-hidden"
                        />
                        {formErrors.paymentTrxId && (
                          <span className="text-[10px] text-rose-400 mt-0.5 block">{formErrors.paymentTrxId}</span>
                        )}
                      </div>
                    </div>
                  </div>
                )}
              </div>
            </div>

            {/* Right Column: Order Summary (Positioned directly under trust badges without blank gap) */}
            <div className="lg:col-span-5 p-6 sm:p-8 bg-neutral-50/80 space-y-4">
              <h3 className="text-base font-bold text-neutral-900 border-b border-neutral-200/80 pb-3">
                {"Order Summary"}
              </h3>

              {/* Product Card / Items List */}
              <div className="space-y-3 max-h-56 overflow-y-auto pr-1">
                {localItems.map((item, itemIdx) => (
                  <div
                    key={item.id || itemIdx}
                    className="flex items-center gap-3 p-3 rounded-2xl bg-white border border-neutral-200 shadow-2xs"
                  >
                    <img
                      src={item.image}
                      alt={item.name}
                      className="w-14 h-14 rounded-xl object-cover border border-neutral-200 bg-neutral-100 shrink-0"
                      referrerPolicy="no-referrer"
                    />
                    <div className="flex-1 min-w-0">
                      <h4 className="text-xs font-bold text-neutral-900 line-clamp-2 leading-tight">
                        {item.name}
                      </h4>
                      {item.variant && (
                        <p className="text-[10px] text-neutral-500 font-medium">{item.variant}</p>
                      )}
                      <div className="flex items-center justify-between mt-1">
                        <div className="flex items-center gap-1.5">
                          <span className="text-[11px] text-neutral-500">
                            {"Qty:"}
                          </span>
                          {localItems.length > 1 ? (
                            <div className="inline-flex items-center border border-neutral-200 rounded-lg overflow-hidden bg-neutral-50 text-xs">
                              <button
                                type="button"
                                onClick={() => handleItemQtyChange(itemIdx, -1)}
                                className="px-2 py-0.5 hover:bg-neutral-200 font-bold cursor-pointer select-none text-neutral-700"
                                title={"Decrease quantity"}
                              >
                                -
                              </button>
                              <span className="px-2 font-bold bg-white text-neutral-800 select-none">
                                {item.quantity}
                              </span>
                              <button
                                type="button"
                                onClick={() => handleItemQtyChange(itemIdx, 1)}
                                className="px-2 py-0.5 hover:bg-neutral-200 font-bold cursor-pointer select-none text-neutral-700"
                                title={"Increase quantity"}
                              >
                                +
                              </button>
                            </div>
                          ) : (
                            <span className="text-[11px] font-bold text-neutral-700">
                              {item.quantity} {"pcs"}
                            </span>
                          )}
                        </div>
                        <p className="text-sm font-extrabold text-emerald-800">
                          ৳{(item.price * item.quantity).toLocaleString()}
                        </p>
                      </div>
                    </div>
                  </div>
                ))}
              </div>

              {/* Promo Code Input Card */}
              <div className="bg-white rounded-2xl border border-neutral-200 p-3.5 space-y-2">
                <div className="flex items-center gap-1.5 text-xs font-bold text-neutral-800">
                  <Tag className="w-3.5 h-3.5 text-emerald-600" />
                  <span>{"Have a Promo / Coupon Code?"}</span>
                </div>
                {coupon ? (
                  <div className="flex items-center justify-between p-2.5 rounded-xl bg-emerald-50 border border-emerald-200 text-xs">
                    <div className="flex items-center gap-1.5 text-emerald-800 font-bold">
                      <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
                      <span>
                        {`Coupon '${coupon.code}' applied (-৳${discount.toLocaleString()})`}
                      </span>
                    </div>
                    <button
                      type="button"
                      onClick={handleRemoveCoupon}
                      className="text-rose-600 hover:text-rose-700 text-xs font-bold hover:underline cursor-pointer ml-2 px-1"
                    >
                      {"Remove"}
                    </button>
                  </div>
                ) : (
                  <div>
                    <div className="flex gap-2">
                      <input
                        type="text"
                        placeholder={"Promo code (e.g. WELCOME50)"}
                        value={couponCodeInput}
                        onChange={(e) => {
                          setCouponCodeInput(e.target.value);
                          if (couponError) setCouponError("");
                        }}
                        className="flex-1 px-3 py-2 bg-neutral-50 border border-neutral-200 rounded-xl text-xs uppercase font-medium placeholder:normal-case focus:bg-white focus:border-emerald-500 focus:outline-none"
                      />
                      <button
                        type="button"
                        onClick={handleApplyCoupon}
                        className="px-4 py-2 bg-neutral-900 hover:bg-neutral-800 text-white rounded-xl text-xs font-bold transition-colors cursor-pointer shrink-0"
                      >
                        {"Apply"}
                      </button>
                    </div>
                    {couponError && <p className="text-[11px] text-rose-600 mt-1 font-medium">{couponError}</p>}
                    {couponSuccess && <p className="text-[11px] text-emerald-600 mt-1 font-medium">{couponSuccess}</p>}
                  </div>
                )}
              </div>

              {/* Pricing Breakdown */}
              <div className="bg-white rounded-2xl border border-neutral-200 p-4 space-y-2 text-xs sm:text-sm">
                <div className="flex justify-between text-neutral-600">
                  <span>
                    {`Product Price (${totalItemCount} pcs):`}
                  </span>
                  <span className="font-bold text-neutral-900">৳{subtotal.toLocaleString()}</span>
                </div>

                <div className="flex justify-between text-neutral-600">
                  <span>
                    {`Delivery Fee (${district}):`}
                  </span>
                  <span className="font-bold text-neutral-900">৳{deliveryFee}</span>
                </div>

                {discount > 0 && (
                  <div className="flex justify-between text-emerald-700 font-semibold">
                    <span>{"Coupon Discount:"}</span>
                    <span>-৳{discount.toLocaleString()}</span>
                  </div>
                )}

                <div className="flex justify-between text-base font-black text-neutral-950 border-t border-neutral-200 pt-3">
                  <span>{"Total Payable:"}</span>
                  <span className="text-emerald-800 text-lg font-black">
                    ৳{totalPayable.toLocaleString()}
                  </span>
                </div>
              </div>

              {/* Trust Badges matching Screenshot 1 */}
              <div className="bg-white rounded-2xl p-4 space-y-2 text-xs text-neutral-600 border border-neutral-200">
                <div className="flex items-center gap-2">
                  <ShieldCheck className="w-4 h-4 text-emerald-600 shrink-0" />
                  <span>{"100% Secure & Verified Order"}</span>
                </div>
                <div className="flex items-center gap-2">
                  <Truck className="w-4 h-4 text-emerald-600 shrink-0" />
                  <span>{"Fastest Home Delivery Service"}</span>
                </div>
                <div className="flex items-center gap-2">
                  <RotateCcw className="w-4 h-4 text-amber-600 shrink-0" />
                  <span>{"7 Days Inspection & Replacement Warranty"}</span>
                </div>
              </div>

              {/* Confirm Order Button - Positioned DIRECTLY UNDER trust badges (eliminated blank gap) */}
              <div className="pt-2 space-y-2">
                <button
                  type="submit"
                  disabled={isSubmitting}
                  className={`w-full py-3.5 px-4 rounded-xl text-white font-extrabold text-sm sm:text-base flex items-center justify-center gap-2 shadow-lg transition-all hover:scale-[1.01] disabled:opacity-50 cursor-pointer ${
                    paymentMethod === "SSLCOMMERZ"
                      ? "bg-blue-600 hover:bg-blue-700 active:bg-blue-800 shadow-blue-600/30"
                      : "bg-emerald-600 hover:bg-emerald-700 active:bg-emerald-800 shadow-emerald-600/30"
                  }`}
                >
                  {isSubmitting ? (
                    <span>{"Processing Order..."}</span>
                  ) : paymentMethod === "SSLCOMMERZ" ? (
                    <>
                      <CreditCard className="w-4 h-4" />
                      <span>
                        {`Pay Online ৳${totalPayable.toLocaleString()} (SSLCommerz) →`}
                      </span>
                    </>
                  ) : (
                    <>
                      <Lock className="w-4 h-4" />
                      <span>
                        {"Confirm Order - ৳"}
                        {totalPayable.toLocaleString()}
                      </span>
                    </>
                  )}
                </button>

                <p className="text-center text-[10px] text-neutral-400">
                  {"By confirming, you agree to our Terms and Delivery Return Policy."}
                </p>
              </div>
            </div>
          </div>
        </form>
      </div>

      <CustomModal
        isOpen={Boolean(errorModal)}
        type="error"
        title={errorModal?.title || ""}
        message={errorModal?.message || ""}
        confirmText={"OK"}
        onClose={() => setErrorModal(null)}
      />
    </div>
  );
};

export { GuestCheckoutModal };
