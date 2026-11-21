import React, { useState, useEffect, useRef, useMemo } from "react";
import {
  Truck,
  ShieldCheck,
  RotateCcw,
  PhoneCall,
  CheckCircle2,
  ChevronDown,
  ChevronUp,
  Star,
  ShoppingBag,
  ArrowRight,
  Package,
  Zap,
  HelpCircle,
  Clock,
  Sparkles,
  Lock,
  Layers,
  AlertCircle,
  CreditCard,
  Smartphone,
  Mail,
  Tag,
  FileText
} from "lucide-react";
import { useLanguage } from "../../Context/LanguageContext";
import { COUNTRY_CODES } from "../../utils/countryCodes";
import { BANGLADESH_DISTRICTS, normalizeBangladeshPhone, getThanasForDistrict, formatBDT } from "../../utils/bangladesh";
import { DEFAULT_PAYMENT_METHODS, formatAccountTypeLabel } from "../../utils/paymentConfig";
import { DEFAULT_PRODUCT_PLACEHOLDER, handleProductImageError } from "../../utils/productImage";
import { apiClient } from "../../services/api";
import { marketingTracker } from "../../services/marketing";
import { useThemeConfig } from "../frontPanel/FrontPanelContext";
import { Campaign_Header, Product_Header } from "../Header";
import { Footer } from "../Footer";
import { getProductCampaignInfo } from "../../utils/campaignHelper";
import { getProductTagInfo, hasLimitedOfferBadge } from "../../utils/productTags";
import {
  renderTrustBadgeIcon,
  resolveEditorialConfig,
  formatEditorialCardText,
  resolveDeliveryCost,
} from "../../utils/productEditorial";
import { getLocalizedProductName } from "../../utils/translations";
import { buildBgStyle } from "../../utils/themeHelper";
import codImg from "../../assets/COD.png";
import bkashImg from "../../assets/bkash.png";
import nagadImg from "../../assets/nagad2.png";
import rocketImg from "../../assets/rocket2.png";

export function CampaignLandingPage({
  product: productProp,
  campaignConfig: customCampaignConfig,
  onOrderSuccess,
  onNavigateToView,
  isCampaignPage,
  cartItems = [],
  onOpenCart,
  currentUser,
  onOpenAuthModal,
  onLogoutUser,
  searchQuery,
  setSearchQuery,
}) {
  const { isEnglish, t } = useLanguage();
  const { themeConfig } = useThemeConfig();
  const product = productProp || {};
  const productTagInfo = getProductTagInfo(product);
  const isLimitedOfferProduct = hasLimitedOfferBadge(product);
  const prodEditorial = useMemo(() => resolveEditorialConfig(themeConfig), [themeConfig]);

  // Check if THIS specific product is in an active campaign
  const campaignInfo = useMemo(() => {
    return getProductCampaignInfo(product, themeConfig);
  }, [product, themeConfig]);

  // isCampaign is ONLY true if this product has an active campaign (and not disabled by prop)
  const isCampaign = isCampaignPage !== undefined
    ? (Boolean(isCampaignPage) && campaignInfo.isCampaign)
    : campaignInfo.isCampaign;

  const campaignConfig = isCampaign
    ? (customCampaignConfig || campaignInfo.campaignConfig || themeConfig?.campaign || {})
    : {};

  // If this product does NOT have an active campaign, ensure the browser URL reflects normal /products/{slug}
  useEffect(() => {
    if (typeof window !== "undefined" && !isCampaign && window.location.pathname.startsWith("/campaign-products")) {
      const normalSlug = product.slug || product.id;
      if (normalSlug) {
        window.history.replaceState({}, "", `/products/${normalSlug}`);
      }
    }
  }, [isCampaign, product.slug, product.id]);

  const highlightsList = useMemo(() => {
    let raw = product.hero?.highlights || product.features || product.keyFeatures;
    if (typeof raw === "string" && raw.trim()) {
      try {
        const parsed = JSON.parse(raw);
        if (Array.isArray(parsed)) raw = parsed;
      } catch {
        raw = raw.split("\n").map(s => s.trim().replace(/^[•\-\*✓\d\.]\s*/, "")).filter(Boolean);
      }
    }
    if (Array.isArray(raw) && raw.length > 0) {
      return raw.filter(Boolean);
    }
    return [];
  }, [product.hero?.highlights, product.features, product.keyFeatures]);

  // Product info underline tabs & product-specific approved reviews
  const [activeInfoTab, setActiveInfoTab] = useState("description");
  const [productReviews, setProductReviews] = useState([]);
  const [isLoadingReviews, setIsLoadingReviews] = useState(false);

  useEffect(() => {
    setActiveInfoTab("description");
    if (!product?.id) {
      setProductReviews([]);
      return;
    }
    let isMounted = true;
    setIsLoadingReviews(true);
    apiClient
      .getReviews({ approved_only: true, product_id: product.id })
      .then((data) => {
        if (!isMounted) return;
        if (Array.isArray(data) && data.length > 0) {
          const pName = (product.name || product.nameBn || "").toLowerCase();
          const list = data.filter((r) => {
            const matchId = String(r.product || r.product_id || "") === String(product.id);
            const matchName = pName && r.product_name && r.product_name.toLowerCase().includes(pName);
            return matchId || matchName;
          });
          setProductReviews(list);
        } else {
          setProductReviews([]);
        }
      })
      .catch(() => {
        if (isMounted) setProductReviews([]);
      })
      .finally(() => {
        if (isMounted) setIsLoadingReviews(false);
      });
    return () => {
      isMounted = false;
    };
  }, [product?.id, product?.name, product?.nameBn]);

  const displayName = product.name || "Premium Product";
  const displayDescription = product.descriptionEn || product.description || "";
  const displayEnName = product.name || "Premium Product";
  const primaryImage = product.image || (product.images && product.images[0]) || DEFAULT_PRODUCT_PLACEHOLDER;


  // Compute all product images including any variation images
  const images = useMemo(() => {
    const base = (product.images && product.images.length > 0) ? [...product.images] : (primaryImage ? [primaryImage] : [DEFAULT_PRODUCT_PLACEHOLDER]);
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
    return base.length > 0 ? base : [primaryImage];
  }, [product.images, primaryImage, product.variants, product.productType]);

  const isVariableProduct = product.productType === 'variable' && Array.isArray(product.variants) && product.variants.length > 0 && product.variants[0]?.options?.length > 0;

  // Active state management - always start with the product's primary display image, no variant selected initially
  const [selectedImage, setSelectedImage] = useState(primaryImage);
  const [selectedVariant, setSelectedVariant] = useState(null);
  const [selectedVariantObj, setSelectedVariantObj] = useState(null);

  const activePrice = (selectedVariantObj && typeof selectedVariantObj === 'object' && selectedVariantObj.price !== undefined && selectedVariantObj.price !== null)
    ? Number(selectedVariantObj.price)
    : Number(product.price || 0);
  const rawRegularPrice = (selectedVariantObj && typeof selectedVariantObj === 'object' && selectedVariantObj.regularPrice !== undefined && selectedVariantObj.regularPrice !== null)
    ? Number(selectedVariantObj.regularPrice)
    : Number(product.originalPrice || product.regularPrice || 0);
  const activeRegularPrice = rawRegularPrice > activePrice ? rawRegularPrice : activePrice;
  const currentPrice = activePrice;
  const originalPrice = activeRegularPrice;
  const discountAmount = Math.max(0, originalPrice - currentPrice);
  const discountPct = discountAmount > 0 && originalPrice > 0
    ? (product.discountPercent || Math.round((discountAmount / originalPrice) * 100))
    : 0;

  const [qty, setQty] = useState(1);
  const [district, setDistrict] = useState(currentUser?.district || "Dhaka");
  const [thana, setThana] = useState(currentUser?.thana || "Dhanmondi");
  const [countryCode, setCountryCode] = useState("+880");
  const [phone, setPhone] = useState(currentUser?.phone || "");
  const [email, setEmail] = useState(currentUser?.email || "");
  const [customerName, setCustomerName] = useState(currentUser?.name || currentUser?.fullName || "");
  const [firstName, setFirstName] = useState(() => {
    const raw = (currentUser?.name || currentUser?.fullName || "").trim();
    return raw ? raw.split(/\s+/)[0] : "";
  });
  const [lastName, setLastName] = useState(() => {
    const raw = (currentUser?.name || currentUser?.fullName || "").trim();
    const parts = raw ? raw.split(/\s+/) : [];
    return parts.length > 1 ? parts.slice(1).join(" ") : "";
  });
  const [fullAddress, setFullAddress] = useState(currentUser?.fullAddress || currentUser?.address || "");
  const [phoneError, setPhoneError] = useState("");
  const [emailError, setEmailError] = useState("");
  const [nameError, setNameError] = useState("");
  const [firstNameError, setFirstNameError] = useState("");
  const [lastNameError, setLastNameError] = useState("");
  const [addressError, setAddressError] = useState("");
  const [thanaError, setThanaError] = useState("");
  const [customFieldValues, setCustomFieldValues] = useState({});
  const [customFieldErrors, setCustomFieldErrors] = useState({});

  // Coupon State
  const [appliedCoupon, setAppliedCoupon] = useState(null);
  const [couponCodeInput, setCouponCodeInput] = useState("");
  const [couponError, setCouponError] = useState("");
  const [couponSuccess, setCouponSuccess] = useState("");
  const [availableCoupons, setAvailableCoupons] = useState([]);

  useEffect(() => {
    let isMounted = true;
    apiClient.getCoupons().then((coups) => {
      if (isMounted && Array.isArray(coups) && coups.length > 0) {
        setAvailableCoupons(coups);
      }
    }).catch(() => { });
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
    setAppliedCoupon(found);
    setCouponSuccess(`Coupon ${found.code} applied!`);
    setCouponCodeInput("");
  };

  const handleRemoveCoupon = (e) => {
    if (e) e.preventDefault();
    setAppliedCoupon(null);
    setCouponError("");
    setCouponSuccess("");
  };

  const activeStock = selectedVariantObj?.stock !== undefined ? selectedVariantObj.stock : product.stock;
  const isOutOfStock = Boolean(product.isOutOfStock) || (activeStock !== undefined && Number(activeStock) <= 0);

  // Sync delivery details whenever currentUser logs in or profile changes
  useEffect(() => {
    if (currentUser) {
      if (currentUser.name || currentUser.fullName) {
        const full = (currentUser.name || currentUser.fullName).trim();
        setCustomerName(full);
        const parts = full.split(/\s+/);
        setFirstName(parts[0] || "");
        setLastName(parts.length > 1 ? parts.slice(1).join(" ") : "");
      }
      if (currentUser.phone) {
        setPhone(currentUser.phone);
      }
      if (currentUser.email) {
        setEmail(currentUser.email);
      }
      if (currentUser.district) {
        setDistrict(currentUser.district);
        const thanasList = getThanasForDistrict(currentUser.district);
        setThana(currentUser.thana || thanasList[0] || "");
      } else if (currentUser.thana) {
        setThana(currentUser.thana);
      }
      if (currentUser.fullAddress || currentUser.address) {
        setFullAddress(currentUser.fullAddress || currentUser.address);
      }
    }
  }, [currentUser]);

  const lastMountedProductIdRef = useRef(null);

  // Scroll to top and initialize product details ONLY when a new product is loaded
  useEffect(() => {
    if (!product?.id) return;

    if (lastMountedProductIdRef.current !== product.id) {
      lastMountedProductIdRef.current = product.id;
      window.scrollTo({ top: 0, left: 0, behavior: "instant" });

      setSelectedVariant(null);
      setSelectedVariantObj(null);
      setSelectedImage(primaryImage);
    }
  }, [product?.id, product?.slug, product?.productType, primaryImage]);

  const availableThanas = useMemo(() => {
    return getThanasForDistrict(district);
  }, [district]);

  const handleDistrictChange = (newDistrict) => {
    setDistrict(newDistrict);
    const thanasList = getThanasForDistrict(newDistrict);
    setThana(thanasList[0] || "");
  };
  const [selectedPayment, setSelectedPayment] = useState("cod");
  const [senderWallet, setSenderWallet] = useState(currentUser?.phone || "");
  const [paymentTrxId, setPaymentTrxId] = useState("");
  const [trxError, setTrxError] = useState("");
  const [isSubmittingOrder, setIsSubmittingOrder] = useState(false);

  // Synced Payment Methods Configuration
  const [paymentConfigs, setPaymentConfigs] = useState(DEFAULT_PAYMENT_METHODS);

  useEffect(() => {
    let isMounted = true;
    apiClient.getPaymentMethods().then((methods) => {
      if (isMounted && Array.isArray(methods) && methods.length > 0) {
        setPaymentConfigs(methods);
      }
    }).catch(() => { });
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
    return ['bkash', 'nagad', 'rocket'].filter((m) => isMethodActive(m));
  }, [paymentConfigs]);

  const [activeFaq, setActiveFaq] = useState(0);
  const [slider, setSlider] = useState(50);
  const [mobileMenu, setMobileMenu] = useState(false);
  const [view, setView] = useState("landing");
  const [confirmedOrder, setConfirmedOrder] = useState(null);

  // Tracking / Pixel Events State
  const [events, setEvents] = useState([
    { type: "PageView", text: "Landing page visited", time: "just now", id: "evt_pv_01" },
    { type: "ViewContent", text: `Viewed product: ${displayName}`, time: "just now", id: "evt_vc_01", payload: `SKU: ${product.sku || 'PROD'} | ৳${currentPrice}` },
  ]);
  const [pixelDrawerOpen, setPixelDrawerOpen] = useState(false);

  const addEvent = (type, text, payload = "") => {
    setEvents((prev) => [
      {
        type,
        text,
        id: `evt_${Math.random().toString(36).slice(2, 9)}`,
        time: new Date().toLocaleTimeString(),
        payload,
      },
      ...prev,
    ].slice(0, 15));
  };

  const lastTrackedCampaignViewRef = useRef(null);

  useEffect(() => {
    if (product?.id && lastTrackedCampaignViewRef.current !== product.id) {
      lastTrackedCampaignViewRef.current = product.id;
      addEvent("ViewContent", `Viewing: ${displayName}`, `SKU: ${product.sku || product.id} | ৳${currentPrice}`);
      marketingTracker.track(
        "ViewContent",
        {
          productId: product.id,
          name: displayName,
          value: currentPrice,
          currency: "BDT",
          source: "campaign_landing",
          campaign: product.slug || "",
        },
        { productId: product.id, campaign: product.slug || "" }
      );
    }
  }, [product?.id]);

  // Zoom state on desktop
  const [zoomStyle, setZoomStyle] = useState({
    transformOrigin: 'center center',
    transform: 'scale(1)',
    transition: 'transform 0.25s ease-out'
  });
  const imageContainerRef = useRef(null);

  useEffect(() => {
    if (primaryImage && !selectedImage) {
      setSelectedImage(primaryImage);
    }
  }, [primaryImage, selectedImage]);

  const subtotal = currentPrice * qty;

  const deliveryResolution = useMemo(() => {
    return resolveDeliveryCost(district, subtotal, prodEditorial);
  }, [district, subtotal, prodEditorial]);

  const deliveryZone = deliveryResolution.zoneKey;
  const deliveryFee = deliveryResolution.fee;

  const couponDiscount = appliedCoupon
    ? appliedCoupon.discountType === "percentage"
      ? Math.round((subtotal * appliedCoupon.value) / 100)
      : appliedCoupon.value
    : 0;
  const total = Math.max(0, subtotal + deliveryFee - couponDiscount);

  // Desktop hover zoom handler
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

  const scrollToCheckout = () => {
    setView("landing");
    addEvent("InitiateCheckout", `Customer started checkout for ${displayName}`, `Qty: ${qty} | Total: ৳${total}`);
    setTimeout(() => {
      document.getElementById("checkout-section")?.scrollIntoView({ behavior: "smooth" });
    }, 50);
  };

  const scrollToSection = (id) => {
    setView("landing");
    setTimeout(() => {
      let el = document.getElementById(id);
      if (!el) {
        el = document.getElementById("product-description") || document.getElementById("checkout-section");
      }
      if (el) {
        el.scrollIntoView({ behavior: "smooth" });
      }
    }, 50);
  };

  const handleOrderSubmit = async (e) => {
    e.preventDefault();
    setPhoneError("");
    setEmailError("");
    setNameError("");
    setFirstNameError("");
    setLastNameError("");
    setAddressError("");
    setThanaError("");
    setCustomFieldErrors({});

    const activeFields = (prodEditorial.checkoutFields || []).filter((f) => f && f.enabled !== false);
    const findField = (key) => activeFields.find((f) => f.key === key);

    const nameField = findField("full_name");
    const emailField = findField("email");
    const phoneField = findField("phone");
    const districtField = findField("district");
    const thanaField = findField("thana");
    const addressField = findField("full_address");

    let hasError = false;
    let firstInvalidElementId = null;
    const markInvalid = (elId) => {
      hasError = true;
      if (!firstInvalidElementId) firstInvalidElementId = elId;
    };

    if (nameField) {
      if (nameField.nameSplitMode) {
        if (nameField.required !== false && !firstName.trim()) {
          setFirstNameError(nameField.errorMessage || "Please enter your first name");
          markInvalid("checkout-first-name");
        }
        if (nameField.required !== false && !lastName.trim()) {
          setLastNameError("Please enter your last name");
          markInvalid("checkout-last-name");
        }
      } else if (nameField.required !== false && !customerName.trim()) {
        setNameError(nameField.errorMessage || "Please enter your full name");
        markInvalid("checkout-full-name");
      }
    }

    const resolvedEmail = emailField ? email.trim() : "";
    if (emailField) {
      if (emailField.required && !resolvedEmail) {
        setEmailError(emailField.errorMessage || "Please enter your email address");
        markInvalid("checkout-email");
      } else if (resolvedEmail && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(resolvedEmail)) {
        setEmailError("Please enter a valid email address (e.g. name@example.com)");
        markInvalid("checkout-email");
      }
    }

    let normalizedPhone = phone.trim();
    if (!phoneField || phoneField.required !== false || normalizedPhone) {
      if (countryCode === "+880") {
        normalizedPhone = normalizeBangladeshPhone(phone);
        if (!/^01[3-9]\d{8}$/.test(normalizedPhone)) {
          setPhoneError(
            phoneField?.errorMessage ||
              "Please enter a valid 11-digit Bangladeshi mobile number (01XXXXXXXXX)"
          );
          markInvalid("checkout-phone");
        }
      } else {
        const digits = phone.replace(/\D/g, "");
        if (digits.length < 6) {
          setPhoneError(phoneField?.errorMessage || "Please enter a valid phone number");
          markInvalid("checkout-phone");
        }
        normalizedPhone = `${countryCode}${digits}`;
      }
    }

    if (thanaField && thanaField.required !== false && !thana.trim()) {
      setThanaError(thanaField.errorMessage || "Please select thana or area");
      markInvalid("checkout-thana");
    }

    if (addressField && addressField.required !== false && (!fullAddress.trim() || fullAddress.trim().length < 6)) {
      setAddressError(addressField.errorMessage || "Please enter your full address (house, road, area)");
      markInvalid("checkout-full-address");
    }

    // Validate dynamic custom fields
    const nextCustomErrors = {};
    const customFieldsPayload = [];
    for (const cf of activeFields) {
      if (cf.core) continue;
      const fKey = cf.key || cf.id;
      const rawVal = customFieldValues[fKey] !== undefined ? customFieldValues[fKey] : (cf.defaultValue ?? "");
      if (cf.type === "checkbox") {
        if (cf.required && !rawVal) {
          nextCustomErrors[fKey] = cf.errorMessage || `${cf.label} is required`;
          markInvalid(`checkout-custom-${fKey}`);
        }
        if (rawVal) {
          customFieldsPayload.push({ key: fKey, label: cf.label || fKey, value: "Yes" });
        }
      } else {
        const strVal = String(rawVal || "").trim();
        if (cf.required && !strVal) {
          nextCustomErrors[fKey] = cf.errorMessage || `Please enter ${cf.label || fKey}`;
          markInvalid(`checkout-custom-${fKey}`);
        } else if (cf.type === "email" && strVal && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(strVal)) {
          nextCustomErrors[fKey] = "Please enter a valid email address";
          markInvalid(`checkout-custom-${fKey}`);
        }
        if (strVal) {
          customFieldsPayload.push({ key: fKey, label: cf.label || fKey, value: strVal });
        }
      }
    }
    if (Object.keys(nextCustomErrors).length > 0) {
      setCustomFieldErrors(nextCustomErrors);
    }

    const isManualMfs = selectedPayment === "bkash" || selectedPayment === "nagad" || selectedPayment === "rocket";
    if (isManualMfs) {
      if (!senderWallet.trim() || !paymentTrxId.trim()) {
        setTrxError(
          "Please enter your wallet number and transaction ID (TrxID) to confirm payment."
        );
        hasError = true;
      }
    }

    if (hasError) {
      if (firstInvalidElementId) {
        setTimeout(() => {
          document.getElementById(firstInvalidElementId)?.focus();
        }, 0);
      }
      return;
    }

    setIsSubmittingOrder(true);
    const name = nameField
      ? (nameField.nameSplitMode
          ? `${firstName.trim()} ${lastName.trim()}`.trim()
          : customerName.trim()) || "Guest Customer"
      : "Guest Customer";
    const resolvedDistrict = districtField ? district : "Dhaka";
    const resolvedThana = thanaField ? thana.trim() : "";
    const address = addressField ? fullAddress.trim() : "";
    const orderId = `BD-${Math.floor(100000 + Math.random() * 900000)}`;

    const effectiveMethod = selectedPayment === "cod"
      ? "COD"
      : selectedPayment === "sslcommerz"
        ? "SSLCOMMERZ"
        : selectedPayment.toUpperCase();

    const orderPayload = {
      items: [
        {
          productId: product.id || "prod-custom",
          name: displayName,
          price: currentPrice,
          quantity: qty,
          image: selectedImage || primaryImage,
          sku: selectedVariantObj?.sku || product.sku || "PROD-GEN",
          variant: typeof selectedVariant === 'object' ? selectedVariant?.name : selectedVariant,
        }
      ],
      customerEmail: resolvedEmail,
      address: {
        fullName: name,
        customerName: name,
        ...(nameField?.nameSplitMode ? { firstName: firstName.trim(), lastName: lastName.trim() } : {}),
        phone: normalizedPhone,
        email: resolvedEmail,
        address: [
          address || "Not provided",
          resolvedThana ? `Thana: ${resolvedThana}` : "",
          `District: ${resolvedDistrict}`,
        ].filter(Boolean).join(", "),
        fullAddress: address || "Not provided",
        district: resolvedDistrict,
        thana: resolvedThana || (resolvedDistrict === "Dhaka" ? "Dhaka City" : "General"),
        deliveryZone,
        customFields: customFieldsPayload.length > 0 ? customFieldsPayload : undefined,
        paymentTrxId: isManualMfs ? paymentTrxId.trim() : undefined,
        senderWallet: isManualMfs ? senderWallet.trim() : undefined,
      },
      subtotal,
      deliveryFee,
      discount: couponDiscount,
      totalAmount: total,
      paymentMethod: effectiveMethod,
      paymentTrxId: isManualMfs ? paymentTrxId.trim() : undefined,
      senderWallet: isManualMfs ? senderWallet.trim() : undefined,
      couponCode: appliedCoupon?.code,
      utm: { source: 'facebook', campaign: product.slug || 'special_deal', sku: product.sku || 'PROD' },
    };

    try {
      // For SSLCommerz: initiate gateway session FIRST without creating an Order until payment succeeds
      if (selectedPayment === "sslcommerz") {
        const payInit = await apiClient.initiatePayment({
          ...orderPayload,
          amount: total,
          customerData: {
            customerName: name,
            phone: normalizedPhone,
            email: resolvedEmail,
            district: resolvedDistrict,
            fullAddress: address,
          }
        });

        if (payInit && payInit.success && payInit.gatewayUrl) {
          window.location.href = payInit.gatewayUrl;
          return;
        }
        setTrxError(
          payInit?.message ||
            "SSLCommerz gateway could not be initiated. Please check gateway configuration or choose another payment method."
        );
        return;
      }

      const result = await apiClient.checkout(orderPayload);
      if (!result || !result.success || !result.order) {
        setTrxError(result?.message || "Failed to place order. Please try again.");
        return;
      }
      const createdOrder = result.order;

      addEvent("Purchase", `Order confirmed ${createdOrder.id}`, `${displayName} × ${qty} | ৳${total} (${effectiveMethod})`);
      marketingTracker.track("Purchase", {
        orderId: createdOrder.id,
        value: total,
        productId: product?.id || "",
        productName: displayName,
        name: displayName,
        source: "campaign_landing",
        campaign: product?.slug || "",
        items: [{ id: product?.id, name: displayName, quantity: qty, price: currentPrice }],
      });

      // Clear cart from local storage immediately as order is placed
      try {
        localStorage.removeItem("amardokan_cart");
        localStorage.setItem("amardokan_cart", "[]");
      } catch { }

      if (onOrderSuccess) {
        onOrderSuccess(createdOrder);
      }

      setConfirmedOrder(createdOrder);
      setView("confirmation");
      window.scrollTo({ top: 0, behavior: "smooth" });
    } catch (err) {
      console.error("Order submission error:", err);
      setTrxError(err?.message || "Server connection error while placing order. Please try again.");
    } finally {
      setIsSubmittingOrder(false);
    }
  };

  const pp = themeConfig?.themesColors?.productPage || {};
  const prodPageBgStyle = buildBgStyle(
    {
      bgType: pp.pageBgType || "solid",
      solidBg: pp.pageBgColor || "#f8fafc",
      gradientFrom: pp.pageGradientFrom || "#f8fafc",
      gradientTo: pp.pageGradientTo || "#f0fdf4",
      gradientDirection: "to bottom",
    },
    "#f8fafc"
  );

  return (
    <div
      style={prodPageBgStyle}
      className="min-h-screen bg-slate-50 text-neutral-900 font-sans selection:bg-emerald-600 selection:text-white amardokan-storefront-root"
    >
      {/* Extracted Header Component */}
      {isCampaign ? (
        <Campaign_Header
          onNavigateToView={onNavigateToView}
          scrollToCheckout={scrollToCheckout}
          currentPrice={currentPrice}
          product={product}
        />
      ) : (
        <Product_Header
          product={product}
          onBackToStore={() => onNavigateToView ? onNavigateToView("store") : null}
          onNavigateToView={onNavigateToView}
          onOpenCart={onOpenCart}
          cartItems={cartItems}
          currentUser={currentUser}
          onOpenAuthModal={onOpenAuthModal}
          onLogoutUser={onLogoutUser}
          searchQuery={searchQuery}
          setSearchQuery={setSearchQuery}
        />
      )}

      {/* VIEW: ORDER CONFIRMATION */}
      {view === "confirmation" && confirmedOrder && (
        <main className="max-w-3xl mx-auto px-4 py-12">
          <div className="bg-white rounded-3xl border border-emerald-200 shadow-xl p-6 sm:p-10 text-center">
            <div className="w-20 h-20 rounded-full bg-emerald-100 text-emerald-700 mx-auto flex items-center justify-center text-4xl mb-4 shadow-inner">
              ✓
            </div>
            <span className="inline-block px-3 py-1 rounded-full bg-emerald-100 text-emerald-800 text-xs font-bold uppercase tracking-wider mb-2">
              Order Confirmed
            </span>
            <h1 className="text-2xl sm:text-3xl font-black text-neutral-900 mb-2">
              Thank you! Your order has been placed successfully
            </h1>
            <p className="text-sm text-neutral-600 mb-6 max-w-md mx-auto">
              Our representative will contact you shortly to confirm your order details and dispatch your package via express courier.
            </p>

            <div className="inline-flex items-center gap-2 px-4 py-2 rounded-2xl bg-slate-100 border border-neutral-200 text-sm font-bold text-neutral-900 mb-6">
              <span>Order Number:</span>
              <span className="text-emerald-700 font-extrabold">{confirmedOrder.id}</span>
            </div>

            <div className="bg-slate-50 rounded-2xl border border-neutral-200 p-5 text-left mb-6 space-y-3 text-xs sm:text-sm">
              <div className="flex justify-between border-b border-neutral-200 pb-2">
                <span className="text-neutral-500">Customer Name:</span>
                <span className="font-bold text-neutral-900">{confirmedOrder.customerName}</span>
              </div>
              <div className="flex justify-between border-b border-neutral-200 pb-2">
                <span className="text-neutral-500">Mobile Number:</span>
                <span className="font-bold text-neutral-900">{confirmedOrder.address.phone}</span>
              </div>
              <div className="flex justify-between border-b border-neutral-200 pb-2">
                <span className="text-neutral-500">Delivery Address:</span>
                <span className="font-bold text-neutral-900">{confirmedOrder.address.address}</span>
              </div>
              <div className="flex justify-between border-b border-neutral-200 pb-2">
                <span className="text-neutral-500">Product:</span>
                <span className="font-bold text-neutral-900">{qty} × {displayName}</span>
              </div>
              <div className="flex justify-between pt-1 text-base font-extrabold text-neutral-900">
                <span>Total Payable (Cash on Delivery):</span>
                <span className="text-emerald-700">৳{confirmedOrder.totalAmount}</span>
              </div>
            </div>

            <div className="flex flex-wrap items-center justify-center gap-3">
              <button
                onClick={() => {
                  if (onNavigateToView) onNavigateToView("store");
                  else setView("landing");
                }}
                className="px-6 py-3 rounded-xl bg-neutral-900 hover:bg-neutral-800 text-white font-bold text-xs sm:text-sm transition-colors cursor-pointer"
              >
                ← Continue Shopping
              </button>
              <button
                onClick={() => {
                  if (onNavigateToView) onNavigateToView("track");
                }}
                className="px-6 py-3 rounded-xl border border-emerald-700 bg-emerald-50 hover:bg-emerald-100 text-emerald-800 font-bold text-xs sm:text-sm transition-colors cursor-pointer flex items-center gap-2"
              >
                <Package className="w-4 h-4 text-emerald-700" />
                <span>Track Order</span>
              </button>
            </div>
          </div>
        </main>
      )}

      {/* VIEW: LANDING PAGE */}
      {view === "landing" && (
        <main className="space-y-12 sm:space-y-16 pb-24 md:pb-16">
          {/* 3. HERO SECTION (Default & Campaign Bar) */}
          <section id="hero" className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 pt-6 sm:pt-10">
              {isCampaign && campaignConfig?.headline && (
                <div className="mb-4 p-4 bg-gradient-to-r from-emerald-800 via-emerald-700 to-teal-800 text-white rounded-3xl shadow-lg border border-emerald-600/40 flex flex-col sm:flex-row sm:items-center justify-between gap-3 animate-in fade-in">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-2xl bg-amber-400 text-neutral-950 flex items-center justify-center font-black shrink-0 shadow-md">
                      <Zap className="w-5 h-5 fill-neutral-950" />
                    </div>
                    <div>
                      <h2 className="text-sm sm:text-base font-black tracking-tight">{campaignConfig.headline}</h2>
                      {campaignConfig.subheadline && (
                        <p className="text-xs text-emerald-100 mt-0.5">{campaignConfig.subheadline}</p>
                      )}
                    </div>
                  </div>
                  {campaignConfig.urgencyText && (
                    <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-xl bg-black/30 border border-white/10 text-amber-300 text-xs font-bold shrink-0 self-start sm:self-auto">
                      <Clock className="w-3.5 h-3.5" />
                      <span>{campaignConfig.urgencyText}</span>
                    </div>
                  )}
                </div>
              )}

              <div
                style={{
                  backgroundColor: pp.cardBg || undefined,
                  borderColor: pp.cardBorderColor || undefined,
                }}
                className="bg-white rounded-3xl border border-neutral-200 shadow-xl overflow-hidden p-6 sm:p-10 grid grid-cols-1 lg:grid-cols-12 gap-8 items-center"
              >
                {/* Left Column: Product Info & Copy */}
                <div className="lg:col-span-7 space-y-4">
                  {/* Badge & Bengali Title */}
                  <div className="flex flex-wrap items-center gap-2">
                    <span
                      style={{
                        backgroundColor: pp.badgeBg || undefined,
                        color: pp.badgeText || undefined,
                        borderColor: pp.badgeBg || undefined,
                      }}
                      className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-emerald-100 border border-emerald-300 text-emerald-900 font-bold text-xs"
                    >
                      <Sparkles className="w-3.5 h-3.5" style={{ color: pp.badgeText || undefined }} />
                      <span>{isCampaign ? (campaignConfig?.badgeText || productTagInfo?.label || product.badge || "Hot Selling Product") : (productTagInfo?.label || product.badge || "Original Product")}</span>
                    </span>
                    {product.category && (
                      <span className="text-xs text-neutral-500 font-semibold uppercase tracking-wider">
                        • {product.category}
                      </span>
                    )}
                  </div>

                  <h1
                    style={{ color: pp.titleColor || undefined }}
                    className="text-2xl sm:text-4xl lg:text-4xl font-black text-neutral-950 leading-tight"
                  >
                    {displayName}
                  </h1>

                  {/* Subheadline from dynamic data */}
                  <p
                    style={{ color: pp.subtitleColor || undefined }}
                    className="text-sm sm:text-base text-neutral-600 leading-relaxed"
                  >
                    {product.shortDescription || product.hero?.subheadline || "Premium quality and elegant design, the perfect solution for your daily lifestyle."}
                  </p>

                  {/* Highlights List (Only displayed if features exist, no dummy defaults) */}
                  {highlightsList.length > 0 && (
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5 pt-2">
                      {highlightsList.map((item, i) => (
                        <div key={i} className="flex items-start gap-2 text-xs sm:text-sm font-medium text-neutral-800">
                          <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0 mt-0.5" />
                          <span>{typeof item === "object" ? (item.title || item.name || item.text) : String(item)}</span>
                        </div>
                      ))}
                    </div>
                  )}

                  {/* Price Display */}
                  <div className="pt-3">
                    <div
                      style={{
                        backgroundColor: pp.priceBoxBg || undefined,
                        borderColor: pp.priceBoxBorder || undefined,
                      }}
                      className="inline-flex items-baseline gap-3 p-4 rounded-2xl bg-emerald-50/80 border border-emerald-200"
                    >
                      <div>
                        <div className="text-xs text-neutral-500 font-medium">Special Price:</div>
                        <div
                          style={{ color: pp.priceTextColor || undefined }}
                          className="text-3xl sm:text-4xl font-black text-emerald-800"
                        >
                          ৳{currentPrice.toLocaleString()}
                        </div>
                      </div>
                      {originalPrice > currentPrice && (
                        <div>
                          <div className="text-xs text-neutral-400">Regular Price:</div>
                          <div className="text-sm sm:text-base text-neutral-400 line-through font-semibold">
                            ৳{originalPrice.toLocaleString()}
                          </div>
                        </div>
                      )}
                      {discountAmount > 0 && (
                        <span className="px-3 py-1 rounded-full bg-amber-400 text-neutral-950 font-black text-xs shadow-xs">
                          {discountPct}% OFF
                        </span>
                      )}
                    </div>
                  </div>

                  {/* Variant Selector for Variable Products */}
                  {isVariableProduct && product.variants && product.variants.length > 0 && (
                    <div className="space-y-2">
                      {product.variants.map((vGroup, gIdx) => {
                        const options = Array.isArray(vGroup.options) ? vGroup.options : [];
                        if (options.length === 0) return null;
                        const activeSelectedName = typeof selectedVariant === 'object' ? (selectedVariant?.name || '') : (selectedVariant || '');
                        const groupHasSelected = options.some(o => (typeof o === 'object' ? o.name : o) === activeSelectedName);

                        return (
                          <div key={gIdx} className="p-3 bg-white rounded-2xl border border-neutral-200 shadow-2xs space-y-2">
                            <div className="flex items-center justify-between">
                              <span className="text-xs font-bold text-neutral-800 flex items-center gap-1.5">
                                <Layers className="w-3.5 h-3.5 text-emerald-600" />
                                <span>Select {vGroup.name || "Option"}:</span>
                              </span>
                              {groupHasSelected && (
                                <span className="text-[11px] font-bold text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded-full">
                                  {activeSelectedName}
                                </span>
                              )}
                            </div>
                            <div className="flex flex-wrap gap-2">
                              {options.map((opt, idx) => {
                                const optName = typeof opt === 'object' ? (opt.name || '') : opt;
                                const optImg = typeof opt === 'object' ? opt.image : images[idx];
                                const isSelected = activeSelectedName === optName;

                                return (
                                  <button
                                    key={idx}
                                    type="button"
                                    onClick={() => {
                                      if (isSelected) {
                                        // Toggle off: deselect and reset to default image
                                        setSelectedVariant(null);
                                        setSelectedVariantObj(null);
                                        setSelectedImage(primaryImage);
                                      } else {
                                        setSelectedVariant(optName);
                                        setSelectedVariantObj(opt);
                                        if (optImg) setSelectedImage(optImg);
                                      }
                                    }}
                                    className={`flex items-center gap-2 px-3 py-1.5 rounded-xl border text-xs font-semibold transition-all cursor-pointer ${isSelected
                                      ? 'bg-neutral-900 text-white border-neutral-900 shadow-xs scale-[1.02]'
                                      : 'bg-neutral-50 text-neutral-700 border-neutral-200 hover:border-emerald-500 hover:bg-white'
                                      }`}
                                  >
                                    {optImg && (
                                      <span className="w-4 h-4 rounded-md overflow-hidden shrink-0 inline-block bg-neutral-200">
                                        <img src={optImg} alt="" className="w-full h-full object-cover" />
                                      </span>
                                    )}
                                    <span>{optName}</span>
                                  </button>
                                );
                              })}
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  )}

                  {/* Action Buttons */}
                  <div className="flex flex-wrap items-center gap-3 pt-2">
                    <button
                      onClick={scrollToCheckout}
                      style={{
                        backgroundColor: pp.primaryBtnBg || undefined,
                        color: pp.primaryBtnText || undefined,
                      }}
                      className="py-3.5 px-7 rounded-xl bg-orange-500 hover:bg-orange-600 active:scale-95 text-white font-extrabold text-sm sm:text-base flex items-center gap-2 shadow-lg shadow-neutral-950/25 transition-all cursor-pointer"
                    >
                      <ShoppingBag className="w-4 h-4" />
                      <span>{product.cta?.primary || "Order Now"} →</span>
                    </button>

                    <button
                      onClick={() => scrollToSection("product-description")}
                      style={{
                        backgroundColor: pp.secondaryBtnBg || undefined,
                        color: pp.secondaryBtnText || undefined,
                        borderColor: pp.secondaryBtnBorder || undefined,
                      }}
                      className="py-3.5 px-5 rounded-xl border border-neutral-300 hover:bg-neutral-100 text-neutral-700 font-bold text-xs sm:text-sm transition-colors cursor-pointer"
                    >
                      <span>{product.cta?.secondary || "Learn More"}</span>
                    </button>
                  </div>

                  {/* Delivery Guarantee Badges */}
                  <div className="grid grid-cols-3 gap-2 pt-3 border-t border-neutral-100 text-[11px] text-neutral-600">
                    <div className="flex items-center gap-1.5">
                      <Truck className="w-3.5 h-3.5 text-emerald-600" />
                      <span>Cash on Delivery Nationwide</span>
                    </div>
                    <div className="flex items-center gap-1.5">
                      <ShieldCheck className="w-3.5 h-3.5 text-emerald-600" />
                      <span>Inspect Before Pay</span>
                    </div>
                    <div className="flex items-center gap-1.5">
                      <RotateCcw className="w-3.5 h-3.5 text-amber-600" />
                      <span>7-Day Replacement</span>
                    </div>
                  </div>
                </div>

                {/* Right Column: Interactive Zoom Product Image */}
                <div className="lg:col-span-5 flex flex-col items-center">
                  <div
                    ref={imageContainerRef}
                    onMouseMove={handleMouseMove}
                    onMouseLeave={handleMouseLeave}
                    className="relative w-full aspect-square rounded-2xl overflow-hidden bg-neutral-100 border border-neutral-200 shadow-md cursor-crosshair group"
                  >
                    <img
                      src={selectedImage || primaryImage}
                      alt={displayName}
                      style={zoomStyle}
                      className="w-full h-full object-cover select-none pointer-events-none"
                      onError={handleProductImageError}
                    />

                    {/* Badges on image */}
                    <span className="absolute top-3 left-3 bg-emerald-800 text-white text-[11px] font-bold px-2.5 py-1 rounded-full shadow-md pointer-events-none">
                      {productTagInfo?.label || product.badge || "Special Offer"}
                    </span>
                    {discountAmount > 0 && (
                      <span className="absolute top-3 right-3 bg-rose-600 text-white text-[11px] font-black px-2.5 py-1 rounded-full shadow-md pointer-events-none">
                        Save ৳{discountAmount}
                      </span>
                    )}

                    {/* Zoom hint overlay */}
                    <div className="absolute bottom-2 inset-x-2 bg-neutral-950/70 text-white text-[10px] py-1 px-2 rounded-lg text-center backdrop-blur-xs opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none">
                      🔍 Move mouse or touch to zoom details
                    </div>
                  </div>

                  {/* Thumbnails if multiple images exist */}
                  {images.length > 1 && (
                    <div className="flex gap-2 mt-3 overflow-x-auto w-full pb-1 justify-center">
                      {images.map((img, idx) => (
                        <button
                          key={idx}
                          onClick={() => {
                            setSelectedImage(img);
                            if (isVariableProduct && Array.isArray(product.variants)) {
                              let matched = false;
                              for (const vGrp of product.variants) {
                                if (Array.isArray(vGrp?.options)) {
                                  const matchedOpt = vGrp.options.find((o, oIdx) => {
                                    const oImg = typeof o === 'object' ? o.image : images[oIdx];
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
                                setSelectedVariant(null);
                                setSelectedVariantObj(null);
                              }
                            }
                          }}
                          className={`w-14 h-14 rounded-xl overflow-hidden border-2 transition-all shrink-0 cursor-pointer ${selectedImage === img
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
              </div>
            </section>

          {/* 4. PROBLEM AGITATION & SOLUTION SECTION */}
          {(product.problems?.length > 0 || product.solution) && (
            <section id="problem-solution" className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 scroll-mt-20">
              <div className="text-center max-w-2xl mx-auto mb-8">
                <span className="px-3 py-1 rounded-full bg-amber-100 text-amber-900 font-bold text-xs uppercase tracking-wider">
                  Why You Need This
                </span>
                <h2 className="text-2xl sm:text-3xl font-black text-neutral-900 mt-2">
                  Say Goodbye To Everyday Inconveniences
                </h2>
              </div>

              {/* Problems Grid */}
              {product.problems?.length > 0 && (
                <div className="grid grid-cols-1 md:grid-cols-3 gap-5 mb-8">
                  {product.problems.map((prob, i) => (
                    <div
                      key={i}
                      className="bg-white rounded-2xl border border-rose-100 p-6 shadow-sm hover:shadow-md transition-shadow relative overflow-hidden"
                    >
                      <div className="w-1.5 h-full bg-rose-500 absolute left-0 top-0" />
                      <span className="text-[11px] font-extrabold text-rose-600 tracking-wider">
                        {prob.num || `Issue #${i + 1}`}
                      </span>
                      <h3 className="text-base font-bold text-neutral-900 mt-1 mb-2">
                        {prob.title}
                      </h3>
                      <p className="text-xs sm:text-sm text-neutral-600 leading-relaxed">
                        {prob.text}
                      </p>
                    </div>
                  ))}
                </div>
              )}

              {/* Solution Panel - Deep Green Brand Surface */}
              {product.solution && (
                <div className="rounded-3xl bg-gradient-to-br from-emerald-950 via-emerald-900 to-emerald-950 text-white p-6 sm:p-10 shadow-xl border border-emerald-800">
                  <div className="max-w-3xl mx-auto text-center space-y-4">
                    <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-emerald-800/80 text-amber-300 font-bold text-xs uppercase tracking-widest border border-emerald-700">
                      ★ Smart & Proven Solution
                    </span>
                    <h3 className="text-2xl sm:text-4xl font-black text-white">
                      {product.solution.title}
                    </h3>
                    <p className="text-sm sm:text-base text-emerald-100/90 leading-relaxed font-normal">
                      {product.solution.description}
                    </p>
                    <div className="pt-2">
                      <button
                        onClick={scrollToCheckout}
                        className="py-3 px-6 rounded-xl bg-amber-400 hover:bg-amber-300 text-neutral-950 font-black text-sm shadow-lg transition-transform active:scale-95 cursor-pointer"
                      >
                        Get the Solution Now — Only ৳{currentPrice} →
                      </button>
                    </div>
                  </div>
                </div>
              )}
            </section>
          )}

          {/* 5. BENEFITS SECTION */}
          {product.benefits?.length > 0 && (
            <section className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
              <div className="text-center max-w-2xl mx-auto mb-8">
                <span className="px-3 py-1 rounded-full bg-emerald-100 text-emerald-800 font-bold text-xs uppercase tracking-wider">
                  Key Features & Benefits
                </span>
                <h2 className="text-2xl sm:text-3xl font-black text-neutral-900 mt-2">
                  Why Is This The Best Choice For You?
                </h2>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-5">
                {product.benefits.map((b, i) => (
                  <div
                    key={i}
                    className="bg-white rounded-2xl border border-neutral-200 p-6 shadow-sm hover:border-emerald-400 hover:shadow-md transition-all flex flex-col justify-between"
                  >
                    <div>
                      <div className="w-12 h-12 rounded-xl bg-emerald-50 text-2xl flex items-center justify-center mb-4 border border-emerald-100">
                        {b.icon || "✓"}
                      </div>
                      <h4 className="text-base font-bold text-neutral-900 mb-2">
                        {b.title}
                      </h4>
                      <p className="text-xs sm:text-sm text-neutral-600 leading-relaxed">
                        {b.text}
                      </p>
                    </div>
                  </div>
                ))}
              </div>
            </section>
          )}

          {/* 6. PRODUCT DESCRIPTION, REVIEWS & DETAILS (Underline Tab Menu) */}
          <section id="product-description" className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 scroll-mt-20">
            <div
              style={{
                backgroundColor: pp.cardBg || undefined,
                borderColor: pp.cardBorderColor || undefined,
              }}
              className="bg-white rounded-3xl border border-neutral-200 overflow-hidden shadow-sm p-6 sm:p-10"
            >
              {/* Clean Text Tabs with Bottom Underline */}
              <div className="flex items-center gap-6 sm:gap-8 border-b border-neutral-200 overflow-x-auto no-scrollbar mb-6">
                <button
                  type="button"
                  onClick={() => setActiveInfoTab("description")}
                  style={
                    activeInfoTab === "description"
                      ? { color: pp.tabActiveColor || undefined, borderBottomColor: pp.tabActiveBorderColor || undefined }
                      : { color: pp.tabInactiveColor || undefined }
                  }
                  className={`pb-3.5 text-sm sm:text-base font-bold whitespace-nowrap border-b-2 transition-colors cursor-pointer -mb-px ${
                    activeInfoTab === "description"
                      ? "border-emerald-700 text-emerald-800"
                      : "border-transparent text-neutral-500 hover:text-neutral-900"
                  }`}
                >
                  Description
                </button>

                <button
                  type="button"
                  onClick={() => setActiveInfoTab("reviews")}
                  style={
                    activeInfoTab === "reviews"
                      ? { color: pp.tabActiveColor || undefined, borderBottomColor: pp.tabActiveBorderColor || undefined }
                      : { color: pp.tabInactiveColor || undefined }
                  }
                  className={`pb-3.5 text-sm sm:text-base font-bold whitespace-nowrap border-b-2 transition-colors cursor-pointer -mb-px flex items-center gap-1.5 ${
                    activeInfoTab === "reviews"
                      ? "border-emerald-700 text-emerald-800"
                      : "border-transparent text-neutral-500 hover:text-neutral-900"
                  }`}
                >
                  <span>Reviews</span>
                  <span className="text-xs font-semibold text-neutral-400">
                    ({productReviews.length})
                  </span>
                </button>

                {product.specifications?.length > 0 && (
                  <button
                    type="button"
                    onClick={() => setActiveInfoTab("specs")}
                    style={
                      activeInfoTab === "specs"
                        ? { color: pp.tabActiveColor || undefined, borderBottomColor: pp.tabActiveBorderColor || undefined }
                        : { color: pp.tabInactiveColor || undefined }
                    }
                    className={`pb-3.5 text-sm sm:text-base font-bold whitespace-nowrap border-b-2 transition-colors cursor-pointer -mb-px ${
                      activeInfoTab === "specs"
                        ? "border-emerald-700 text-emerald-800"
                        : "border-transparent text-neutral-500 hover:text-neutral-900"
                    }`}
                  >
                    Specifications
                  </button>
                )}
              </div>

              {/* Tab Panel: Description */}
              {activeInfoTab === "description" && (
                <div className="text-sm sm:text-base text-neutral-700 leading-relaxed whitespace-pre-line font-bn space-y-4">
                  {(displayDescription && displayDescription.trim()) ||
                  (product.descriptionBn && product.descriptionBn.trim()) ||
                  (product.description && product.description.trim()) ? (
                    displayDescription || product.descriptionBn || product.description
                  ) : (
                    <p className="text-neutral-500 text-sm">
                      {product.shortDescription || "100% authentic quality product with nationwide Cash on Delivery."}
                    </p>
                  )}
                </div>
              )}

              {/* Tab Panel: Product Reviews */}
              {activeInfoTab === "reviews" && (
                <div className="space-y-6">
                  {isLoadingReviews ? (
                    <div className="py-10 text-center text-sm text-neutral-500">
                      Loading customer reviews...
                    </div>
                  ) : productReviews.length === 0 ? (
                    <div className="py-10 text-center space-y-2">
                      <div className="w-12 h-12 mx-auto rounded-2xl bg-emerald-50 border border-emerald-100 flex items-center justify-center">
                        <Star className="w-6 h-6 fill-amber-400 text-amber-400" />
                      </div>
                      <h4 className="text-base font-bold text-neutral-900">
                        No reviews yet for this product
                      </h4>
                      <p className="text-xs sm:text-sm text-neutral-500 max-w-md mx-auto">
                        Verified reviews from customers who order and receive this product will appear right here.
                      </p>
                    </div>
                  ) : (
                    <>
                      {/* Rating Summary */}
                      <div className="flex flex-wrap items-center justify-between gap-4 p-4 rounded-2xl bg-neutral-50 border border-neutral-200/80">
                        <div className="flex items-center gap-3">
                          <div className="text-3xl font-black text-neutral-900">
                            {(
                              productReviews.reduce((acc, r) => acc + (Number(r.rating) || 5), 0) /
                              productReviews.length
                            ).toFixed(1)}
                          </div>
                          <div>
                            <div className="flex items-center gap-0.5">
                              {[1, 2, 3, 4, 5].map((s) => (
                                <Star key={s} className="w-4 h-4 fill-amber-400 text-amber-400" />
                              ))}
                            </div>
                            <p className="text-xs text-neutral-500 mt-0.5">
                              Based on {productReviews.length} verified customer {productReviews.length === 1 ? "review" : "reviews"}
                            </p>
                          </div>
                        </div>
                      </div>

                      {/* Reviews Grid */}
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        {productReviews.map((rev, idx) => (
                          <div
                            key={rev.id || idx}
                            className="p-5 rounded-2xl border border-neutral-200 bg-neutral-50/50 space-y-3"
                          >
                            <div className="flex items-start justify-between gap-2">
                              <div>
                                <div className="flex items-center gap-2">
                                  <span className="font-bold text-sm text-neutral-900">
                                    {rev.customer_name || "Verified Customer"}
                                  </span>
                                  {rev.is_verified_purchase !== false && (
                                    <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-emerald-50 text-emerald-700 border border-emerald-200 text-[10px] font-bold">
                                      <CheckCircle2 className="w-3 h-3" />
                                      Verified
                                    </span>
                                  )}
                                </div>
                                {rev.location && (
                                  <p className="text-[11px] text-neutral-500 mt-0.5">{rev.location}</p>
                                )}
                              </div>
                              <div className="flex items-center gap-0.5 shrink-0">
                                {[1, 2, 3, 4, 5].map((s) => (
                                  <Star
                                    key={s}
                                    className={`w-3.5 h-3.5 ${
                                      s <= (Number(rev.rating) || 5)
                                        ? "fill-amber-400 text-amber-400"
                                        : "text-neutral-300"
                                    }`}
                                  />
                                ))}
                              </div>
                            </div>
                            <p className="text-xs sm:text-sm text-neutral-700 leading-relaxed">
                              {rev.comment}
                            </p>
                          </div>
                        ))}
                      </div>
                    </>
                  )}
                </div>
              )}

              {/* Tab Panel: Specifications (if available) */}
              {activeInfoTab === "specs" && product.specifications?.length > 0 && (
                <div className="divide-y divide-neutral-100 text-xs sm:text-sm">
                  {product.specifications.map((spec, i) => (
                    <div
                      key={i}
                      className="py-3 grid grid-cols-1 sm:grid-cols-3 gap-2 sm:gap-4 items-center"
                    >
                      <span className="font-semibold text-neutral-500">
                        {spec.label}
                      </span>
                      <span className="sm:col-span-2 font-bold text-neutral-900">
                        {spec.value}
                      </span>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </section>

          {/* 7. BEFORE VS AFTER COMPARISON (Only if data exists) */}
          {product.beforeAfter?.before && product.beforeAfter?.after && (
            <section className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
              <div className="text-center mb-6">
                <span className="px-3 py-1 rounded-full bg-amber-100 text-amber-900 font-bold text-xs uppercase tracking-wider">
                  Visual Comparison
                </span>
                <h2 className="text-2xl sm:text-3xl font-black text-neutral-900 mt-2">
                  Before vs After Transformation
                </h2>
                <p className="text-xs text-neutral-500 mt-1">
                  Drag slider left and right to inspect the transformation
                </p>
              </div>

              <div className="relative aspect-[16/9] w-full rounded-3xl overflow-hidden border border-neutral-200 shadow-xl select-none bg-neutral-900">
                <img
                  src={product.beforeAfter.after}
                  alt="After"
                  className="absolute inset-0 w-full h-full object-cover"
                />
                <div
                  className="absolute inset-y-0 left-0 overflow-hidden"
                  style={{ width: `${slider}%` }}
                >
                  <img
                    src={product.beforeAfter.before}
                    alt="Before"
                    className="absolute inset-y-0 left-0 h-full max-w-none object-cover"
                    style={{ width: "calc(min(100vw - 32px, 896px))" }}
                  />
                </div>

                {/* Badges */}
                <span className="absolute top-4 left-4 bg-rose-600/90 text-white text-xs font-bold px-3 py-1 rounded-full shadow-md z-10 pointer-events-none">
                  Before: Cluttered
                </span>
                <span className="absolute top-4 right-4 bg-emerald-600/90 text-white text-xs font-bold px-3 py-1 rounded-full shadow-md z-10 pointer-events-none">
                  After: Organized
                </span>

                {/* Slider Handle */}
                <div
                  className="absolute top-0 bottom-0 w-1 bg-white shadow-2xl z-20"
                  style={{ left: `${slider}%` }}
                >
                  <input
                    type="range"
                    min="0"
                    max="100"
                    value={slider}
                    onChange={(e) => setSlider(Number(e.target.value))}
                    className="absolute inset-0 opacity-0 cursor-ew-resize w-full h-full"
                  />
                  <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-10 h-10 rounded-full bg-white text-emerald-800 border-2 border-emerald-600 flex items-center justify-center font-bold text-sm shadow-xl pointer-events-none">
                    ↔
                  </div>
                </div>
              </div>
              <p className="mt-3 text-center text-xs text-neutral-500">
                👆 Drag mouse or touch swipe left and right to compare
              </p>
            </section>
          )}

          {/* 9. DYNAMIC EDITORIAL TRUST CARDS SECTION */}
          {prodEditorial.showEditorialCards !== false && (() => {
            const visibleCards = (prodEditorial.editorialCards || []).filter((c) => c && c.enabled !== false);
            if (visibleCards.length === 0) return null;
            const gridColsClass =
              visibleCards.length === 1
                ? "grid-cols-1"
                : visibleCards.length === 2
                  ? "grid-cols-1 sm:grid-cols-2"
                  : visibleCards.length === 3
                    ? "grid-cols-1 sm:grid-cols-3"
                    : "grid-cols-1 sm:grid-cols-2 lg:grid-cols-4";
            return (
              <section className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
                <div className={`grid ${gridColsClass} gap-4`}>
                  {visibleCards.map((item, idx) => (
                    <div key={item.id || idx} className="bg-white rounded-2xl border border-neutral-200 p-5 text-center shadow-xs hover:border-emerald-300 transition-colors">
                      <div className="text-3xl mb-2">{item.icon || "✨"}</div>
                      <h4 className="font-bold text-neutral-900 text-sm mb-1">{item.title}</h4>
                      <p className="text-xs text-neutral-500">{formatEditorialCardText(item.text, themeConfig)}</p>
                    </div>
                  ))}
                </div>
              </section>
            );
          })()}

          {/* 10. FREQUENTLY ASKED QUESTIONS (FAQ ACCORDION) */}
          {product.faqs?.length > 0 && (
            <section className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
              <div className="max-w-3xl mx-auto">
                <div className="text-center mb-8">
                  <span className="px-3 py-1 rounded-full bg-slate-100 text-neutral-700 font-bold text-xs uppercase tracking-wider">
                    Questions & Answers
                  </span>
                  <h2 className="text-2xl sm:text-3xl font-black text-neutral-900 mt-2">
                    Frequently Asked Questions (FAQ)
                  </h2>
                </div>

                <div className="space-y-3">
                  {product.faqs.map((faq, i) => (
                    <div
                      key={i}
                      className="bg-white rounded-2xl border border-neutral-200 overflow-hidden shadow-xs"
                    >
                      <button
                        onClick={() => setActiveFaq(activeFaq === i ? -1 : i)}
                        className="w-full p-4 sm:p-5 text-left font-bold text-neutral-900 text-sm sm:text-base flex items-center justify-between gap-3 cursor-pointer hover:bg-neutral-50 transition-colors"
                      >
                        <span className="flex items-center gap-2">
                          <HelpCircle className="w-4 h-4 text-emerald-700 shrink-0" />
                          <span>{faq.question}</span>
                        </span>
                        <span className="text-emerald-700 font-bold text-lg">
                          {activeFaq === i ? "−" : "+"}
                        </span>
                      </button>
                      {activeFaq === i && (
                        <div className="px-5 pb-5 text-xs sm:text-sm text-neutral-600 leading-relaxed border-t border-neutral-100 pt-3">
                          {faq.answer}
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              </div>
            </section>
          )}

          {/* 10. SPECIAL OFFER CTA BANNER (Shown dynamically when product has Limited Offer badge) */}
          {isLimitedOfferProduct && (
          <section className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
            <div
              style={{
                ...buildBgStyle(
                  {
                    bgType: pp.ctaBannerBgType || "gradient",
                    solidBg: pp.ctaBannerBg || "#064e3b",
                    gradientFrom: pp.ctaBannerBg || "#064e3b",
                    gradientTo: pp.ctaBannerGradientTo || "#022c22",
                    gradientDirection: "to right",
                  },
                  "#064e3b"
                ),
                color: pp.ctaBannerTextColor || undefined,
              }}
              className="rounded-3xl bg-gradient-to-r from-emerald-900 via-emerald-800 to-emerald-900 text-white p-8 sm:p-10 text-center shadow-xl relative overflow-hidden"
            >
              <span className="px-4 py-1.5 rounded-full bg-amber-400 text-neutral-950 font-black text-xs uppercase tracking-wider shadow-sm">
                🔥 Limited Time Special Offer
              </span>
              <h2 className="text-2xl sm:text-4xl font-black mt-4 mb-2">
                Today's Offer Price Only ৳{currentPrice.toLocaleString()}!
              </h2>
              <p className="text-sm text-emerald-100 max-w-lg mx-auto mb-6">
                {originalPrice > currentPrice && (
                  <span className="line-through text-emerald-300/80 mr-2">
                    Regular ৳{originalPrice.toLocaleString()}
                  </span>
                )}
                Order with Cash on Delivery nationwide without advance charges.
              </p>
              <button
                onClick={scrollToCheckout}
                style={{
                  backgroundColor: pp.primaryBtnBg || undefined,
                  color: pp.primaryBtnText || undefined,
                }}
                className="py-3.5 px-8 rounded-xl bg-orange-500 hover:bg-orange-600 text-white font-extrabold text-base shadow-xl shadow-neutral-950/30 hover:scale-105 active:scale-95 transition-all cursor-pointer"
              >
                Order Now →
              </button>
            </div>
          </section>
          )}

          {/* 11. CHECKOUT SECTION */}
          <section id="checkout-section" className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 scroll-mt-20">
            <div className="text-center max-w-2xl mx-auto mb-8">
              {prodEditorial.checkoutBadgeText && (
                <span className="px-3 py-1 rounded-full bg-orange-100 text-orange-900 font-bold text-xs uppercase tracking-wider">
                  {prodEditorial.checkoutBadgeText}
                </span>
              )}
              <h2 className="text-2xl sm:text-3xl font-black text-neutral-900 mt-2">
                {prodEditorial.checkoutTitle || "Fill out the form below to confirm your order"}
              </h2>
              {prodEditorial.checkoutSubtitle && (
                <p className="text-xs sm:text-sm text-neutral-500 mt-1">
                  {prodEditorial.checkoutSubtitle}
                </p>
              )}
            </div>

            <form
              onSubmit={handleOrderSubmit}
              className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start"
            >
              {/* Customer Information Inputs */}
              <div
                style={{
                  backgroundColor: pp.checkoutCardBg || undefined,
                  borderColor: pp.cardBorderColor || undefined,
                }}
                className="lg:col-span-7 bg-white rounded-3xl border border-neutral-200 p-6 sm:p-8 shadow-md space-y-4"
              >
                <h3 className="text-lg font-bold text-neutral-900 border-b border-neutral-100 pb-3">
                  {prodEditorial.checkoutFormHeading || "1. Your Delivery Information"}
                </h3>

                {/* Dynamic WooCommerce-style Checkout Fields */}
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  {(prodEditorial.checkoutFields || [])
                    .filter((field) => field && field.enabled !== false)
                    .map((field, fIdx) => {
                      const colSpanClass = field.width === "half" ? "sm:col-span-1" : "sm:col-span-2";
                      const isReq = field.required !== false;

                      if (field.key === "full_name" || field.type === "name") {
                        if (field.nameSplitMode) {
                          return (
                            <div key={field.id || field.key || fIdx} className="sm:col-span-2 space-y-1.5">
                              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                                <div>
                                  <label htmlFor="checkout-first-name" className="block text-xs font-bold text-neutral-700 mb-1.5">
                                    {field.firstNameLabel || "First Name"} {isReq && <span className="text-rose-500" aria-hidden="true">*</span>}
                                  </label>
                                  <input
                                    id="checkout-first-name"
                                    name="firstName"
                                    type="text"
                                    autoComplete="given-name"
                                    required={isReq}
                                    aria-invalid={Boolean(firstNameError) || undefined}
                                    value={firstName}
                                    onChange={(e) => {
                                      setFirstName(e.target.value);
                                      if (firstNameError) setFirstNameError("");
                                    }}
                                    placeholder={field.firstNamePlaceholder ?? ""}
                                    className={`w-full px-4 py-3 rounded-xl border ${firstNameError ? "border-rose-500 bg-rose-50/20" : "border-neutral-300 focus:border-emerald-600 focus:ring-2 focus:ring-emerald-600/20"} text-sm outline-none transition-all`}
                                  />
                                  {firstNameError && (
                                    <p className="text-[11px] text-rose-500 mt-1" role="alert">{firstNameError}</p>
                                  )}
                                </div>
                                <div>
                                  <label htmlFor="checkout-last-name" className="block text-xs font-bold text-neutral-700 mb-1.5">
                                    {field.lastNameLabel || "Last Name"} {isReq && <span className="text-rose-500" aria-hidden="true">*</span>}
                                  </label>
                                  <input
                                    id="checkout-last-name"
                                    name="lastName"
                                    type="text"
                                    autoComplete="family-name"
                                    required={isReq}
                                    aria-invalid={Boolean(lastNameError) || undefined}
                                    value={lastName}
                                    onChange={(e) => {
                                      setLastName(e.target.value);
                                      if (lastNameError) setLastNameError("");
                                    }}
                                    placeholder={field.lastNamePlaceholder ?? ""}
                                    className={`w-full px-4 py-3 rounded-xl border ${lastNameError ? "border-rose-500 bg-rose-50/20" : "border-neutral-300 focus:border-emerald-600 focus:ring-2 focus:ring-emerald-600/20"} text-sm outline-none transition-all`}
                                  />
                                  {lastNameError && (
                                    <p className="text-[11px] text-rose-500 mt-1" role="alert">{lastNameError}</p>
                                  )}
                                </div>
                              </div>
                              {field.helperText && (
                                <p className="text-[11px] text-neutral-500">{field.helperText}</p>
                              )}
                            </div>
                          );
                        }

                        return (
                          <div key={field.id || field.key || fIdx} className={colSpanClass}>
                            <label htmlFor="checkout-full-name" className="block text-xs font-bold text-neutral-700 mb-1.5">
                              {field.label || "Your Full Name"} {isReq && <span className="text-rose-500" aria-hidden="true">*</span>}
                            </label>
                            <input
                              id="checkout-full-name"
                              name="name"
                              type="text"
                              autoComplete="name"
                              required={isReq}
                              aria-invalid={Boolean(nameError) || undefined}
                              value={customerName}
                              onChange={(e) => {
                                setCustomerName(e.target.value);
                                if (nameError) setNameError("");
                              }}
                              placeholder={field.placeholder ?? ""}
                              className={`w-full px-4 py-3 rounded-xl border ${nameError ? "border-rose-500 bg-rose-50/20" : "border-neutral-300 focus:border-emerald-600 focus:ring-2 focus:ring-emerald-600/20"} text-sm outline-none transition-all`}
                            />
                            {nameError ? (
                              <p className="text-[11px] text-rose-500 mt-1" role="alert">{nameError}</p>
                            ) : field.helperText ? (
                              <p className="text-[11px] text-neutral-500 mt-1">{field.helperText}</p>
                            ) : null}
                          </div>
                        );
                      }

                      if (field.key === "email") {
                        return (
                          <div key={field.id || field.key || fIdx} className={colSpanClass}>
                            <label htmlFor="checkout-email" className="block text-xs font-bold text-neutral-700 mb-1.5">
                              {field.label || "Your Email Address"} {Boolean(field.required) && <span className="text-rose-500" aria-hidden="true">*</span>}
                            </label>
                            <div className="relative">
                              <Mail className="w-4 h-4 text-neutral-400 absolute left-3.5 top-1/2 -translate-y-1/2 pointer-events-none" aria-hidden="true" />
                              <input
                                id="checkout-email"
                                name="email"
                                type="email"
                                autoComplete="email"
                                autoCorrect="off"
                                autoCapitalize="none"
                                spellCheck={false}
                                required={Boolean(field.required)}
                                aria-invalid={Boolean(emailError) || undefined}
                                value={email}
                                onChange={(e) => {
                                  setEmail(e.target.value);
                                  if (emailError) setEmailError("");
                                }}
                                placeholder={field.placeholder ?? ""}
                                className={`w-full pl-10 pr-4 py-3 rounded-xl border ${emailError ? "border-rose-500 bg-rose-50/20" : "border-neutral-300 focus:border-emerald-600 focus:ring-2 focus:ring-emerald-600/20"} text-sm outline-none transition-all`}
                              />
                            </div>
                            {emailError ? (
                              <p className="text-[11px] text-rose-500 mt-1" role="alert">{emailError}</p>
                            ) : field.helperText ? (
                              <p className="text-[11px] text-neutral-500 mt-1">{field.helperText}</p>
                            ) : null}
                          </div>
                        );
                      }

                      if (field.key === "phone") {
                        return (
                          <div key={field.id || field.key || fIdx} className={colSpanClass}>
                            <label htmlFor="checkout-phone" className="block text-xs font-bold text-neutral-700 mb-1.5">
                              {field.label || "Mobile Number"} {isReq && <span className="text-rose-500" aria-hidden="true">*</span>}
                            </label>
                            <div className={`flex rounded-xl border ${phoneError ? "border-rose-500 bg-rose-50/20" : "border-neutral-300 focus-within:border-emerald-600 focus-within:ring-2 focus-within:ring-emerald-600/20"} bg-white overflow-hidden transition-all`}>
                              <input
                                id="checkout-phone"
                                name="phone"
                                type="tel"
                                inputMode="tel"
                                autoComplete="tel"
                                required={isReq}
                                aria-invalid={Boolean(phoneError) || undefined}
                                value={phone}
                                onChange={(e) => {
                                  setPhone(e.target.value);
                                  if (phoneError) setPhoneError("");
                                }}
                                placeholder={field.placeholder ?? ""}
                                className="w-full px-4 py-3 text-sm text-neutral-900 placeholder:text-neutral-400 outline-none bg-transparent"
                              />
                            </div>
                            {phoneError ? (
                              <p className="text-[11px] text-rose-500 mt-1" role="alert">{phoneError}</p>
                            ) : field.helperText ? (
                              <p className="text-[11px] text-neutral-500 mt-1">{field.helperText}</p>
                            ) : null}
                          </div>
                        );
                      }

                      if (field.key === "district" || field.type === "district_select") {
                        return (
                          <div key={field.id || field.key || fIdx} className={colSpanClass}>
                            <label htmlFor="checkout-district" className="block text-xs font-bold text-neutral-700 mb-1.5">
                              {field.label || "District"} {isReq && <span className="text-rose-500" aria-hidden="true">*</span>}
                            </label>
                            <select
                              id="checkout-district"
                              name="district"
                              autoComplete="address-level1"
                              required={isReq}
                              value={district}
                              onChange={(e) => handleDistrictChange(e.target.value)}
                              className="w-full px-3.5 py-3 rounded-xl border border-neutral-300 focus:border-emerald-600 focus:ring-2 focus:ring-emerald-600/20 text-sm outline-none transition-all bg-white font-medium cursor-pointer"
                            >
                              {BANGLADESH_DISTRICTS.map((d) => {
                                const dCost = resolveDeliveryCost(d, subtotal, prodEditorial);
                                return (
                                  <option key={d} value={d}>
                                    {d} ({dCost.isFreeShipping ? "Free" : `৳${dCost.fee}`})
                                  </option>
                                );
                              })}
                            </select>
                            {field.helperText && (
                              <p className="text-[11px] text-neutral-500 mt-1">{field.helperText}</p>
                            )}
                          </div>
                        );
                      }

                      if (field.key === "thana" || field.type === "thana_select") {
                        return (
                          <div key={field.id || field.key || fIdx} className={colSpanClass}>
                            <label htmlFor="checkout-thana" className="block text-xs font-bold text-neutral-700 mb-1.5">
                              {field.label || "Select Thana / Area"} {isReq && <span className="text-rose-500" aria-hidden="true">*</span>}
                            </label>
                            <select
                              id="checkout-thana"
                              name="thana"
                              autoComplete="address-level2"
                              required={isReq}
                              aria-invalid={Boolean(thanaError) || undefined}
                              value={thana}
                              onChange={(e) => {
                                setThana(e.target.value);
                                if (thanaError) setThanaError("");
                              }}
                              className={`w-full px-3.5 py-3 rounded-xl border ${thanaError ? "border-rose-500 bg-rose-50/20" : "border-neutral-300 focus:border-emerald-600 focus:ring-2 focus:ring-emerald-600/20"} text-sm outline-none transition-all bg-white font-medium cursor-pointer`}
                            >
                              <option value="">
                                {field.placeholder || "-- Select Thana / Area --"}
                              </option>
                              {availableThanas.map((th) => (
                                <option key={th} value={th}>
                                  {th}
                                </option>
                              ))}
                            </select>
                            {thanaError ? (
                              <p className="text-[11px] text-rose-500 mt-1" role="alert">{thanaError}</p>
                            ) : field.helperText ? (
                              <p className="text-[11px] text-neutral-500 mt-1">{field.helperText}</p>
                            ) : null}
                          </div>
                        );
                      }

                      if (field.key === "full_address") {
                        return (
                          <div key={field.id || field.key || fIdx} className={colSpanClass}>
                            <label htmlFor="checkout-full-address" className="block text-xs font-bold text-neutral-700 mb-1.5">
                              {field.label || "Full Address"} {isReq && <span className="text-rose-500" aria-hidden="true">*</span>}
                            </label>
                            <textarea
                              id="checkout-full-address"
                              name="address"
                              autoComplete="street-address"
                              required={isReq}
                              aria-invalid={Boolean(addressError) || undefined}
                              value={fullAddress}
                              onChange={(e) => {
                                setFullAddress(e.target.value);
                                if (addressError) setAddressError("");
                              }}
                              rows="3"
                              placeholder={field.placeholder ?? ""}
                              className={`w-full px-4 py-3 rounded-xl border ${addressError ? "border-rose-500 bg-rose-50/20" : "border-neutral-300 focus:border-emerald-600 focus:ring-2 focus:ring-emerald-600/20"} text-sm outline-none transition-all`}
                            />
                            {addressError ? (
                              <p className="text-[11px] text-rose-500 mt-1" role="alert">{addressError}</p>
                            ) : field.helperText ? (
                              <p className="text-[11px] text-neutral-500 mt-1">{field.helperText}</p>
                            ) : null}
                          </div>
                        );
                      }

                      // Custom Admin-Added Form Fields
                      const fKey = field.key || field.id;
                      const inputId = `checkout-custom-${fKey}`;
                      const curVal =
                        customFieldValues[fKey] !== undefined
                          ? customFieldValues[fKey]
                          : (field.defaultValue ?? "");
                      const curErr = customFieldErrors[fKey];
                      const handleCustomChange = (val) => {
                        setCustomFieldValues((prev) => ({ ...prev, [fKey]: val }));
                        if (curErr) {
                          setCustomFieldErrors((prev) => {
                            const copy = { ...prev };
                            delete copy[fKey];
                            return copy;
                          });
                        }
                      };

                      if (field.type === "checkbox") {
                        return (
                          <div key={fKey} className={colSpanClass}>
                            <div className="flex items-start gap-2.5 p-3 rounded-xl border border-neutral-200 bg-neutral-50/60">
                              <input
                                id={inputId}
                                name={fKey}
                                type="checkbox"
                                checked={Boolean(curVal)}
                                required={Boolean(field.required)}
                                aria-invalid={Boolean(curErr) || undefined}
                                onChange={(e) => handleCustomChange(e.target.checked)}
                                className="w-4 h-4 mt-0.5 accent-emerald-600 rounded cursor-pointer"
                              />
                              <label htmlFor={inputId} className="text-xs font-bold text-neutral-800 cursor-pointer">
                                {field.label} {Boolean(field.required) && <span className="text-rose-500" aria-hidden="true">*</span>}
                              </label>
                            </div>
                            {curErr ? (
                              <p className="text-[11px] text-rose-500 mt-1" role="alert">{curErr}</p>
                            ) : field.helperText ? (
                              <p className="text-[11px] text-neutral-500 mt-1">{field.helperText}</p>
                            ) : null}
                          </div>
                        );
                      }

                      if (field.type === "radio") {
                        const opts = Array.isArray(field.options) ? field.options : [];
                        return (
                          <fieldset key={fKey} className={colSpanClass}>
                            <legend className="block text-xs font-bold text-neutral-700 mb-1.5">
                              {field.label} {Boolean(field.required) && <span className="text-rose-500" aria-hidden="true">*</span>}
                            </legend>
                            <div className="flex flex-wrap gap-2">
                              {opts.map((opt, oIdx) => {
                                const rId = `${inputId}-${oIdx}`;
                                return (
                                  <label
                                    key={rId}
                                    htmlFor={rId}
                                    className="inline-flex items-center gap-2 px-3 py-2 rounded-xl border border-neutral-200 bg-white hover:bg-neutral-50 text-xs font-medium cursor-pointer"
                                  >
                                    <input
                                      id={rId}
                                      name={fKey}
                                      type="radio"
                                      value={opt}
                                      checked={String(curVal) === String(opt)}
                                      onChange={(e) => handleCustomChange(e.target.value)}
                                      className="accent-emerald-600 cursor-pointer"
                                    />
                                    <span>{opt}</span>
                                  </label>
                                );
                              })}
                            </div>
                            {curErr ? (
                              <p className="text-[11px] text-rose-500 mt-1" role="alert">{curErr}</p>
                            ) : field.helperText ? (
                              <p className="text-[11px] text-neutral-500 mt-1">{field.helperText}</p>
                            ) : null}
                          </fieldset>
                        );
                      }

                      return (
                        <div key={fKey} className={colSpanClass}>
                          <label htmlFor={inputId} className="block text-xs font-bold text-neutral-700 mb-1.5">
                            {field.label} {Boolean(field.required) && <span className="text-rose-500" aria-hidden="true">*</span>}
                          </label>
                          {field.type === "textarea" ? (
                            <textarea
                              id={inputId}
                              name={fKey}
                              rows="3"
                              required={Boolean(field.required)}
                              aria-invalid={Boolean(curErr) || undefined}
                              value={curVal}
                              onChange={(e) => handleCustomChange(e.target.value)}
                              placeholder={field.placeholder ?? ""}
                              className={`w-full px-4 py-3 rounded-xl border ${curErr ? "border-rose-500 bg-rose-50/20" : "border-neutral-300 focus:border-emerald-600 focus:ring-2 focus:ring-emerald-600/20"} text-sm outline-none transition-all`}
                            />
                          ) : field.type === "select" ? (
                            <select
                              id={inputId}
                              name={fKey}
                              required={Boolean(field.required)}
                              aria-invalid={Boolean(curErr) || undefined}
                              value={curVal}
                              onChange={(e) => handleCustomChange(e.target.value)}
                              className={`w-full px-3.5 py-3 rounded-xl border ${curErr ? "border-rose-500 bg-rose-50/20" : "border-neutral-300 focus:border-emerald-600 focus:ring-2 focus:ring-emerald-600/20"} text-sm outline-none transition-all bg-white font-medium cursor-pointer`}
                            >
                              <option value="">{field.placeholder || `-- Select ${field.label} --`}</option>
                              {(Array.isArray(field.options) ? field.options : []).map((opt, oIdx) => (
                                <option key={oIdx} value={opt}>
                                  {opt}
                                </option>
                              ))}
                            </select>
                          ) : (
                            <input
                              id={inputId}
                              name={fKey}
                              type={field.type || "text"}
                              inputMode={field.type === "tel" ? "tel" : field.type === "number" ? "numeric" : undefined}
                              required={Boolean(field.required)}
                              aria-invalid={Boolean(curErr) || undefined}
                              value={curVal}
                              onChange={(e) => handleCustomChange(e.target.value)}
                              placeholder={field.placeholder ?? ""}
                              className={`w-full px-4 py-3 rounded-xl border ${curErr ? "border-rose-500 bg-rose-50/20" : "border-neutral-300 focus:border-emerald-600 focus:ring-2 focus:ring-emerald-600/20"} text-sm outline-none transition-all`}
                            />
                          )}
                          {curErr ? (
                            <p className="text-[11px] text-rose-500 mt-1" role="alert">{curErr}</p>
                          ) : field.helperText ? (
                            <p className="text-[11px] text-neutral-500 mt-1">{field.helperText}</p>
                          ) : null}
                        </div>
                      );
                    })}
                </div>

                {/* Quantity Controller */}
                <div className="pt-2">
                  <span className="block text-xs font-bold text-neutral-700 mb-1.5">
                    Quantity
                  </span>
                  <div className="inline-flex items-center border border-neutral-300 rounded-xl overflow-hidden">
                    <button
                      type="button"
                      onClick={() => setQty(Math.max(1, qty - 1))}
                      className="px-4 py-2 hover:bg-neutral-100 text-base font-bold transition-colors cursor-pointer"
                    >
                      −
                    </button>
                    <span className="px-4 py-2 text-sm font-black bg-neutral-50 text-neutral-900 min-w-10 text-center">
                      {qty}
                    </span>
                    <button
                      type="button"
                      onClick={() => setQty(qty + 1)}
                      className="px-4 py-2 hover:bg-neutral-100 text-base font-bold transition-colors cursor-pointer"
                    >
                      +
                    </button>
                  </div>
                </div>

                {/* Payment Methods Section */}
                <div className="pt-4 border-t border-neutral-100">
                  <span className="block text-xs font-bold text-neutral-800 mb-2.5">
                    {"2. Select Payment Method:"}
                  </span>

                  {/* Primary 2 Gateways: SSLCOMMERZ & COD */}
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 mb-3">
                    {/* Pay Online via SSLCommerz */}
                    {isMethodActive("sslcommerz") && (
                      <button
                        type="button"
                        onClick={() => setSelectedPayment("sslcommerz")}
                        className={`p-3.5 rounded-2xl border-2 text-left flex flex-col justify-between gap-2.5 transition-all cursor-pointer ${selectedPayment === "sslcommerz"
                          ? "border-blue-600 bg-blue-50/60 shadow-xs ring-2 ring-blue-600/20"
                          : "border-neutral-200 bg-white hover:border-neutral-300"
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
                            {"Pay Online (Cards / bKash / Nagad)"}
                          </div>
                          <div className="text-[10px] text-neutral-500">
                            Visa, MasterCard, UnionPay, bKash, Nagad, Rocket
                          </div>
                        </div>
                      </button>
                    )}

                    {/* Cash on Delivery */}
                    {isMethodActive("cod") && (
                      <button
                        type="button"
                        onClick={() => setSelectedPayment("cod")}
                        className={`p-3.5 rounded-2xl border-2 text-left flex flex-col justify-between gap-2.5 transition-all cursor-pointer ${selectedPayment === "cod"
                          ? "border-emerald-600 bg-emerald-50/50 shadow-xs ring-2 ring-emerald-600/20"
                          : "border-neutral-200 bg-white hover:border-neutral-300"
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
                            {"Pay the delivery rider after inspecting parcel"}
                          </div>
                        </div>
                      </button>
                    )}
                  </div>

                  {/* Manual MFS Methods: bKash, Nagad, Rocket (Equal Width Grid!) */}
                  {activeManualMethods.length > 0 && (
                    <div>
                      <div className="text-[11px] font-bold text-neutral-500 uppercase tracking-wider mb-2 flex items-center gap-1.5">
                        <Smartphone className="w-3.5 h-3.5 text-neutral-400" />
                        <span>{"Manual Mobile Banking (TrxID Required):"}</span>
                      </div>

                      <div className={`grid gap-2.5 ${activeManualMethods.length === 1
                        ? "grid-cols-1"
                        : activeManualMethods.length === 2
                          ? "grid-cols-2"
                          : "grid-cols-1 sm:grid-cols-3"
                        }`}>
                        {/* bKash */}
                        {isMethodActive("bkash") && (
                          <button
                            type="button"
                            onClick={() => setSelectedPayment("bkash")}
                            className={`p-3 rounded-2xl border-2 text-left flex flex-col justify-between gap-2.5 transition-all cursor-pointer w-full ${selectedPayment === "bkash"
                              ? "border-pink-600 bg-pink-50/50 shadow-xs ring-2 ring-pink-600/20"
                              : "border-neutral-200 bg-white hover:border-neutral-300"
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
                                {getMethodConfig("bkash")?.account_type === 'PERSONAL' ? 'Personal' : 'Merchant'}
                              </span>
                            </div>
                            <div>
                              <div className="font-bold text-xs text-neutral-900">bKash Manual</div>
                              <div className="text-[10px] text-neutral-500">
                                {"bKash TrxID"}
                              </div>
                            </div>
                          </button>
                        )}

                        {/* Nagad */}
                        {isMethodActive("nagad") && (
                          <button
                            type="button"
                            onClick={() => setSelectedPayment("nagad")}
                            className={`p-3 rounded-2xl border-2 text-left flex flex-col justify-between gap-2.5 transition-all cursor-pointer w-full ${selectedPayment === "nagad"
                              ? "border-amber-600 bg-amber-50/50 shadow-xs ring-2 ring-amber-600/20"
                              : "border-neutral-200 bg-white hover:border-neutral-300"
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
                                {getMethodConfig("nagad")?.account_type === 'PERSONAL' ? 'Personal' : 'Merchant'}
                              </span>
                            </div>
                            <div>
                              <div className="font-bold text-xs text-neutral-900">Nagad Manual</div>
                              <div className="text-[10px] text-neutral-500">
                                {"Nagad TrxID"}
                              </div>
                            </div>
                          </button>
                        )}

                        {/* Rocket */}
                        {isMethodActive("rocket") && (
                          <button
                            type="button"
                            onClick={() => setSelectedPayment("rocket")}
                            className={`p-3 rounded-2xl border-2 text-left flex flex-col justify-between gap-2.5 transition-all cursor-pointer w-full ${selectedPayment === "rocket"
                              ? "border-purple-600 bg-purple-50/50 shadow-xs ring-2 ring-purple-600/20"
                              : "border-neutral-200 bg-white hover:border-neutral-300"
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
                                {getMethodConfig("rocket")?.account_type === 'PERSONAL' ? 'Personal' : 'Merchant'}
                              </span>
                            </div>
                            <div>
                              <div className="font-bold text-xs text-neutral-900">Rocket Manual</div>
                              <div className="text-[10px] text-neutral-500">
                                {"Rocket TrxID"}
                              </div>
                            </div>
                          </button>
                        )}
                      </div>
                    </div>
                  )}

                  {/* COD Highlight Banner */}
                  {selectedPayment === "cod" && (
                    <div className="mt-3 p-3.5 rounded-2xl bg-amber-50/90 border border-amber-200 flex items-center gap-2.5 text-xs text-amber-950 font-medium animate-in fade-in">
                      <span className="text-base shrink-0">💵</span>
                      <span>
                        {getMethodConfig("cod")?.instructions || ("Cash on Delivery: Pay the delivery rider after inspecting your parcel.")}
                      </span>
                    </div>
                  )}

                  {/* SSLCOMMERZ Highlight Banner */}
                  {selectedPayment === "sslcommerz" && (
                    <div className="mt-3 p-4 rounded-2xl bg-linear-to-r from-blue-900 via-indigo-900 to-slate-900 text-white space-y-2 border border-blue-700/60 shadow-md animate-in fade-in">
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-2">
                          <CreditCard className="w-4 h-4 text-blue-300" />
                          <span className="font-bold text-xs">SSLCommerz Secured Payment Gateway</span>
                        </div>
                        <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-blue-500/20 text-blue-300 border border-blue-400/30">
                          Instant Verification
                        </span>
                      </div>
                      <p className="text-[11px] text-blue-100 leading-relaxed">
                        Pay securely with Visa, MasterCard, bKash, Nagad, Rocket, or internet banking via SSLCommerz.
                      </p>
                    </div>
                  )}

                  {/* Manual MFS Instructions & TrxID Input Box */}
                  {(selectedPayment === "bkash" || selectedPayment === "nagad" || selectedPayment === "rocket") && (
                    <div className="mt-3 p-4 rounded-2xl bg-neutral-900 text-white space-y-3 border border-neutral-800 animate-in fade-in">
                      <div className="flex items-center justify-between pb-2 border-b border-neutral-800">
                        <div className="flex items-center gap-2">
                          <Smartphone className="w-4 h-4 text-emerald-400" />
                          <span className="font-bold text-xs">
                            {getMethodConfig(selectedPayment)?.name || selectedPayment.toUpperCase()}{" "}
                            {formatAccountTypeLabel(getMethodConfig(selectedPayment)?.account_type, isEnglish)}
                          </span>
                        </div>
                        <button
                          type="button"
                          onClick={() => {
                            const prefix = selectedPayment === "bkash" ? "BK" : selectedPayment === "nagad" ? "NG" : "RK";
                            setPaymentTrxId(prefix + Date.now().toString(36).toUpperCase());
                            setSenderWallet(phone || "01712345678");
                            if (trxError) setTrxError("");
                          }}
                          className="text-[10px] font-bold px-2 py-0.5 rounded bg-emerald-500/20 text-emerald-300 border border-emerald-500/30 hover:bg-emerald-500/30 transition-colors cursor-pointer"
                        >
                          ⚡ Test Auto-Fill TrxID
                        </button>
                      </div>

                      <div className="bg-neutral-800/80 p-3 rounded-xl space-y-1.5 text-[11px] text-neutral-300">
                        <div className="flex justify-between items-center">
                          <span className="text-neutral-400">
                            {getMethodConfig(selectedPayment)?.account_type === 'PERSONAL'
                              ? "Personal Number:"
                              : "Merchant Number:"}
                          </span>
                          <span className="font-mono font-bold text-emerald-400 text-xs tracking-wider">
                            {getMethodConfig(selectedPayment)?.number ||
                              (selectedPayment === "bkash"
                                ? "01892-019281"
                                : selectedPayment === "nagad"
                                  ? "01918-293810"
                                  : "01712-345678")}
                          </span>
                        </div>

                        {getMethodConfig(selectedPayment)?.counter && getMethodConfig(selectedPayment)?.account_type !== 'PERSONAL' && (
                          <div className="flex justify-between items-center">
                            <span className="text-neutral-400">Counter No:</span>
                            <span className="font-mono font-bold text-neutral-200 text-xs">
                              {getMethodConfig(selectedPayment)?.counter || "1"}
                            </span>
                          </div>
                        )}

                        <div className="flex justify-between items-center">
                          <span className="text-neutral-400">Amount to Pay:</span>
                          <span className="font-bold text-white text-xs">{formatBDT(total)}</span>
                        </div>

                        <p className="text-[10px] text-neutral-400 pt-1 border-t border-neutral-700/60 leading-relaxed">
                          {getMethodConfig(selectedPayment)?.instructions ||
                            (getMethodConfig(selectedPayment)?.account_type === 'PERSONAL'
                              ? "Send money to the personal number above from your mobile app, then enter the TrxID below."
                              : "Make payment to the merchant number above from your mobile app, then enter the TrxID below.")}
                        </p>
                      </div>

                      {/* Inputs for sender wallet and TrxID */}
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs">
                        <div>
                          <label className="block font-semibold text-neutral-300 mb-1">
                            Your Wallet / Phone No <span className="text-rose-400">*</span>
                          </label>
                          <input
                            type="text"
                            required
                            value={senderWallet}
                            onChange={(e) => {
                              setSenderWallet(e.target.value);
                              if (trxError) setTrxError("");
                            }}
                            placeholder="01XXXXXXXXX"
                            className="w-full px-3 py-2 bg-neutral-800 rounded-xl border border-neutral-700 font-mono text-white text-xs focus:border-emerald-500 focus:outline-hidden"
                          />
                        </div>

                        <div>
                          <label className="block font-semibold text-neutral-300 mb-1">
                            Transaction ID (TrxID) <span className="text-rose-400">*</span>
                          </label>
                          <input
                            type="text"
                            required
                            value={paymentTrxId}
                            onChange={(e) => {
                              setPaymentTrxId(e.target.value);
                              if (trxError) setTrxError("");
                            }}
                            placeholder="e.g. 9J28DA10K"
                            className="w-full px-3 py-2 bg-neutral-800 rounded-xl border border-neutral-700 font-mono uppercase text-emerald-400 text-xs focus:border-emerald-500 focus:outline-hidden"
                          />
                        </div>
                      </div>

                      {trxError && (
                        <p className="text-[11px] text-rose-400 font-medium">{trxError}</p>
                      )}
                    </div>
                  )}
                </div>
              </div>

              {/* Order Summary Column */}
              <div
                style={{
                  backgroundColor: pp.checkoutCardBg || undefined,
                  borderColor: pp.cardBorderColor || undefined,
                }}
                className="lg:col-span-5 bg-white rounded-3xl border border-neutral-200 p-6 sm:p-8 shadow-md lg:sticky lg:top-24 space-y-4"
              >
                <h3 className="text-lg font-bold text-neutral-900 border-b border-neutral-100 pb-3">
                  {prodEditorial.checkoutSummaryHeading || "Order Summary"}
                </h3>

                <div className="flex gap-4 items-center">
                  <img
                    src={selectedImage || primaryImage}
                    alt={displayName}
                    className="w-20 h-20 rounded-2xl object-cover border border-neutral-200 shrink-0"
                    onError={handleProductImageError}
                  />
                  <div>
                    <h4 className="text-sm font-bold text-neutral-900 line-clamp-2">
                      {displayName}
                    </h4>
                    <p className="text-xs text-neutral-500 mt-0.5">
                      Quantity: {qty} pcs
                    </p>
                    <p className="text-sm font-extrabold text-emerald-800 mt-1">
                      ৳{subtotal.toLocaleString()}
                    </p>
                  </div>
                </div>

                {/* Promo Code Input Card */}
                <div className="bg-white rounded-2xl border border-neutral-200 p-3.5 space-y-2">
                  <div className="flex items-center gap-1.5 text-xs font-bold text-neutral-800">
                    <Tag className="w-3.5 h-3.5 text-emerald-600" />
                    <span>{"Have a Promo / Coupon Code?"}</span>
                  </div>
                  {appliedCoupon ? (
                    <div className="flex items-center justify-between p-2.5 rounded-xl bg-emerald-50 border border-emerald-200 text-xs">
                      <div className="flex items-center gap-1.5 text-emerald-800 font-bold">
                        <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
                        <span>
                          {`Coupon '${appliedCoupon.code}' applied (-৳${couponDiscount.toLocaleString()})`}
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

                <div className="border-t border-neutral-100 pt-3 space-y-2 text-xs sm:text-sm">
                  <div className="flex justify-between text-neutral-600">
                    <span>{`Product Price (${qty} pcs):`}</span>
                    <span className="font-bold text-neutral-900">৳{subtotal.toLocaleString()}</span>
                  </div>
                  <div className="flex justify-between text-neutral-600">
                    <span>
                      {`Delivery Fee (${district}):`}
                    </span>
                    <span className="font-bold text-neutral-900">৳{deliveryFee}</span>
                  </div>
                  {couponDiscount > 0 && (
                    <div className="flex justify-between text-emerald-700 font-semibold">
                      <span>{"Coupon Discount:"}</span>
                      <span>-৳{couponDiscount.toLocaleString()}</span>
                    </div>
                  )}
                  <div className="flex justify-between text-base font-black text-neutral-950 border-t border-neutral-200 pt-3">
                    <span>{"Total Payable:"}</span>
                    <span className="text-emerald-800 text-lg font-black">৳{total.toLocaleString()}</span>
                  </div>
                </div>

                {/* Dynamic Shared Trust Badges (Synced with Product Editorial & Quick-View Modal) */}
                {prodEditorial.showTrustBadgesBox !== false && (() => {
                  const activeBadges = (prodEditorial.trustBadges || []).filter((b) => b && b.enabled !== false && b.text);
                  if (activeBadges.length === 0) return null;
                  return (
                    <div className="bg-slate-50 rounded-2xl p-4 space-y-2 text-xs text-neutral-600 border border-neutral-100">
                      {activeBadges.map((badge, bIdx) => (
                        <div key={badge.id || bIdx} className="flex items-center gap-2">
                          {renderTrustBadgeIcon(badge.icon, badge.color, "w-4 h-4")}
                          <span>{badge.text}</span>
                        </div>
                      ))}
                    </div>
                  );
                })()}

                {/* Confirm Order Button - Positioned DIRECTLY under the trust badges without blank gap */}
                <div className="pt-2 space-y-2">
                  {isOutOfStock && (
                    <div className="p-3.5 rounded-xl bg-rose-50 border border-rose-200 text-rose-800 text-xs font-bold flex items-center gap-2">
                      <AlertCircle className="w-4 h-4 text-rose-600 shrink-0" />
                      <span>{"Sorry, this product is currently Out of Stock. Orders are temporarily closed."}</span>
                    </div>
                  )}
                  {trxError && (
                    <div className="p-3.5 rounded-xl bg-rose-50 border border-rose-200 text-rose-800 text-xs font-bold flex items-center gap-2">
                      <AlertCircle className="w-4 h-4 text-rose-600 shrink-0" />
                      <span>{trxError}</span>
                    </div>
                  )}
                  <button
                    type="submit"
                    disabled={isOutOfStock}
                    style={
                      !isOutOfStock
                        ? {
                            backgroundColor: pp.checkoutSubmitBtnBg || undefined,
                            color: pp.checkoutSubmitBtnText || undefined,
                          }
                        : undefined
                    }
                    className={`w-full py-4 px-6 rounded-xl font-black text-base transition-all flex items-center justify-center gap-2 ${isOutOfStock
                      ? "bg-neutral-200 text-neutral-400 border border-neutral-300 cursor-not-allowed select-none"
                      : "bg-emerald-600 hover:bg-emerald-700 active:scale-95 text-white shadow-lg shadow-neutral-950/25 cursor-pointer"
                      }`}
                  >
                    <Lock className="w-5 h-5" />
                    <span>{isOutOfStock ? ("Out of Stock") : `${prodEditorial.checkoutSubmitBtnText || "Confirm Order"} - ৳${total.toLocaleString()}`}</span>
                  </button>
                  {prodEditorial.checkoutTermsText && (
                    <p className="text-center text-[10px] text-neutral-400">
                      {prodEditorial.checkoutTermsText}
                    </p>
                  )}
                </div>
              </div>
            </form>
          </section>
        </main>
      )}

      {/* 12. Branded Unified Footer */}
      <Footer />

      {/* 13. Sticky Mobile CTA Bar (Mobile only, height 60-70px, min 46px touch target) */}
      {view === "landing" && (
        <div className="fixed bottom-0 inset-x-0 z-40 bg-white/95 backdrop-blur-md border-t border-neutral-200/90 px-4 py-2.5 flex md:hidden items-center justify-between gap-3 shadow-2xl">
          <div className="flex items-center gap-2.5 overflow-hidden">
            <img
              src={selectedImage || primaryImage}
              alt=""
              className="w-11 h-11 rounded-xl object-cover border border-neutral-200 shrink-0"
              onError={handleProductImageError}
            />
            <div className="min-w-0">
              <div className="text-[11px] font-bold text-neutral-900 truncate">
                {displayName}
              </div>
              <div className="flex items-baseline gap-1.5">
                <span className="text-sm font-black text-emerald-800">
                  ৳{currentPrice.toLocaleString()}
                </span>
                {originalPrice > currentPrice && (
                  <span className="text-[10px] text-neutral-400 line-through">
                    ৳{originalPrice.toLocaleString()}
                  </span>
                )}
              </div>
            </div>
          </div>
          <button
            disabled={isOutOfStock}
            onClick={scrollToCheckout}
            className={`min-h-[46px] py-2.5 px-5 rounded-xl font-extrabold text-xs shrink-0 flex items-center gap-1.5 ${isOutOfStock
              ? "bg-neutral-200 text-neutral-400 cursor-not-allowed border border-neutral-300 select-none"
              : "bg-orange-500 hover:bg-orange-600 active:scale-95 text-white shadow-md shadow-neutral-950/25 cursor-pointer"
              }`}
          >
            <ShoppingBag className="w-4 h-4" />
            <span>{isOutOfStock ? "Out of Stock" : "Confirm Order"}</span>
          </button>
        </div>
      )}

      {/* 14. Live Pixel & Tracking Drawer / Popover */}
      {pixelDrawerOpen && (
        <div className="fixed bottom-14 right-4 z-50 w-80 max-w-[90vw] bg-white rounded-2xl border border-neutral-200 shadow-2xl overflow-hidden animate-in slide-in-from-bottom-3 duration-200">
          <div className="bg-emerald-900 text-white p-3 flex items-center justify-between">
            <div className="flex items-center gap-2">
              <span className="h-2.5 w-2.5 rounded-full bg-emerald-400 animate-pulse" />
              <span className="text-xs font-bold">Meta Pixel & CAPI Live Log</span>
            </div>
            <button
              onClick={() => setPixelDrawerOpen(false)}
              className="text-white/80 hover:text-white text-xs font-bold px-1.5 py-0.5 rounded cursor-pointer"
            >
              ✕
            </button>
          </div>
          <div className="p-3 max-h-60 overflow-y-auto space-y-2 text-[11px]">
            <div className="text-[10px] text-neutral-500 font-semibold uppercase tracking-wider mb-1">
              Active Product: {product.sku} ({displayName})
            </div>
            {events.map((evt, idx) => (
              <div
                key={evt.id || idx}
                className="p-2 rounded-xl bg-slate-50 border border-neutral-200/80 space-y-0.5"
              >
                <div className="flex items-center justify-between font-bold">
                  <span className="text-emerald-700 font-mono text-[10px]">{evt.type}</span>
                  <span className="text-[9px] text-neutral-400">{evt.time}</span>
                </div>
                <div className="text-neutral-800 text-[11px] leading-tight">{evt.text}</div>
                {evt.payload && (
                  <div className="text-[10px] text-neutral-500 font-mono truncate">{evt.payload}</div>
                )}
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

export default CampaignLandingPage;
