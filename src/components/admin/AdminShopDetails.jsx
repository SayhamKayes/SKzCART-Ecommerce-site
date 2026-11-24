import React, { useState, useEffect, useRef } from "react";
import { resolveThemeText } from "../../utils/themeHelper";
import {
  Store,
  Save,
  Phone,
  Mail,
  MapPin,
  Image as ImageIcon,
  Globe,
  MessageSquare,
  CheckCircle2,
  AlertCircle,
  ExternalLink,
  Upload,
  Sparkles,
  RefreshCw,
  ShieldCheck,
  Tag,
  Plus,
  Pencil,
  Trash2,
  Copy,
  Check,
  X,
  Search,
  Truck,
  PhoneCall,
  Layout,
  Palette,
  Eye,
  Sliders,
  Layers,
  ShoppingBag,
  Loader2
} from "lucide-react";
import { formatBDT } from "../../utils/bangladesh";
import { useLanguage } from "../../Context/LanguageContext";
import { useThemeConfig } from "../frontPanel/FrontPanelContext";
import { apiClient } from "../../services/api";
import { MediaPickerModal } from "./MediaPickerModal";
import codImg from "../../assets/COD.png";
import bkashImg from "../../assets/bkash.png";
import nagadImg from "../../assets/nagad2.png";
import rocketImg from "../../assets/rocket2.png";

export const AdminShopDetails = ({
  orders = [],
  products = [],
  onNavigateTab,
  onSelectOrderStatusFilter,
  coupons = [],
  onRefreshCoupons
}) => {
  const { isEnglish, t } = useLanguage();
  const { themeConfig, updateThemeConfig } = useThemeConfig();

  // Active Sub-Tab for Shop Settings:
  // 'common' (Common Fields), 'topHeader' (Top Header), 'mainHeader' (Main Header), 'footer' (Footer)
  const [activeSettingsTab, setActiveSettingsTab] = useState("common");

  // Coupon Management State
  const [couponsList, setCouponsList] = useState(coupons || []);
  const [loadingCoupons, setLoadingCoupons] = useState(false);
  const [couponModalOpen, setCouponModalOpen] = useState(false);
  const [editingCoupon, setEditingCoupon] = useState(null);
  const [couponFormData, setCouponFormData] = useState({
    code: "",
    discountType: "fixed",
    value: 50,
    minSpend: 500,
    isActive: true
  });
  const [couponFormError, setCouponFormError] = useState("");
  const [isSavingCoupon, setIsSavingCoupon] = useState(false);
  const [copiedCode, setCopiedCode] = useState("");
  const [couponFeedbackMsg, setCouponFeedbackMsg] = useState("");

  const loadCoupons = async () => {
    setLoadingCoupons(true);
    try {
      const data = await apiClient.getCoupons(true);
      if (Array.isArray(data)) {
        setCouponsList(data);
      }
    } catch (err) {
      console.warn("Failed to load coupons from backend:", err);
    } finally {
      setLoadingCoupons(false);
    }
  };

  useEffect(() => {
    loadCoupons();
  }, []);

  useEffect(() => {
    if (Array.isArray(coupons) && coupons.length > 0) {
      setCouponsList(coupons);
    }
  }, [coupons]);

  const handleOpenAddCoupon = () => {
    setEditingCoupon(null);
    setCouponFormData({
      code: "",
      discountType: "fixed",
      value: 50,
      minSpend: 500,
      isActive: true
    });
    setCouponFormError("");
    setCouponModalOpen(true);
  };

  const handleOpenEditCoupon = (coupon) => {
    setEditingCoupon(coupon);
    setCouponFormData({
      code: coupon.code,
      discountType: coupon.discountType || "fixed",
      value: coupon.value || 0,
      minSpend: coupon.minSpend || 0,
      isActive: coupon.isActive !== false
    });
    setCouponFormError("");
    setCouponModalOpen(true);
  };

  const handleSaveCoupon = async (e) => {
    e.preventDefault();
    setCouponFormError("");
    const code = couponFormData.code.trim().toUpperCase();
    if (!code) {
      setCouponFormError("Please enter coupon code");
      return;
    }
    setIsSavingCoupon(true);
    try {
      if (editingCoupon) {
        await apiClient.updateCoupon(editingCoupon.code, {
          discountType: couponFormData.discountType,
          value: Number(couponFormData.value) || 0,
          minSpend: Number(couponFormData.minSpend) || 0,
          isActive: couponFormData.isActive
        });
        setCouponFeedbackMsg(
          `Coupon ${editingCoupon.code} updated successfully!`
        );
      } else {
        await apiClient.createCoupon({
          code,
          discountType: couponFormData.discountType,
          value: Number(couponFormData.value) || 0,
          minSpend: Number(couponFormData.minSpend) || 0,
          isActive: couponFormData.isActive
        });
        setCouponFeedbackMsg(
          `Coupon ${code} created successfully!`
        );
      }
      await loadCoupons();
      if (onRefreshCoupons) onRefreshCoupons();
      setCouponModalOpen(false);
      setTimeout(() => setCouponFeedbackMsg(""), 4000);
    } catch (err) {
      setCouponFormError(err.message || ("Failed to save coupon"));
    } finally {
      setIsSavingCoupon(false);
    }
  };

  const handleToggleCouponActive = async (coupon) => {
    try {
      const nextActive = !coupon.isActive;
      setCouponsList((prev) =>
        prev.map((c) => (c.code === coupon.code ? { ...c, isActive: nextActive } : c))
      );
      await apiClient.updateCoupon(coupon.code, { isActive: nextActive });
      if (onRefreshCoupons) onRefreshCoupons();
    } catch (err) {
      console.warn("Failed to toggle coupon active:", err);
      loadCoupons();
    }
  };

  const handleDeleteCoupon = async (code) => {
    if (!window.confirm(`Delete coupon ${code}?`)) {
      return;
    }
    try {
      setCouponsList((prev) => prev.filter((c) => c.code !== code));
      await apiClient.deleteCoupon(code);
      if (onRefreshCoupons) onRefreshCoupons();
      setCouponFeedbackMsg(`Coupon ${code} deleted!`);
      setTimeout(() => setCouponFeedbackMsg(""), 4000);
    } catch (err) {
      console.warn("Failed to delete coupon:", err);
      loadCoupons();
    }
  };

  const handleCopyCoupon = (code) => {
    navigator.clipboard?.writeText(code);
    setCopiedCode(code);
    setTimeout(() => setCopiedCode(""), 2000);
  };

  // -------------------------------------------------------------
  // 1. COMMON / GLOBAL IDENTITY FIELDS (Universal Storefront & Identity)
  // -------------------------------------------------------------
  const [shopName, setShopName] = useState(themeConfig?.shop?.name || "AmarDokan");
  const [shopTagline, setShopTagline] = useState(
    themeConfig?.shop?.tagline || "The #1 Trusted Premium Gadget & Lifestyle Shop in Bangladesh"
  );
  const [faviconUrl, setFaviconUrl] = useState(themeConfig?.shop?.faviconUrl || "");
  const [logoUrl, setLogoUrl] = useState(themeConfig?.shop?.logoUrl || "");
  const [shopLanguageMode, setShopLanguageMode] = useState("en");
  const [defaultLanguage, setDefaultLanguage] = useState("en");
  const [whatsappNumber, setWhatsappNumber] = useState(
    themeConfig?.shop?.whatsappNumber ?? ""
  );
  const [supportEmail, setSupportEmail] = useState(
    themeConfig?.shop?.supportEmail ?? ""
  );
  const [address, setAddress] = useState(
    themeConfig?.shop?.address ?? ""
  );
  // Custom Order ID / Transaction ID / Reconciliation Prefixes
  const [orderSymbol, setOrderSymbol] = useState(
    themeConfig?.shop?.idPrefixes?.orderSymbol ?? "#"
  );
  const [orderIdPrefix, setOrderIdPrefix] = useState(
    themeConfig?.shop?.idPrefixes?.orderIdPrefix ?? "BD"
  );
  const [transactionIdPrefix, setTransactionIdPrefix] = useState(
    themeConfig?.shop?.idPrefixes?.transactionIdPrefix ?? "AMAR"
  );
  const [reconciliationOrderPrefix, setReconciliationOrderPrefix] = useState(
    themeConfig?.shop?.idPrefixes?.reconciliationOrderPrefix ?? ""
  );
  const [reconciliationTrxPrefix, setReconciliationTrxPrefix] = useState(
    themeConfig?.shop?.idPrefixes?.reconciliationTrxPrefix ?? ""
  );

  // -------------------------------------------------------------
  // 2. TOP HEADER BAR FIELDS (Top Header - Customizable for Home & Product Pages)
  // -------------------------------------------------------------
  const [topAnnouncementText, setTopAnnouncementText] = useState(() =>
    resolveThemeText(
      themeConfig?.header?.announcementText,
      themeConfig?.header?.announcementTextEn,
      "Inspect parcel upon delivery before payment",
      "Inspect parcel upon delivery before payment"
    )
  );
  const [topInspectionText, setTopInspectionText] = useState(() =>
    resolveThemeText(
      themeConfig?.header?.inspectionText,
      themeConfig?.header?.inspectionTextEn,
      "Inspect parcel before payment",
      "Inspect parcel before payment"
    )
  );
  const [topHotline, setTopHotline] = useState(() =>
    themeConfig?.header?.hotline !== undefined
      ? themeConfig.header.hotline
      : (themeConfig?.shop?.hotline ?? "09612345678")
  );
  const [topTrackText, setTopTrackText] = useState(() =>
    resolveThemeText(
      themeConfig?.header?.trackButtonText,
      themeConfig?.header?.trackButtonTextEn,
      "Track Order",
      "Track Order"
    )
  );
  const [showTopAnnouncement, setShowTopAnnouncement] = useState(
    themeConfig?.header?.showAnnouncement !== false
  );
  const [showTopHotline, setShowTopHotline] = useState(
    themeConfig?.header?.showHotline !== false
  );
  const [showTopTrackOrder, setShowTopTrackOrder] = useState(
    themeConfig?.header?.showTrackOrder !== false
  );

  // Product Page & Landing Page specific customizer:
  const [useCustomProductTopHeader, setUseCustomProductTopHeader] = useState(
    Boolean(themeConfig?.header?.useCustomProductTopHeader)
  );
  const [productAnnouncementText, setProductAnnouncementText] = useState(() =>
    resolveThemeText(
      themeConfig?.header?.productAnnouncementText,
      themeConfig?.header?.productAnnouncementTextEn,
      "Inspect parcel upon delivery before payment",
      "Inspect parcel upon delivery before payment"
    )
  );
  const [productInspectionText, setProductInspectionText] = useState(() =>
    resolveThemeText(
      themeConfig?.header?.productInspectionText,
      themeConfig?.header?.productInspectionTextEn,
      "Inspect parcel before payment",
      "Inspect parcel before payment"
    )
  );
  const [productHotline, setProductHotline] = useState(() =>
    themeConfig?.header?.productHotline !== undefined
      ? themeConfig.header.productHotline
      : (themeConfig?.header?.hotline ?? "09612345678")
  );

  // -------------------------------------------------------------
  // 3. MAIN HEADER & LOGO (Main Header Navigation & Storefront Logo)
  // -------------------------------------------------------------
  const [headerLogoUrl, setHeaderLogoUrl] = useState(
    themeConfig?.shop?.headerLogoUrl || themeConfig?.header?.headerLogoUrl || ""
  );
  const [headerLogoText, setHeaderLogoText] = useState(
    themeConfig?.header?.headerLogoText || themeConfig?.shop?.headerLogoText || ""
  );
  const [searchPlaceholder, setSearchPlaceholder] = useState(() =>
    resolveThemeText(
      themeConfig?.header?.searchPlaceholder,
      themeConfig?.header?.searchPlaceholderEn,
      "Search product or model (e.g. smartwatch, earbuds)...",
      "Search product or model (e.g. smartwatch, earbuds)..."
    )
  );
  const [showSearchBar, setShowSearchBar] = useState(
    themeConfig?.header?.showSearchBar !== false
  );

  // -------------------------------------------------------------
  // 4. FOOTER & DARK BRANDING FIELDS (Footer & Dark Theme Branding)
  // -------------------------------------------------------------
  const [footerLogoUrl, setFooterLogoUrl] = useState(
    themeConfig?.shop?.footerLogoUrl || ""
  );
  const [footerNotice, setFooterNotice] = useState(() =>
    resolveThemeText(
      themeConfig?.shop?.footerNotice,
      themeConfig?.shop?.footerNoticeEn,
      "Fastest nationwide delivery with secure cash on delivery across Bangladesh.",
      themeConfig?.shop?.deliveryNotice || "Fastest nationwide delivery with secure cash on delivery across Bangladesh."
    )
  );
  const [footerWorkingHours, setFooterWorkingHours] = useState(() =>
    resolveThemeText(
      themeConfig?.shop?.footerWorkingHours,
      themeConfig?.shop?.footerWorkingHoursEn,
      "Hours: 9:00 AM - 11:00 PM",
      "Hours: 9:00 AM - 11:00 PM"
    )
  );
  const [footerHotline, setFooterHotline] = useState(() =>
    themeConfig?.shop?.footerHotline !== undefined
      ? themeConfig.shop.footerHotline
      : (themeConfig?.shop?.hotline ?? "09612345678")
  );
  const [footerEmail, setFooterEmail] = useState(() =>
    themeConfig?.shop?.footerEmail !== undefined
      ? themeConfig.shop.footerEmail
      : (themeConfig?.shop?.supportEmail ?? "support@amardokan.com")
  );
  const [footerCourier1, setFooterCourier1] = useState(
    themeConfig?.shop?.footerCourier1 !== undefined ? themeConfig.shop.footerCourier1 : "Pathao Courier Express"
  );
  const [footerCourier2, setFooterCourier2] = useState(
    themeConfig?.shop?.footerCourier2 !== undefined ? themeConfig.shop.footerCourier2 : "Steadfast Courier Service"
  );
  const [footerCourier3, setFooterCourier3] = useState(
    themeConfig?.shop?.footerCourier3 !== undefined ? themeConfig.shop.footerCourier3 : "RedX Logistics"
  );
  const [footerCopyrightText, setFooterCopyrightText] = useState(
    themeConfig?.shop?.footerCopyrightText || ""
  );
  const [footerPaymentColumns, setFooterPaymentColumns] = useState(
    themeConfig?.shop?.footerPaymentColumns || 4
  );
  const [footerShowPayments, setFooterShowPayments] = useState(
    themeConfig?.shop?.footerShowPayments !== false
  );

  // Status & UI States
  const [isSaving, setIsSaving] = useState(false);
  const [saveSuccessMsg, setSaveSuccessMsg] = useState("");
  const [uploadingAsset, setUploadingAsset] = useState(null);
  const [removingAsset, setRemovingAsset] = useState(null);
  const [mediaPickerField, setMediaPickerField] = useState(null);
  const isDirtyRef = useRef(false);
  const lastAppliedJsonRef = useRef("");

  // Sync from themeConfig ONLY when remote settings update and user isn't mid-edit
  useEffect(() => {
    if (!themeConfig) return;
    const serialized = JSON.stringify({ shop: themeConfig.shop, header: themeConfig.header });
    if (serialized === lastAppliedJsonRef.current) return;
    if (isDirtyRef.current) return;
    lastAppliedJsonRef.current = serialized;

    if (themeConfig.shop) {
      if (themeConfig.shop.name !== undefined) setShopName(themeConfig.shop.name);
      if (themeConfig.shop.tagline !== undefined) setShopTagline(themeConfig.shop.tagline);
      if (themeConfig.shop.logoUrl !== undefined) setLogoUrl(themeConfig.shop.logoUrl);
      if (themeConfig.shop.headerLogoUrl !== undefined) setHeaderLogoUrl(themeConfig.shop.headerLogoUrl);
      if (themeConfig.shop.headerLogoText !== undefined) setHeaderLogoText(themeConfig.shop.headerLogoText);
      if (themeConfig.shop.footerLogoUrl !== undefined) setFooterLogoUrl(themeConfig.shop.footerLogoUrl);
      if (themeConfig.shop.faviconUrl !== undefined) setFaviconUrl(themeConfig.shop.faviconUrl);
      if (themeConfig.shop.whatsappNumber !== undefined) setWhatsappNumber(themeConfig.shop.whatsappNumber);
      if (themeConfig.shop.supportEmail !== undefined) setSupportEmail(themeConfig.shop.supportEmail);
      if (themeConfig.shop.idPrefixes) {
        if (themeConfig.shop.idPrefixes.orderSymbol !== undefined) setOrderSymbol(themeConfig.shop.idPrefixes.orderSymbol);
        if (themeConfig.shop.idPrefixes.orderIdPrefix !== undefined) setOrderIdPrefix(themeConfig.shop.idPrefixes.orderIdPrefix);
        if (themeConfig.shop.idPrefixes.transactionIdPrefix !== undefined) setTransactionIdPrefix(themeConfig.shop.idPrefixes.transactionIdPrefix);
        if (themeConfig.shop.idPrefixes.reconciliationOrderPrefix !== undefined) setReconciliationOrderPrefix(themeConfig.shop.idPrefixes.reconciliationOrderPrefix);
        if (themeConfig.shop.idPrefixes.reconciliationTrxPrefix !== undefined) setReconciliationTrxPrefix(themeConfig.shop.idPrefixes.reconciliationTrxPrefix);
      }
      if (themeConfig.shop.address !== undefined) setAddress(themeConfig.shop.address);
      if (themeConfig.shop.shopLanguageMode) setShopLanguageMode(themeConfig.shop.shopLanguageMode);
      if (themeConfig.shop.defaultLanguage) setDefaultLanguage(themeConfig.shop.defaultLanguage);
      if (themeConfig.shop.footerNotice !== undefined || themeConfig.shop.footerNoticeEn !== undefined) {
        setFooterNotice(
          resolveThemeText(
            themeConfig.shop.footerNotice,
            themeConfig.shop.footerNoticeEn,
            "Fastest nationwide delivery with secure cash on delivery across Bangladesh.",
            ""
          )
        );
      }
      if (themeConfig.shop.footerWorkingHours !== undefined || themeConfig.shop.footerWorkingHoursEn !== undefined) {
        setFooterWorkingHours(
          resolveThemeText(
            themeConfig.shop.footerWorkingHours,
            themeConfig.shop.footerWorkingHoursEn,
            "Hours: 9:00 AM - 11:00 PM",
            ""
          )
        );
      }
      if (themeConfig.shop.footerHotline !== undefined) setFooterHotline(themeConfig.shop.footerHotline);
      if (themeConfig.shop.footerEmail !== undefined) setFooterEmail(themeConfig.shop.footerEmail);
      if (themeConfig.shop.footerCourier1 !== undefined) setFooterCourier1(themeConfig.shop.footerCourier1);
      if (themeConfig.shop.footerCourier2 !== undefined) setFooterCourier2(themeConfig.shop.footerCourier2);
      if (themeConfig.shop.footerCourier3 !== undefined) setFooterCourier3(themeConfig.shop.footerCourier3);
      if (themeConfig.shop.footerCopyrightText !== undefined) setFooterCopyrightText(themeConfig.shop.footerCopyrightText);
      if (themeConfig.shop.footerPaymentColumns !== undefined) setFooterPaymentColumns(Number(themeConfig.shop.footerPaymentColumns) || 4);
      if (themeConfig.shop.footerShowPayments !== undefined) setFooterShowPayments(themeConfig.shop.footerShowPayments !== false);
    }
    if (themeConfig.header) {
      if (themeConfig.header.announcementText !== undefined || themeConfig.header.announcementTextEn !== undefined) {
        setTopAnnouncementText(
          resolveThemeText(
            themeConfig.header.announcementText,
            themeConfig.header.announcementTextEn,
            "Inspect parcel upon delivery before payment",
            ""
          )
        );
      }
      if (themeConfig.header.inspectionText !== undefined || themeConfig.header.inspectionTextEn !== undefined) {
        setTopInspectionText(
          resolveThemeText(
            themeConfig.header.inspectionText,
            themeConfig.header.inspectionTextEn,
            "Inspect parcel before payment",
            ""
          )
        );
      }
      if (themeConfig.header.hotline !== undefined) setTopHotline(themeConfig.header.hotline);
      if (themeConfig.header.trackButtonText !== undefined || themeConfig.header.trackButtonTextEn !== undefined) {
        setTopTrackText(
          resolveThemeText(
            themeConfig.header.trackButtonText,
            themeConfig.header.trackButtonTextEn,
            "Track Order",
            ""
          )
        );
      }
      if (themeConfig.header.showAnnouncement !== undefined) setShowTopAnnouncement(themeConfig.header.showAnnouncement !== false);
      if (themeConfig.header.showHotline !== undefined) setShowTopHotline(themeConfig.header.showHotline !== false);
      if (themeConfig.header.showTrackOrder !== undefined) setShowTopTrackOrder(themeConfig.header.showTrackOrder !== false);

      if (themeConfig.header.useCustomProductTopHeader !== undefined) {
        setUseCustomProductTopHeader(Boolean(themeConfig.header.useCustomProductTopHeader));
      }
      if (themeConfig.header.productAnnouncementText !== undefined || themeConfig.header.productAnnouncementTextEn !== undefined) {
        setProductAnnouncementText(
          resolveThemeText(
            themeConfig.header.productAnnouncementText,
            themeConfig.header.productAnnouncementTextEn,
            "Inspect parcel upon delivery before payment",
            ""
          )
        );
      }
      if (themeConfig.header.productInspectionText !== undefined || themeConfig.header.productInspectionTextEn !== undefined) {
        setProductInspectionText(
          resolveThemeText(
            themeConfig.header.productInspectionText,
            themeConfig.header.productInspectionTextEn,
            "Inspect parcel before payment",
            ""
          )
        );
      }
      if (themeConfig.header.productHotline !== undefined) setProductHotline(themeConfig.header.productHotline);

      if (themeConfig.header.headerLogoUrl !== undefined) setHeaderLogoUrl(themeConfig.header.headerLogoUrl);
      if (themeConfig.header.headerLogoText !== undefined) setHeaderLogoText(themeConfig.header.headerLogoText);
      if (themeConfig.header.searchPlaceholder !== undefined || themeConfig.header.searchPlaceholderEn !== undefined) {
        setSearchPlaceholder(
          resolveThemeText(
            themeConfig.header.searchPlaceholder,
            themeConfig.header.searchPlaceholderEn,
            "Search product or model (e.g. smartwatch, earbuds)...",
            ""
          )
        );
      }
      if (themeConfig.header.showSearchBar !== undefined) setShowSearchBar(themeConfig.header.showSearchBar !== false);
    }
  }, [themeConfig]);

  // Handle Save All Settings
  const handleSaveAll = async (e) => {
    if (e) e.preventDefault();
    setIsSaving(true);
    setSaveSuccessMsg("");

    const trimmedNotice = footerNotice.trim();
    const trimmedHours = footerWorkingHours.trim();
    const trimmedAnnouncement = topAnnouncementText.trim();
    const trimmedInspection = topInspectionText.trim();
    const trimmedTrack = topTrackText.trim();
    const trimmedProdAnnouncement = useCustomProductTopHeader ? productAnnouncementText.trim() : trimmedAnnouncement;
    const trimmedProdInspection = useCustomProductTopHeader ? productInspectionText.trim() : trimmedInspection;
    const trimmedProdHotline = useCustomProductTopHeader ? productHotline.trim() : topHotline.trim();
    const trimmedSearchPlaceholder = searchPlaceholder.trim();

    const updatedShopConfig = {
      ...(themeConfig?.shop || {}),
      name: shopName.trim() || "AmarDokan",
      shopName: shopName.trim() || "AmarDokan",
      tagline: shopTagline.trim(),
      shopTagline: shopTagline.trim(),
      hotline: topHotline.trim(),
      whatsappNumber: whatsappNumber.trim(),
      supportEmail: supportEmail.trim(),
      address: address.trim(),
      logoUrl: logoUrl.trim(),
      headerLogoUrl: headerLogoUrl.trim(),
      headerLogoText: headerLogoText.trim(),
      footerLogoUrl: footerLogoUrl.trim(),
      faviconUrl: faviconUrl.trim(),
      shopLanguageMode,
      defaultLanguage,
      footerNotice: trimmedNotice,
      footerNoticeEn: trimmedNotice,
      footerWorkingHours: trimmedHours,
      footerWorkingHoursEn: trimmedHours,
      footerHotline: footerHotline.trim(),
      footerEmail: footerEmail.trim(),
      footerCourier1: footerCourier1.trim(),
      footerCourier2: footerCourier2.trim(),
      footerCourier3: footerCourier3.trim(),
      footerCopyrightText: footerCopyrightText.trim(),
      footerPaymentColumns: Number(footerPaymentColumns) || 4,
      footerShowPayments,
      idPrefixes: {
        orderSymbol: orderSymbol.trim(),
        orderIdPrefix: orderIdPrefix.trim().toUpperCase(),
        transactionIdPrefix: transactionIdPrefix.trim().toUpperCase(),
        reconciliationOrderPrefix: reconciliationOrderPrefix.trim().toUpperCase(),
        reconciliationTrxPrefix: reconciliationTrxPrefix.trim().toUpperCase(),
      },
    };

    const updatedHeaderConfig = {
      ...(themeConfig?.header || {}),
      announcementText: trimmedAnnouncement,
      announcementTextEn: trimmedAnnouncement,
      inspectionText: trimmedInspection,
      inspectionTextEn: trimmedInspection,
      hotline: topHotline.trim(),
      trackButtonText: trimmedTrack,
      trackButtonTextEn: trimmedTrack,
      showAnnouncement: showTopAnnouncement,
      showHotline: showTopHotline,
      showTrackOrder: showTopTrackOrder,
      useCustomProductTopHeader,
      productAnnouncementText: trimmedProdAnnouncement,
      productAnnouncementTextEn: trimmedProdAnnouncement,
      productInspectionText: trimmedProdInspection,
      productInspectionTextEn: trimmedProdInspection,
      productHotline: trimmedProdHotline,
      headerLogoUrl: headerLogoUrl.trim(),
      headerLogoText: headerLogoText.trim(),
      searchPlaceholder: trimmedSearchPlaceholder,
      searchPlaceholderEn: trimmedSearchPlaceholder,
      showSearchBar: showSearchBar,
    };

    try {
      const saveRes = await updateThemeConfig({
        shop: updatedShopConfig,
        header: updatedHeaderConfig,
      });

      if (saveRes && saveRes.success === false) {
        throw new Error(saveRes.message || "Backend save returned failure");
      }

      isDirtyRef.current = false;
      lastAppliedJsonRef.current = JSON.stringify({
        shop: updatedShopConfig,
        header: updatedHeaderConfig,
      });

      setSaveSuccessMsg(
        "Store identity, header, and footer configurations saved successfully!"
      );

      setTimeout(() => setSaveSuccessMsg(""), 5000);
    } catch (err) {
      console.error("Save shop details error:", err);
      setSaveSuccessMsg(
        "Failed to save settings to server."
      );
    } finally {
      setIsSaving(false);
    }
  };

  // Upload branding image to Cloudinary / Server Media & persist immediately
  const handleFileUpload = async (e, fieldKey, targetSetter) => {
    const file = e.target.files?.[0];
    if (!file) return;
    if (file.size > 5 * 1024 * 1024) {
      alert("File size must be under 5MB");
      return;
    }
    setUploadingAsset(fieldKey);
    try {
      const res = await apiClient.uploadProductImage(file);
      if (res && res.url) {
        targetSetter(res.url);
        updateThemeConfig("shop", { [fieldKey]: res.url });
        if (fieldKey === "headerLogoUrl") {
          updateThemeConfig("header", { headerLogoUrl: res.url });
        }
        setSaveSuccessMsg("Image uploaded and saved!");
        setTimeout(() => setSaveSuccessMsg(""), 3000);
      }
    } catch (err) {
      console.error("Asset upload failed:", err);
      alert(`Failed to upload image: ${err.message || "Upload error"}`);
    } finally {
      setUploadingAsset(null);
      e.target.value = "";
    }
  };

  // Remove branding image from Cloudinary/Server storage AND clear from DB immediately
  const handleRemoveBrandAsset = async (fieldKey, currentUrl, targetSetter) => {
    setRemovingAsset(fieldKey);
    try {
      if (
        currentUrl &&
        (currentUrl.includes("cloudinary.com") || currentUrl.includes("/media/products/"))
      ) {
        await apiClient.deleteProductImage(currentUrl).catch(() => { });
      }
      targetSetter("");
      updateThemeConfig("shop", { [fieldKey]: "" });
      if (fieldKey === "headerLogoUrl") {
        updateThemeConfig("header", { headerLogoUrl: "" });
      }
      setSaveSuccessMsg("Image removed from storage and storefront!");
      setTimeout(() => setSaveSuccessMsg(""), 3000);
    } catch (err) {
      console.error("Asset remove failed:", err);
    } finally {
      setRemovingAsset(null);
    }
  };

  return (
    <div className="space-y-8 max-w-7xl mx-auto pb-16">
      {/* Top Banner & Quick Save */}
      <div className="bg-white rounded-3xl p-6 border border-neutral-200 shadow-xs flex flex-wrap items-center justify-between gap-4">
        <div>
          <span className="text-xs font-bold uppercase tracking-wider text-emerald-700 bg-emerald-50 px-3 py-1 rounded-full flex items-center gap-1.5 w-fit">
            <Store className="w-3.5 h-3.5" />
            <span>{"Storefront & Identity Control"}</span>
          </span>
          <h1 className="text-2xl font-black text-neutral-900 mt-2">
            {"Shop Details & Branding Hub"}
          </h1>
          <p className="text-xs text-neutral-500">
            {"Configure store name, header logos, top announcement bar, product header, and dark footer styling."}
          </p>
        </div>

        <div className="flex items-center gap-3">
          <button
            type="button"
            onClick={handleSaveAll}
            disabled={isSaving}
            className="px-5 py-2.5 bg-emerald-600 hover:bg-emerald-700 active:bg-emerald-800 text-white rounded-xl text-xs font-extrabold transition-all shadow-md shadow-emerald-600/20 flex items-center gap-2 cursor-pointer disabled:opacity-50"
          >
            {isSaving ? (
              <RefreshCw className="w-4 h-4 animate-spin" />
            ) : (
              <Save className="w-4 h-4" />
            )}
            <span>{"Save All Changes"}</span>
          </button>
        </div>
      </div>

      {/* Save Success Alert */}
      {saveSuccessMsg && (
        <div className="p-4 rounded-2xl bg-emerald-50 border border-emerald-200 text-emerald-900 text-xs font-bold flex items-center gap-2.5 animate-in fade-in slide-in-from-top-2">
          <CheckCircle2 className="w-5 h-5 text-emerald-600 shrink-0" />
          <span>{saveSuccessMsg}</span>
        </div>
      )}

      {/* 4 CORE BRANDING TABS (User-friendly section navigation) */}
      <div className="bg-white rounded-3xl p-6 sm:p-8 border border-neutral-200 shadow-xs space-y-6">
        {/* Navigation Tabs Header */}
        <div className="flex flex-wrap items-center gap-2 p-1.5 bg-neutral-100 rounded-2xl border border-neutral-200">
          <button
            type="button"
            onClick={() => setActiveSettingsTab("common")}
            className={`flex-1 min-w-[160px] py-2.5 px-4 rounded-xl text-xs font-bold transition-all flex items-center justify-center gap-2 cursor-pointer ${activeSettingsTab === "common"
              ? "bg-white text-emerald-700 shadow-xs border border-neutral-200/80"
              : "text-neutral-600 hover:text-neutral-900 hover:bg-white/50"
              }`}
          >
            <Globe className="w-4 h-4" />
            <span>{"1. Common Identity"}</span>
          </button>

          <button
            type="button"
            onClick={() => setActiveSettingsTab("topHeader")}
            className={`flex-1 min-w-[160px] py-2.5 px-4 rounded-xl text-xs font-bold transition-all flex items-center justify-center gap-2 cursor-pointer ${activeSettingsTab === "topHeader"
              ? "bg-white text-emerald-700 shadow-xs border border-neutral-200/80"
              : "text-neutral-600 hover:text-neutral-900 hover:bg-white/50"
              }`}
          >
            <Layers className="w-4 h-4" />
            <span>{"2. Top Header Bar"}</span>
          </button>

          <button
            type="button"
            onClick={() => setActiveSettingsTab("mainHeader")}
            className={`flex-1 min-w-[160px] py-2.5 px-4 rounded-xl text-xs font-bold transition-all flex items-center justify-center gap-2 cursor-pointer ${activeSettingsTab === "mainHeader"
              ? "bg-white text-emerald-700 shadow-xs border border-neutral-200/80"
              : "text-neutral-600 hover:text-neutral-900 hover:bg-white/50"
              }`}
          >
            <Layout className="w-4 h-4" />
            <span>{"3. Main Header & Logo"}</span>
          </button>

          <button
            type="button"
            onClick={() => setActiveSettingsTab("footer")}
            className={`flex-1 min-w-[160px] py-2.5 px-4 rounded-xl text-xs font-bold transition-all flex items-center justify-center gap-2 cursor-pointer ${activeSettingsTab === "footer"
              ? "bg-white text-emerald-700 shadow-xs border border-neutral-200/80"
              : "text-neutral-600 hover:text-neutral-900 hover:bg-white/50"
              }`}
          >
            <Palette className="w-4 h-4" />
            <span>{"4. Footer Branding"}</span>
          </button>
        </div>

        {/* TAB 1: COMMON & UNIQUE STORE PROFILE (Global Storefront Profile) */}
        {activeSettingsTab === "common" && (
          <div className="space-y-6 animate-in fade-in duration-200">
            <div>
              <h2 className="text-base font-bold text-neutral-900 flex items-center gap-2">
                <Globe className="w-4 h-4 text-emerald-600" />
                <span>{"Global Store Identity & Contacts"}</span>
              </h2>
              <p className="text-xs text-neutral-400 mt-1">
                {"Unique global settings. Changes here automatically reflect across browser tab title, invoices, and checkout."}
              </p>
            </div>

            {/* Shop Name & Tagline */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-bold text-neutral-700 mb-1">
                  {"Shop Name"} *
                </label>
                <input
                  type="text"
                  value={shopName}
                  onChange={(e) => setShopName(e.target.value)}
                  placeholder="e.g. AmarDokan"
                  className="w-full px-4 py-2.5 rounded-xl bg-neutral-50 border border-neutral-300 text-xs font-bold text-neutral-900 focus:bg-white focus:border-emerald-500 transition-all"
                  required
                />
                <span className="text-[11px] text-neutral-400 mt-1 block">
                  {"Universal store name used across header, footer & invoice."}
                </span>
              </div>

              <div>
                <label className="block text-xs font-bold text-neutral-700 mb-1">
                  {"Shop Slogan / Tagline"}
                </label>
                <input
                  type="text"
                  value={shopTagline}
                  onChange={(e) => setShopTagline(e.target.value)}
                  placeholder="e.g. #1 Trusted Premium Gadget & Lifestyle Shop"
                  className="w-full px-4 py-2.5 rounded-xl bg-neutral-50 border border-neutral-300 text-xs font-semibold text-neutral-900 focus:bg-white focus:border-emerald-500 transition-all"
                />
              </div>
            </div>

            {/* Contact Numbers, Email & Showroom Address */}
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
              <div>
                <label className="block text-xs font-bold text-neutral-700 mb-1 flex items-center gap-1">
                  <MessageSquare className="w-3.5 h-3.5 text-emerald-600" />
                  <span>{"WhatsApp Support Number"}</span>
                </label>
                <input
                  type="text"
                  value={whatsappNumber}
                  onChange={(e) => setWhatsappNumber(e.target.value)}
                  placeholder="01712849201"
                  className="w-full px-4 py-2.5 rounded-xl bg-neutral-50 border border-neutral-300 text-xs font-mono font-bold text-neutral-900 focus:bg-white focus:border-emerald-500 transition-all"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-neutral-700 mb-1 flex items-center gap-1">
                  <Mail className="w-3.5 h-3.5 text-emerald-600" />
                  <span>{"Support Email Address"}</span>
                </label>
                <input
                  type="email"
                  value={supportEmail}
                  onChange={(e) => setSupportEmail(e.target.value)}
                  placeholder="support@amardokan.com"
                  className="w-full px-4 py-2.5 rounded-xl bg-neutral-50 border border-neutral-300 text-xs font-semibold text-neutral-900 focus:bg-white focus:border-emerald-500 transition-all"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-neutral-700 mb-1 flex items-center gap-1">
                  <MapPin className="w-3.5 h-3.5 text-emerald-600" />
                  <span>{"Showroom / Office Address"}</span>
                </label>
                <input
                  type="text"
                  value={address}
                  onChange={(e) => setAddress(e.target.value)}
                  placeholder="e.g. Level 4, Gulshan Avenue, Dhaka 1212"
                  className="w-full px-4 py-2.5 rounded-xl bg-neutral-50 border border-neutral-300 text-xs font-semibold text-neutral-900 focus:bg-white focus:border-emerald-500 transition-all"
                />
              </div>
            </div>

            {/* Favicon & Global Default Logo */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-6 pt-4 border-t border-neutral-200">
              {/* Favicon Box */}
              <div className="space-y-3 p-4 rounded-2xl bg-neutral-50 border border-neutral-200">
                <div className="flex items-center justify-between gap-2">
                  <span className="text-xs font-bold text-neutral-800 flex items-center gap-1.5">
                    <Globe className="w-4 h-4 text-indigo-600" />
                    <span>{"Browser Favicon (Tab Icon)"}</span>
                  </span>
                  {faviconUrl && (
                    <button
                      type="button"
                      disabled={removingAsset === "faviconUrl"}
                      onClick={() => handleRemoveBrandAsset("faviconUrl", faviconUrl, setFaviconUrl)}
                      className="px-2.5 py-1 rounded-lg bg-rose-50 hover:bg-rose-100 text-rose-600 border border-rose-200 text-[11px] font-bold flex items-center gap-1 cursor-pointer transition-colors disabled:opacity-50"
                      title="Remove Favicon from Cloudinary/Server & Storefront"
                    >
                      {removingAsset === "faviconUrl" ? (
                        <Loader2 className="w-3 h-3 animate-spin" />
                      ) : (
                        <Trash2 className="w-3 h-3" />
                      )}
                      <span>Remove</span>
                    </button>
                  )}
                </div>
                <div className="flex gap-2">
                  <input
                    type="text"
                    value={faviconUrl}
                    onChange={(e) => setFaviconUrl(e.target.value)}
                    placeholder="https://.../favicon.ico"
                    className="flex-1 px-3 py-2 rounded-xl bg-white border border-neutral-300 text-xs font-mono"
                  />
                  <label className="px-3 py-2 bg-neutral-200 hover:bg-neutral-300 rounded-xl text-xs font-bold cursor-pointer flex items-center gap-1 text-neutral-700 shrink-0">
                    {uploadingAsset === "faviconUrl" ? (
                      <Loader2 className="w-3.5 h-3.5 animate-spin" />
                    ) : (
                      <Upload className="w-3.5 h-3.5" />
                    )}
                    <span>{uploadingAsset === "faviconUrl" ? "Uploading..." : "Upload"}</span>
                    <input
                      type="file"
                      accept="image/*"
                      className="hidden"
                      disabled={uploadingAsset === "faviconUrl"}
                      onChange={(e) => handleFileUpload(e, "faviconUrl", setFaviconUrl)}
                    />
                  </label>
                  <button
                    type="button"
                    onClick={() => setMediaPickerField("faviconUrl")}
                    className="px-3 py-2 bg-emerald-50 hover:bg-emerald-100 border border-emerald-200 rounded-xl text-xs font-bold text-emerald-800 flex items-center gap-1 cursor-pointer shrink-0"
                    title="Select from Media Library"
                  >
                    <ImageIcon className="w-3.5 h-3.5" />
                    <span>Media</span>
                  </button>
                </div>
                {/* Browser Tab Mockup */}
                <div className="p-2.5 bg-neutral-900 rounded-xl flex items-center gap-2 max-w-sm">
                  {faviconUrl ? (
                    <img src={faviconUrl} alt="Favicon" className="w-4 h-4 rounded-xs object-contain" />
                  ) : (
                    <div className="w-4 h-4 rounded-xs bg-emerald-500 flex items-center justify-center text-[10px] font-bold text-white">
                      {shopName ? shopName.charAt(0).toUpperCase() : "A"}
                    </div>
                  )}
                  <span className="text-xs text-neutral-200 font-medium truncate">
                    {shopName} • {shopTagline ? shopTagline.slice(0, 28) + "..." : "Online Store"}
                  </span>
                </div>
              </div>

              {/* Global Default Fallback Logo Box */}
              <div className="space-y-3 p-4 rounded-2xl bg-neutral-50 border border-neutral-200">
                <div className="flex items-center justify-between gap-2">
                  <span className="text-xs font-bold text-neutral-800 flex items-center gap-1.5">
                    <ImageIcon className="w-4 h-4 text-emerald-600" />
                    <span>{"Global Default Logo (Main Storefront Logo)"}</span>
                  </span>
                  {logoUrl && (
                    <button
                      type="button"
                      disabled={removingAsset === "logoUrl"}
                      onClick={() => handleRemoveBrandAsset("logoUrl", logoUrl, setLogoUrl)}
                      className="px-2.5 py-1 rounded-lg bg-rose-50 hover:bg-rose-100 text-rose-600 border border-rose-200 text-[11px] font-bold flex items-center gap-1 cursor-pointer transition-colors disabled:opacity-50"
                      title="Remove Logo from Cloudinary/Server & Storefront"
                    >
                      {removingAsset === "logoUrl" ? (
                        <Loader2 className="w-3 h-3 animate-spin" />
                      ) : (
                        <Trash2 className="w-3 h-3" />
                      )}
                      <span>Remove</span>
                    </button>
                  )}
                </div>
                <div className="flex gap-2">
                  <input
                    type="text"
                    value={logoUrl}
                    onChange={(e) => setLogoUrl(e.target.value)}
                    placeholder="https://.../logo.png (Leave empty to use Shop Name text)"
                    className="flex-1 px-3 py-2 rounded-xl bg-white border border-neutral-300 text-xs font-mono"
                  />
                  <label className="px-3 py-2 bg-neutral-200 hover:bg-neutral-300 rounded-xl text-xs font-bold cursor-pointer flex items-center gap-1 text-neutral-700 shrink-0">
                    {uploadingAsset === "logoUrl" ? (
                      <Loader2 className="w-3.5 h-3.5 animate-spin" />
                    ) : (
                      <Upload className="w-3.5 h-3.5" />
                    )}
                    <span>{uploadingAsset === "logoUrl" ? "Uploading..." : "Upload"}</span>
                    <input
                      type="file"
                      accept="image/*"
                      className="hidden"
                      disabled={uploadingAsset === "logoUrl"}
                      onChange={(e) => handleFileUpload(e, "logoUrl", setLogoUrl)}
                    />
                  </label>
                  <button
                    type="button"
                    onClick={() => setMediaPickerField("logoUrl")}
                    className="px-3 py-2 bg-emerald-50 hover:bg-emerald-100 border border-emerald-200 rounded-xl text-xs font-bold text-emerald-800 flex items-center gap-1 cursor-pointer shrink-0"
                    title="Select from Media Library"
                  >
                    <ImageIcon className="w-3.5 h-3.5" />
                    <span>Media</span>
                  </button>
                </div>
                <div className="p-3 bg-white rounded-xl border border-neutral-200 flex items-center justify-center min-h-[54px]">
                  {logoUrl ? (
                    <img
                      src={logoUrl}
                      alt="Logo Preview"
                      className="max-h-9 w-auto object-contain"
                    />
                  ) : (
                    <div className="flex items-center gap-2">
                      <span className="text-lg font-black tracking-tight text-neutral-900">
                        {shopName || "AmarDokan"}
                      </span>
                      <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-emerald-50 text-emerald-700 border border-emerald-200">
                        Text Logo Active
                      </span>
                    </div>
                  )}
                </div>
              </div>
            </div>

            {/* Custom Brand Order ID, Transaction ID & Reconciliation Prefixes */}
            <div className="p-5 rounded-2xl bg-neutral-50 border border-neutral-200 space-y-4">
              <div className="flex flex-wrap items-center justify-between gap-2 border-b border-neutral-200 pb-3">
                <div>
                  <h3 className="text-xs font-bold uppercase tracking-wider text-neutral-800 flex items-center gap-2">
                    <Tag className="w-4 h-4 text-emerald-600" />
                    <span>{"Custom Order ID, Gateway TrxID & Reconciliation Prefixes"}</span>
                  </h3>
                  <p className="text-[11px] text-neutral-500 mt-0.5">
                    {"Customize your brand prefixes for Order IDs, Live Gateway Transaction IDs, and Order Payment Reconciliation. Leave empty to use defaults."}
                  </p>
                </div>
                <span className="text-[10px] font-mono font-bold px-2.5 py-1 rounded-full bg-emerald-50 text-emerald-700 border border-emerald-200">
                  Preview: {(orderSymbol ?? "#")}{orderIdPrefix.trim().toUpperCase() || "BD"}-849201
                </span>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                <div>
                  <label className="block text-xs font-bold text-neutral-700 mb-1">
                    {"Order Display Symbol (Pretext)"}
                  </label>
                  <input
                    type="text"
                    maxLength={4}
                    value={orderSymbol}
                    onChange={(e) => setOrderSymbol(e.target.value)}
                    placeholder="#"
                    className="w-full px-3.5 py-2 rounded-xl bg-white border border-neutral-300 text-xs font-mono font-bold text-neutral-900 focus:border-emerald-500"
                  />
                  <span className="text-[10px] text-neutral-400 mt-1 block">
                    {"Default: # (shown before Order ID across tables & invoices)"}
                  </span>
                </div>

                <div>
                  <label className="block text-xs font-bold text-neutral-700 mb-1">
                    {"Order ID Prefix (Default: BD)"}
                  </label>
                  <input
                    type="text"
                    maxLength={12}
                    value={orderIdPrefix}
                    onChange={(e) => setOrderIdPrefix(e.target.value.replace(/[^A-Za-z0-9_-]/g, "").toUpperCase())}
                    placeholder="BD"
                    className="w-full px-3.5 py-2 rounded-xl bg-white border border-neutral-300 text-xs font-mono font-bold text-neutral-900 focus:border-emerald-500"
                  />
                  <span className="text-[10px] text-neutral-400 mt-1 block">
                    {"Preview: "}<code>{orderIdPrefix || "BD"}-849201</code>
                  </span>
                </div>

                <div>
                  <label className="block text-xs font-bold text-neutral-700 mb-1">
                    {"Gateway Transaction ID Prefix (Default: AMAR)"}
                  </label>
                  <input
                    type="text"
                    maxLength={10}
                    value={transactionIdPrefix}
                    onChange={(e) => setTransactionIdPrefix(e.target.value.replace(/[^A-Za-z0-9_-]/g, "").toUpperCase())}
                    placeholder="AMAR"
                    className="w-full px-3.5 py-2 rounded-xl bg-white border border-neutral-300 text-xs font-mono font-bold text-neutral-900 focus:border-emerald-500"
                  />
                  <span className="text-[10px] text-neutral-400 mt-1 block">
                    {"Preview: "}<code>{transactionIdPrefix || "AMAR"}_{orderIdPrefix || "BD"}_849201_...</code>
                  </span>
                </div>

                <div>
                  <label className="block text-xs font-bold text-neutral-700 mb-1">
                    {"Reconciliation Order ID Pretext (Optional)"}
                  </label>
                  <input
                    type="text"
                    maxLength={10}
                    value={reconciliationOrderPrefix}
                    onChange={(e) => setReconciliationOrderPrefix(e.target.value.replace(/[^A-Za-z0-9_-]/g, "").toUpperCase())}
                    placeholder="e.g. ORD (or leave blank)"
                    className="w-full px-3.5 py-2 rounded-xl bg-white border border-neutral-300 text-xs font-mono font-bold text-neutral-900 focus:border-emerald-500"
                  />
                  <span className="text-[10px] text-neutral-400 mt-1 block">
                    {"Preview: "}<code>{reconciliationOrderPrefix ? `${reconciliationOrderPrefix}-` : ""}{(orderSymbol ?? "#")}{orderIdPrefix || "BD"}-849201</code>
                  </span>
                </div>

                <div>
                  <label className="block text-xs font-bold text-neutral-700 mb-1">
                    {"Reconciliation TrxID Pretext (Optional)"}
                  </label>
                  <input
                    type="text"
                    maxLength={10}
                    value={reconciliationTrxPrefix}
                    onChange={(e) => setReconciliationTrxPrefix(e.target.value.replace(/[^A-Za-z0-9_-]/g, "").toUpperCase())}
                    placeholder="e.g. REC (or leave blank)"
                    className="w-full px-3.5 py-2 rounded-xl bg-white border border-neutral-300 text-xs font-mono font-bold text-neutral-900 focus:border-emerald-500"
                  />
                  <span className="text-[10px] text-neutral-400 mt-1 block">
                    {"Preview: "}<code>{reconciliationTrxPrefix ? `${reconciliationTrxPrefix}-` : ""}TRX9A8B7C</code>
                  </span>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* TAB 2: TOP HEADER BAR SETTINGS (Top Header Bar Configuration) */}
        {activeSettingsTab === "topHeader" && (
          <div className="space-y-6 animate-in fade-in duration-200">
            <div>
              <h2 className="text-base font-bold text-neutral-900 flex items-center gap-2">
                <Layers className="w-4 h-4 text-emerald-600" />
                <span>{"Top Trust & Notice Bar Customization"}</span>
              </h2>
              <p className="text-xs text-neutral-400 mt-1">
                {"Customize the top notification bar, hotline, and parcel inspection badge for Storefront and Product Landing Page."}
              </p>
            </div>

            {/* LIVE PREVIEW OF TOP HEADER BAR (Matches Screenshot 4) */}
            <div className="space-y-2">
              <span className="text-[11px] font-bold text-neutral-500 uppercase tracking-wider block">
                {"Live Visual Preview (Top Header Preview):"}
              </span>
              <div className="bg-gradient-to-r from-emerald-950 via-emerald-900 to-emerald-950 text-emerald-100 text-xs py-2.5 px-4 rounded-2xl flex items-center justify-between gap-3 shadow-md overflow-x-auto border border-emerald-800/80">
                <div className="flex items-center gap-3 truncate">
                  <span className="flex items-center gap-1.5 text-amber-400 font-medium truncate">
                    <Truck className="w-3.5 h-3.5 shrink-0" />
                    <span>{topAnnouncementText}</span>
                  </span>
                  <span className="text-emerald-800">|</span>
                  <span className="flex items-center gap-1 text-emerald-200 truncate">
                    <ShieldCheck className="w-3.5 h-3.5 text-emerald-400 shrink-0" />
                    <span>{topInspectionText}</span>
                  </span>
                </div>
                <div className="flex items-center gap-3 shrink-0">
                  <span className="flex items-center gap-1.5 text-amber-300 font-semibold">
                    <PhoneCall className="w-3.5 h-3.5 shrink-0" />
                    <span>{topHotline}</span>
                  </span>
                  <span className="text-xs px-2.5 py-1 rounded-lg bg-emerald-800/80 text-emerald-200 font-medium flex items-center gap-1">
                    <MapPin className="w-3 h-3 text-emerald-400" />
                    <span>{topTrackText}</span>
                  </span>
                </div>
              </div>
            </div>

            {/* PART A: STOREFRONT TOP HEADER */}
            <div className="p-5 rounded-2xl bg-neutral-50 border border-neutral-200 space-y-4">
              <h3 className="text-xs font-bold uppercase tracking-wider text-neutral-700 flex items-center gap-2">
                <Truck className="w-4 h-4 text-emerald-600" />
                <span>{"A. Storefront Top Header"}</span>
              </h3>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-bold text-neutral-700 mb-1">
                    {"Left Announcement Text"}
                  </label>
                  <input
                    type="text"
                    value={topAnnouncementText}
                    onChange={(e) => {
                      isDirtyRef.current = true;
                      setTopAnnouncementText(e.target.value);
                    }}
                    placeholder="Inspect parcel upon delivery before payment"
                    className="w-full px-3.5 py-2.5 rounded-xl bg-white border border-neutral-300 text-xs font-medium text-neutral-900 focus:border-emerald-500"
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold text-neutral-700 mb-1">
                    {"Inspection Badge Text"}
                  </label>
                  <input
                    type="text"
                    value={topInspectionText}
                    onChange={(e) => {
                      isDirtyRef.current = true;
                      setTopInspectionText(e.target.value);
                    }}
                    placeholder="Inspect parcel before payment"
                    className="w-full px-3.5 py-2.5 rounded-xl bg-white border border-neutral-300 text-xs font-medium text-neutral-900 focus:border-emerald-500"
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold text-neutral-700 mb-1">
                    {"Top Hotline Number"}
                  </label>
                  <input
                    type="text"
                    value={topHotline}
                    onChange={(e) => {
                      isDirtyRef.current = true;
                      setTopHotline(e.target.value);
                    }}
                    placeholder="09612345678"
                    className="w-full px-3.5 py-2.5 rounded-xl bg-white border border-neutral-300 text-xs font-mono font-bold text-neutral-900 focus:border-emerald-500"
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold text-neutral-700 mb-1">
                    {"Track Order Button Text"}
                  </label>
                  <input
                    type="text"
                    value={topTrackText}
                    onChange={(e) => {
                      isDirtyRef.current = true;
                      setTopTrackText(e.target.value);
                    }}
                    placeholder="Track Order"
                    className="w-full px-3.5 py-2.5 rounded-xl bg-white border border-neutral-300 text-xs font-medium text-neutral-900 focus:border-emerald-500"
                  />
                </div>
              </div>

              {/* Toggles */}
              <div className="flex flex-wrap items-center gap-6 pt-3 border-t border-neutral-200">
                <label className="flex items-center gap-2 cursor-pointer text-xs font-bold text-neutral-700">
                  <input
                    type="checkbox"
                    checked={showTopAnnouncement}
                    onChange={(e) => {
                      isDirtyRef.current = true;
                      setShowTopAnnouncement(e.target.checked);
                    }}
                    className="w-4 h-4 text-emerald-600 rounded"
                  />
                  <span>{"Show Notice Bar"}</span>
                </label>

                <label className="flex items-center gap-2 cursor-pointer text-xs font-bold text-neutral-700">
                  <input
                    type="checkbox"
                    checked={showTopHotline}
                    onChange={(e) => {
                      isDirtyRef.current = true;
                      setShowTopHotline(e.target.checked);
                    }}
                    className="w-4 h-4 text-emerald-600 rounded"
                  />
                  <span>{"Show Hotline"}</span>
                </label>

                <label className="flex items-center gap-2 cursor-pointer text-xs font-bold text-neutral-700">
                  <input
                    type="checkbox"
                    checked={showTopTrackOrder}
                    onChange={(e) => {
                      isDirtyRef.current = true;
                      setShowTopTrackOrder(e.target.checked);
                    }}
                    className="w-4 h-4 text-emerald-600 rounded"
                  />
                  <span>{"Show Track Button"}</span>
                </label>
              </div>
            </div>

            {/* PART B: DEDICATED PRODUCT & CAMPAIGN PAGE TOP HEADER */}
            <div className="p-5 rounded-2xl bg-emerald-50/50 border border-emerald-200/80 space-y-4">
              <div className="flex items-center justify-between">
                <h3 className="text-xs font-bold uppercase tracking-wider text-emerald-900 flex items-center gap-2">
                  <Sparkles className="w-4 h-4 text-emerald-600" />
                  <span>{"B. Product & Campaign Page Top Header"}</span>
                </h3>

                <label className="flex items-center gap-2 cursor-pointer text-xs font-bold text-emerald-800">
                  <input
                    type="checkbox"
                    checked={useCustomProductTopHeader}
                    onChange={(e) => {
                      isDirtyRef.current = true;
                      setUseCustomProductTopHeader(e.target.checked);
                    }}
                    className="w-4 h-4 text-emerald-600 rounded"
                  />
                  <span>{"Customize separately"}</span>
                </label>
              </div>

              {useCustomProductTopHeader ? (
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 animate-in fade-in duration-200">
                  <div>
                    <label className="block text-xs font-bold text-neutral-700 mb-1">
                      {"Product Notice Text"}
                    </label>
                    <input
                      type="text"
                      value={productAnnouncementText}
                      onChange={(e) => {
                        isDirtyRef.current = true;
                        setProductAnnouncementText(e.target.value);
                      }}
                      placeholder="Inspect parcel upon delivery before payment"
                      className="w-full px-3.5 py-2.5 rounded-xl bg-white border border-neutral-300 text-xs font-medium text-neutral-900"
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-bold text-neutral-700 mb-1">
                      {"Inspection Badge"}
                    </label>
                    <input
                      type="text"
                      value={productInspectionText}
                      onChange={(e) => {
                        isDirtyRef.current = true;
                        setProductInspectionText(e.target.value);
                      }}
                      placeholder="Inspect parcel before payment"
                      className="w-full px-3.5 py-2.5 rounded-xl bg-white border border-neutral-300 text-xs font-medium text-neutral-900"
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-bold text-neutral-700 mb-1">
                      {"Product Page Hotline"}
                    </label>
                    <input
                      type="text"
                      value={productHotline}
                      onChange={(e) => {
                        isDirtyRef.current = true;
                        setProductHotline(e.target.value);
                      }}
                      placeholder="09612345678"
                      className="w-full px-3.5 py-2.5 rounded-xl bg-white border border-neutral-300 text-xs font-mono font-bold text-neutral-900"
                    />
                  </div>
                </div>
              ) : (
                <p className="text-xs text-neutral-500">
                  {"Currently using the same common Storefront Top Header settings for all product pages."}
                </p>
              )}
            </div>
          </div>
        )}

        {/* TAB 3: MAIN NAVIGATION HEADER & LOGO (Main Header & Navigation) */}
        {activeSettingsTab === "mainHeader" && (
          <div className="space-y-6 animate-in fade-in duration-200">
            <div>
              <h2 className="text-base font-bold text-neutral-900 flex items-center gap-2">
                <Layout className="w-4 h-4 text-emerald-600" />
                <span>{"Main Navigation Header & Logo"}</span>
              </h2>
              <p className="text-xs text-neutral-400 mt-1">
                {"Configure the primary header logo for white/light navbar background and customize the search bar."}
              </p>
            </div>

            {/* LIVE PREVIEW OF MAIN HEADER NAVBAR (Matches Screenshot 5) */}
            <div className="space-y-2">
              <span className="text-[11px] font-bold text-neutral-500 uppercase tracking-wider block">
                {"Live Header Preview (Main Header Appearance):"}
              </span>
              <div className="bg-white rounded-2xl p-4 border border-neutral-200 shadow-sm flex items-center justify-between gap-4">
                {/* Logo */}
                <div className="flex items-center gap-2">
                  {(headerLogoUrl || logoUrl) ? (
                    <img
                      src={headerLogoUrl || logoUrl}
                      alt={headerLogoText || shopName}
                      className="h-10 w-auto object-contain"
                    />
                  ) : (
                    <span className="text-xl font-black tracking-tight text-neutral-900">
                      {headerLogoText || shopName || "AmarDokan"}
                    </span>
                  )}
                </div>

                {/* Search Bar Mockup */}
                {showSearchBar && (
                  <div className="flex-1 max-w-md hidden md:block">
                    <div className="relative">
                      <Search className="w-4 h-4 absolute left-3.5 top-1/2 -translate-y-1/2 text-neutral-400" />
                      <input
                        type="text"
                        disabled
                        value=""
                        placeholder={searchPlaceholder}
                        className="w-full pl-10 pr-4 py-2 bg-neutral-100 text-xs rounded-xl border border-transparent text-neutral-500 cursor-default"
                      />
                    </div>
                  </div>
                )}

                {/* Bag & Account Buttons Mockup */}
                <div className="flex items-center gap-2">
                  <div className="px-3 py-1.5 rounded-xl bg-neutral-100 border border-neutral-200 text-neutral-700 text-xs font-bold flex items-center gap-1.5">
                    <ShoppingBag className="w-4 h-4 text-emerald-600" />
                    <span>Bag</span>
                  </div>
                  <div className="px-3 py-1.5 rounded-xl bg-neutral-100 border border-neutral-200 text-neutral-700 text-xs font-bold flex items-center gap-1.5">
                    <Store className="w-4 h-4 text-neutral-600" />
                    <span>My Account</span>
                  </div>
                </div>
              </div>
            </div>

            {/* Header Logo Upload & Configuration */}
            <div className="p-5 rounded-2xl bg-neutral-50 border border-neutral-200 space-y-4">
              <div className="flex items-center justify-between gap-2">
                <h3 className="text-xs font-bold uppercase tracking-wider text-neutral-700 flex items-center gap-2">
                  <ImageIcon className="w-4 h-4 text-emerald-600" />
                  <span>{"Header Specific Logo (For White Background)"}</span>
                </h3>
                {headerLogoUrl && (
                  <button
                    type="button"
                    disabled={removingAsset === "headerLogoUrl"}
                    onClick={() => handleRemoveBrandAsset("headerLogoUrl", headerLogoUrl, setHeaderLogoUrl)}
                    className="px-2.5 py-1 rounded-lg bg-rose-50 hover:bg-rose-100 text-rose-600 border border-rose-200 text-[11px] font-bold flex items-center gap-1 cursor-pointer transition-colors disabled:opacity-50"
                    title="Remove Header Logo from Cloudinary/Server & Storefront"
                  >
                    {removingAsset === "headerLogoUrl" ? (
                      <Loader2 className="w-3 h-3 animate-spin" />
                    ) : (
                      <Trash2 className="w-3 h-3" />
                    )}
                    <span>Remove Image</span>
                  </button>
                )}
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-6 items-start">
                <div className="space-y-3">
                  <div>
                    <label className="block text-xs font-bold text-neutral-700 mb-1.5">
                      {"Header Logo Image URL or File Upload:"}
                    </label>
                    <div className="flex gap-2">
                      <input
                        type="text"
                        value={headerLogoUrl}
                        onChange={(e) => setHeaderLogoUrl(e.target.value)}
                        placeholder="https://.../header-logo.png (Leave empty for text logo)"
                        className="flex-1 px-3.5 py-2.5 rounded-xl bg-white border border-neutral-300 text-xs font-mono text-neutral-900"
                      />
                      <label className="px-4 py-2.5 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-xs font-bold cursor-pointer flex items-center gap-1.5 transition-colors shrink-0">
                        {uploadingAsset === "headerLogoUrl" ? (
                          <Loader2 className="w-3.5 h-3.5 animate-spin" />
                        ) : (
                          <Upload className="w-3.5 h-3.5" />
                        )}
                        <span>{uploadingAsset === "headerLogoUrl" ? "Uploading..." : "Upload"}</span>
                        <input
                          type="file"
                          accept="image/*"
                          className="hidden"
                          disabled={uploadingAsset === "headerLogoUrl"}
                          onChange={(e) => handleFileUpload(e, "headerLogoUrl", setHeaderLogoUrl)}
                        />
                      </label>
                      <button
                        type="button"
                        onClick={() => setMediaPickerField("headerLogoUrl")}
                        className="px-3 py-2.5 bg-emerald-50 hover:bg-emerald-100 border border-emerald-200 rounded-xl text-xs font-bold text-emerald-800 flex items-center gap-1 cursor-pointer shrink-0"
                        title="Select from Media Library"
                      >
                        <ImageIcon className="w-3.5 h-3.5" />
                        <span>Media</span>
                      </button>
                    </div>
                    <span className="text-[11px] text-neutral-400 block mt-1">
                      {"Recommended: PNG or SVG with transparent background (Height: 40-50px)."}
                    </span>
                  </div>

                  <div>
                    <label className="block text-xs font-bold text-neutral-700 mb-1.5">
                      {"Header Text Logo (Displayed when no logo image is set):"}
                    </label>
                    <input
                      type="text"
                      value={headerLogoText}
                      onChange={(e) => setHeaderLogoText(e.target.value)}
                      placeholder={shopName || "Enter header brand name text..."}
                      className="w-full px-3.5 py-2.5 rounded-xl bg-white border border-neutral-300 text-xs font-bold text-neutral-900 focus:border-emerald-500"
                    />
                    <span className="text-[11px] text-neutral-400 block mt-1">
                      {"If left blank, your Global Shop Name will automatically appear as the header logo."}
                    </span>
                  </div>
                </div>

                <div className="p-4 bg-white rounded-2xl border border-neutral-200 flex flex-col items-center justify-center min-h-[120px]">
                  <span className="text-[10px] text-neutral-400 font-bold uppercase mb-2">
                    Header Logo Live Preview:
                  </span>
                  {(headerLogoUrl || logoUrl) ? (
                    <img
                      src={headerLogoUrl || logoUrl}
                      alt="Header Logo Preview"
                      className="max-h-11 w-auto object-contain"
                    />
                  ) : (
                    <div className="flex flex-col items-center gap-1">
                      <span className="text-xl font-black tracking-tight text-neutral-900">
                        {headerLogoText || shopName || "AmarDokan"}
                      </span>
                      <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-emerald-50 text-emerald-700 border border-emerald-200">
                        Text Logo Mode
                      </span>
                    </div>
                  )}
                </div>
              </div>
            </div>

            {/* Search Bar Settings */}
            <div className="p-5 rounded-2xl bg-neutral-50 border border-neutral-200 space-y-4">
              <div className="flex items-center justify-between">
                <h3 className="text-xs font-bold uppercase tracking-wider text-neutral-700 flex items-center gap-2">
                  <Search className="w-4 h-4 text-emerald-600" />
                  <span>{"Search Bar Configuration"}</span>
                </h3>

                <label className="flex items-center gap-2 cursor-pointer text-xs font-bold text-neutral-700">
                  <input
                    type="checkbox"
                    checked={showSearchBar}
                    onChange={(e) => setShowSearchBar(e.target.checked)}
                    className="w-4 h-4 text-emerald-600 rounded"
                  />
                  <span>{"Show Search Bar"}</span>
                </label>
              </div>

              <div>
                <label className="block text-xs font-bold text-neutral-700 mb-1">
                  {"Search Input Placeholder"}
                </label>
                <input
                  type="text"
                  value={searchPlaceholder}
                  onChange={(e) => {
                    isDirtyRef.current = true;
                    setSearchPlaceholder(e.target.value);
                  }}
                  placeholder="Search product or model (e.g. smartwatch, earbuds)..."
                  className="w-full px-3.5 py-2.5 rounded-xl bg-white border border-neutral-300 text-xs font-medium text-neutral-900"
                />
              </div>
            </div>
          </div>
        )}

        {/* TAB 4: FOOTER & DARK THEME BRANDING (Footer & Dark Theme Branding) */}
        {activeSettingsTab === "footer" && (
          <div className="space-y-6 animate-in fade-in duration-200">
            <div>
              <h2 className="text-base font-bold text-neutral-900 flex items-center gap-2">
                <Palette className="w-4 h-4 text-emerald-600" />
                <span>{"Footer & Dark Theme Branding"}</span>
              </h2>
              <p className="text-xs text-neutral-400 mt-1">
                {"Configure custom footer logo for dark background, delivery notices, customer service hours, and copyright."}
              </p>
            </div>

            {/* LIVE PREVIEW OF DARK FOOTER */}
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <span className="text-[11px] font-bold text-neutral-500 uppercase tracking-wider block">
                  {"Footer Visual Preview (Dark Footer Appearance):"}
                </span>
                <span className="text-[11px] font-semibold text-emerald-600 bg-emerald-50 px-2 py-0.5 rounded-md border border-emerald-200">
                  {`Payment Layout: ${footerPaymentColumns} Columns`}
                </span>
              </div>
              <div className="bg-neutral-950 text-neutral-300 rounded-2xl p-6 border border-neutral-800 shadow-xl space-y-4">
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6 items-start">
                  <div>
                    {(footerLogoUrl || logoUrl) ? (
                      <img
                        src={footerLogoUrl || logoUrl}
                        alt="Footer Logo Preview"
                        className="max-h-10 w-auto object-contain mb-2"
                      />
                    ) : (
                      <div className="text-xl font-black tracking-tight text-white mb-2">
                        {shopName || "AmarDokan"}
                      </div>
                    )}
                    <p className="text-[11px] text-neutral-400 leading-relaxed">
                      {footerNotice}
                    </p>
                  </div>

                  <div className="space-y-1 text-xs">
                    <h4 className="text-white font-bold">{"Logistics Partners"}</h4>
                    {footerCourier1 && <p className="text-neutral-400 text-[11px]">• {footerCourier1}</p>}
                    {footerCourier2 && <p className="text-neutral-400 text-[11px]">• {footerCourier2}</p>}
                    {footerCourier3 && <p className="text-neutral-400 text-[11px]">• {footerCourier3}</p>}
                  </div>

                  <div className="space-y-1 text-xs">
                    <h4 className="text-white font-bold">{"Customer Service"}</h4>
                    <p className="text-neutral-400 text-[11px] flex items-center gap-1.5">
                      <PhoneCall className="w-3.5 h-3.5 shrink-0" />
                      <span>{footerHotline || topHotline}</span>
                    </p>
                    <p className="text-neutral-400 text-[11px]">{footerWorkingHours}</p>
                    <p className="text-neutral-400 text-[11px] flex items-center gap-1.5">
                      <Mail className="w-3 h-3 shrink-0" />
                      <span>{footerEmail || supportEmail}</span>
                    </p>
                  </div>

                  <div className="space-y-1 text-xs">
                    <h4 className="text-white font-bold flex items-center justify-between">
                      <span>{"Payment Methods"}</span>
                      <span className="text-[10px] text-emerald-400 font-normal">({footerPaymentColumns} {"Cols"})</span>
                    </h4>
                    <div className={`grid ${Number(footerPaymentColumns) === 2 ? "grid-cols-2" :
                        Number(footerPaymentColumns) === 3 ? "grid-cols-3" :
                          "grid-cols-4"
                      } gap-1.5 pt-1`}>
                      <div className="bg-white rounded px-1.5 py-0.5 border border-neutral-700 flex items-center justify-center h-6">
                        <img src={codImg} alt="COD" className="h-4 w-auto object-contain" />
                      </div>
                      <div className="bg-white rounded px-1.5 py-0.5 border border-neutral-700 flex items-center justify-center h-6">
                        <img src={bkashImg} alt="bKash" className="h-4 w-auto object-contain" />
                      </div>
                      <div className="bg-white rounded px-1.5 py-0.5 border border-neutral-700 flex items-center justify-center h-6">
                        <img src={nagadImg} alt="Nagad" className="h-4 w-auto object-contain" />
                      </div>
                      <div className="bg-white rounded px-1.5 py-0.5 border border-neutral-700 flex items-center justify-center h-6">
                        <img src={rocketImg} alt="Rocket" className="h-4 w-auto object-contain" />
                      </div>
                    </div>
                  </div>
                </div>

                <div className="pt-3 border-t border-neutral-800 text-center text-[10px] text-neutral-500">
                  {footerCopyrightText || `© ${new Date().getFullYear()} ${shopName}. All rights reserved.`} | Powered by{" "}
                  <a
                    href="https://theskzlab.com/"
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-neutral-300 hover:text-emerald-400 font-medium underline underline-offset-2 decoration-neutral-600"
                  >
                    SKzLAB
                  </a>
                </div>
              </div>
            </div>

            {/* Footer Specific Logo Upload */}
            <div className="p-5 rounded-2xl bg-neutral-50 border border-neutral-200 space-y-4">
              <div className="flex items-center justify-between gap-2">
                <h3 className="text-xs font-bold uppercase tracking-wider text-neutral-700 flex items-center gap-2">
                  <ImageIcon className="w-4 h-4 text-emerald-600" />
                  <span>{"Footer Specific Logo (For Dark Background)"}</span>
                </h3>
                {footerLogoUrl && (
                  <button
                    type="button"
                    disabled={removingAsset === "footerLogoUrl"}
                    onClick={() => handleRemoveBrandAsset("footerLogoUrl", footerLogoUrl, setFooterLogoUrl)}
                    className="px-2.5 py-1 rounded-lg bg-rose-50 hover:bg-rose-100 text-rose-600 border border-rose-200 text-[11px] font-bold flex items-center gap-1 cursor-pointer transition-colors disabled:opacity-50"
                    title="Remove Footer Logo from Cloudinary/Server & Storefront"
                  >
                    {removingAsset === "footerLogoUrl" ? (
                      <Loader2 className="w-3 h-3 animate-spin" />
                    ) : (
                      <Trash2 className="w-3 h-3" />
                    )}
                    <span>Remove</span>
                  </button>
                )}
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-6 items-center">
                <div className="space-y-3">
                  <label className="block text-xs font-bold text-neutral-700">
                    {"Footer White/Light Logo URL or Upload:"}
                  </label>
                  <div className="flex gap-2">
                    <input
                      type="text"
                      value={footerLogoUrl}
                      onChange={(e) => setFooterLogoUrl(e.target.value)}
                      placeholder="https://.../footer-white-logo.png (Leave empty to use Shop Name)"
                      className="flex-1 px-3.5 py-2.5 rounded-xl bg-white border border-neutral-300 text-xs font-mono text-neutral-900"
                    />
                    <label className="px-4 py-2.5 bg-neutral-900 hover:bg-neutral-800 text-white rounded-xl text-xs font-bold cursor-pointer flex items-center gap-1.5 transition-colors shrink-0">
                      {uploadingAsset === "footerLogoUrl" ? (
                        <Loader2 className="w-3.5 h-3.5 animate-spin" />
                      ) : (
                        <Upload className="w-3.5 h-3.5" />
                      )}
                      <span>{uploadingAsset === "footerLogoUrl" ? "Uploading..." : "Upload"}</span>
                      <input
                        type="file"
                        accept="image/*"
                        className="hidden"
                        disabled={uploadingAsset === "footerLogoUrl"}
                        onChange={(e) => handleFileUpload(e, "footerLogoUrl", setFooterLogoUrl)}
                      />
                    </label>
                    <button
                      type="button"
                      onClick={() => setMediaPickerField("footerLogoUrl")}
                      className="px-3 py-2.5 bg-emerald-50 hover:bg-emerald-100 border border-emerald-200 rounded-xl text-xs font-bold text-emerald-800 flex items-center gap-1 cursor-pointer shrink-0"
                      title="Select from Media Library"
                    >
                      <ImageIcon className="w-3.5 h-3.5" />
                      <span>Media</span>
                    </button>
                  </div>
                  <span className="text-[11px] text-neutral-400 block">
                    {"Recommended: White or bright PNG logo that stands out cleanly against dark footer background."}
                  </span>
                </div>

                <div className="p-4 bg-neutral-950 rounded-2xl border border-neutral-800 flex flex-col items-center justify-center min-h-[90px]">
                  <span className="text-[10px] text-neutral-500 font-bold uppercase mb-2">
                    Footer Logo Live Preview (Dark):
                  </span>
                  {(footerLogoUrl || logoUrl) ? (
                    <img
                      src={footerLogoUrl || logoUrl}
                      alt="Footer Logo Preview"
                      className="max-h-11 w-auto object-contain"
                    />
                  ) : (
                    <span className="text-xl font-black tracking-tight text-white">
                      {shopName || "AmarDokan"}
                    </span>
                  )}
                </div>
              </div>
            </div>

            {/* Delivery Notice & Slogan */}
            <div>
              <label className="block text-xs font-bold text-neutral-700 mb-1">
                {"Footer Delivery Notice"}
              </label>
              <textarea
                rows={2}
                value={footerNotice}
                onChange={(e) => {
                  isDirtyRef.current = true;
                  setFooterNotice(e.target.value);
                }}
                placeholder="Fastest nationwide delivery with secure cash on delivery across Bangladesh."
                className="w-full px-3.5 py-2.5 rounded-xl bg-neutral-50 border border-neutral-300 text-xs font-medium text-neutral-900 focus:bg-white focus:border-emerald-500"
              />
            </div>

            {/* Customer Service Working Hours, Hotline & Support Email */}
            <div className="p-5 rounded-2xl bg-neutral-50 border border-neutral-200 space-y-4">
              <h3 className="text-xs font-bold uppercase tracking-wider text-neutral-700 flex items-center gap-2">
                <PhoneCall className="w-4 h-4 text-emerald-600" />
                <span>{"Customer Service & Support Details"}</span>
              </h3>

              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                <div>
                  <label className="block text-xs font-bold text-neutral-700 mb-1">
                    {"Customer Service Hours"}
                  </label>
                  <input
                    type="text"
                    value={footerWorkingHours}
                    onChange={(e) => {
                      isDirtyRef.current = true;
                      setFooterWorkingHours(e.target.value);
                    }}
                    placeholder="Hours: 9:00 AM - 11:00 PM"
                    className="w-full px-3.5 py-2.5 rounded-xl bg-white border border-neutral-300 text-xs font-medium text-neutral-900 focus:border-emerald-500"
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold text-neutral-700 mb-1">
                    {"Footer Hotline"}
                  </label>
                  <input
                    type="text"
                    value={footerHotline}
                    onChange={(e) => setFooterHotline(e.target.value)}
                    placeholder="09612345678"
                    className="w-full px-3.5 py-2.5 rounded-xl bg-white border border-neutral-300 text-xs font-mono font-bold text-neutral-900 focus:border-emerald-500"
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold text-neutral-700 mb-1 flex items-center gap-1.5">
                    <Mail className="w-3.5 h-3.5 text-emerald-600" />
                    <span>{"Footer Support Email"}</span>
                  </label>
                  <input
                    type="email"
                    value={footerEmail}
                    onChange={(e) => setFooterEmail(e.target.value)}
                    placeholder="support@amardokan.com"
                    className="w-full px-3.5 py-2.5 rounded-xl bg-white border border-neutral-300 text-xs font-medium text-neutral-900 focus:border-emerald-500"
                  />
                </div>
              </div>
            </div>

            {/* Courier & Logistics Partners */}
            <div className="p-5 rounded-2xl bg-neutral-50 border border-neutral-200 space-y-4">
              <h3 className="text-xs font-bold uppercase tracking-wider text-neutral-700 flex items-center gap-2">
                <Truck className="w-4 h-4 text-emerald-600" />
                <span>{"Logistics & Delivery Partners"}</span>
              </h3>

              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                <div>
                  <label className="block text-xs font-bold text-neutral-700 mb-1">
                    {"Courier Partner 1"}
                  </label>
                  <input
                    type="text"
                    value={footerCourier1}
                    onChange={(e) => setFooterCourier1(e.target.value)}
                    placeholder="Pathao Courier Express"
                    className="w-full px-3.5 py-2.5 rounded-xl bg-white border border-neutral-300 text-xs font-medium text-neutral-900 focus:border-emerald-500"
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold text-neutral-700 mb-1">
                    {"Courier Partner 2"}
                  </label>
                  <input
                    type="text"
                    value={footerCourier2}
                    onChange={(e) => setFooterCourier2(e.target.value)}
                    placeholder="Steadfast Courier Service"
                    className="w-full px-3.5 py-2.5 rounded-xl bg-white border border-neutral-300 text-xs font-medium text-neutral-900 focus:border-emerald-500"
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold text-neutral-700 mb-1">
                    {"Courier Partner 3"}
                  </label>
                  <input
                    type="text"
                    value={footerCourier3}
                    onChange={(e) => setFooterCourier3(e.target.value)}
                    placeholder="RedX Logistics"
                    className="w-full px-3.5 py-2.5 rounded-xl bg-white border border-neutral-300 text-xs font-medium text-neutral-900 focus:border-emerald-500"
                  />
                </div>
              </div>
            </div>

            {/* Payment Methods Layout Grid Selection */}
            <div className="p-5 rounded-2xl bg-neutral-50 border border-neutral-200 space-y-4">
              <div className="flex flex-wrap items-center justify-between gap-3">
                <div>
                  <h3 className="text-xs font-bold uppercase tracking-wider text-neutral-700 flex items-center gap-2">
                    <Layout className="w-4 h-4 text-emerald-600" />
                    <span>{"Payment Methods Column Layout"}</span>
                  </h3>
                  <p className="text-[11px] text-neutral-500 mt-0.5">
                    {"Footer automatically displays active gateways from Payments & Gateways. Choose visibility & columns (2, 3, or 4)."}
                  </p>
                </div>
                <div className="flex items-center gap-3">
                  <label className="inline-flex items-center gap-2 px-3 py-1.5 rounded-xl bg-white border border-neutral-200 text-xs font-bold text-neutral-700 cursor-pointer select-none">
                    <input
                      type="checkbox"
                      checked={footerShowPayments}
                      onChange={(e) => {
                        markDirty();
                        setFooterShowPayments(e.target.checked);
                      }}
                      className="w-4 h-4 accent-emerald-600 rounded"
                    />
                    <span>Show Payment Badges</span>
                  </label>
                  <span className="text-xs font-extrabold px-3 py-1 rounded-full bg-emerald-100 text-emerald-800">
                    {footerPaymentColumns} {"Columns Selected"}
                  </span>
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3.5">
                {/* Option 2 Columns */}
                <button
                  type="button"
                  onClick={() => setFooterPaymentColumns(2)}
                  className={`p-4 rounded-xl border text-left transition-all cursor-pointer flex flex-col justify-between ${Number(footerPaymentColumns) === 2
                      ? "border-emerald-600 bg-emerald-50/50 shadow-sm ring-1 ring-emerald-500"
                      : "border-neutral-200 bg-white hover:border-neutral-300"
                    }`}
                >
                  <div>
                    <div className="flex items-center justify-between mb-1.5">
                      <span className="text-xs font-black text-neutral-900">
                        {"2 Columns (Double)"}
                      </span>
                      {Number(footerPaymentColumns) === 2 && (
                        <Check className="w-4 h-4 text-emerald-600 shrink-0" />
                      )}
                    </div>
                    <p className="text-[11px] text-neutral-500 leading-snug">
                      {"2 items per row. Icons will arrange into 2 rows of 2."}
                    </p>
                  </div>
                  <div className="grid grid-cols-2 gap-1.5 mt-3 pt-2.5 border-t border-neutral-200/60">
                    <div className="h-6 bg-white border border-neutral-300 rounded flex items-center justify-center text-[10px] font-bold text-neutral-600">COD</div>
                    <div className="h-6 bg-white border border-neutral-300 rounded flex items-center justify-center text-[10px] font-bold text-neutral-600">bKash</div>
                    <div className="h-6 bg-white border border-neutral-300 rounded flex items-center justify-center text-[10px] font-bold text-neutral-600">Nagad</div>
                    <div className="h-6 bg-white border border-neutral-300 rounded flex items-center justify-center text-[10px] font-bold text-neutral-600">Rocket</div>
                  </div>
                </button>

                {/* Option 3 Columns */}
                <button
                  type="button"
                  onClick={() => setFooterPaymentColumns(3)}
                  className={`p-4 rounded-xl border text-left transition-all cursor-pointer flex flex-col justify-between ${Number(footerPaymentColumns) === 3
                      ? "border-emerald-600 bg-emerald-50/50 shadow-sm ring-1 ring-emerald-500"
                      : "border-neutral-200 bg-white hover:border-neutral-300"
                    }`}
                >
                  <div>
                    <div className="flex items-center justify-between mb-1.5">
                      <span className="text-xs font-black text-neutral-900">
                        {"3 Columns (Triple)"}
                      </span>
                      {Number(footerPaymentColumns) === 3 && (
                        <Check className="w-4 h-4 text-emerald-600 shrink-0" />
                      )}
                    </div>
                    <p className="text-[11px] text-neutral-500 leading-snug">
                      {"3 items in first row, remaining items flow to next row."}
                    </p>
                  </div>
                  <div className="grid grid-cols-3 gap-1 mt-3 pt-2.5 border-t border-neutral-200/60">
                    <div className="h-6 bg-white border border-neutral-300 rounded flex items-center justify-center text-[9px] font-bold text-neutral-600">COD</div>
                    <div className="h-6 bg-white border border-neutral-300 rounded flex items-center justify-center text-[9px] font-bold text-neutral-600">bKash</div>
                    <div className="h-6 bg-white border border-neutral-300 rounded flex items-center justify-center text-[9px] font-bold text-neutral-600">Nagad</div>
                    <div className="h-6 bg-white border border-neutral-300 rounded flex items-center justify-center text-[9px] font-bold text-neutral-600">Rocket</div>
                  </div>
                </button>

                {/* Option 4 Columns */}
                <button
                  type="button"
                  onClick={() => setFooterPaymentColumns(4)}
                  className={`p-4 rounded-xl border text-left transition-all cursor-pointer flex flex-col justify-between ${Number(footerPaymentColumns) === 4
                      ? "border-emerald-600 bg-emerald-50/50 shadow-sm ring-1 ring-emerald-500"
                      : "border-neutral-200 bg-white hover:border-neutral-300"
                    }`}
                >
                  <div>
                    <div className="flex items-center justify-between mb-1.5">
                      <span className="text-xs font-black text-neutral-900">
                        {"4 Columns (Quad / Default)"}
                      </span>
                      {Number(footerPaymentColumns) === 4 && (
                        <Check className="w-4 h-4 text-emerald-600 shrink-0" />
                      )}
                    </div>
                    <p className="text-[11px] text-neutral-500 leading-snug">
                      {"All 4 payment badges side-by-side in a single neat row."}
                    </p>
                  </div>
                  <div className="grid grid-cols-4 gap-1 mt-3 pt-2.5 border-t border-neutral-200/60">
                    <div className="h-6 bg-white border border-neutral-300 rounded flex items-center justify-center text-[8px] font-bold text-neutral-600">COD</div>
                    <div className="h-6 bg-white border border-neutral-300 rounded flex items-center justify-center text-[8px] font-bold text-neutral-600">bKash</div>
                    <div className="h-6 bg-white border border-neutral-300 rounded flex items-center justify-center text-[8px] font-bold text-neutral-600">Nagad</div>
                    <div className="h-6 bg-white border border-neutral-300 rounded flex items-center justify-center text-[8px] font-bold text-neutral-600">Rocket</div>
                  </div>
                </button>
              </div>
            </div>

            {/* Footer Copyright Text */}
            <div className="p-5 rounded-2xl bg-neutral-50 border border-neutral-200 space-y-3">
              <label className="block text-xs font-bold text-neutral-700 flex items-center gap-1.5">
                <ShieldCheck className="w-4 h-4 text-emerald-600" />
                <span>{"Footer Copyright Text"}</span>
              </label>
              <input
                type="text"
                value={footerCopyrightText}
                onChange={(e) => setFooterCopyrightText(e.target.value)}
                placeholder={`© ${new Date().getFullYear()} ${shopName}. All rights reserved.`}
                className="w-full px-3.5 py-2.5 rounded-xl bg-white border border-neutral-300 text-xs font-medium text-neutral-900 focus:border-emerald-500"
              />
              <span className="text-[11px] text-neutral-400 block">
                {"Leave blank to automatically use default copyright text with current year."}
              </span>
            </div>
          </div>
        )}

        {/* BOTTOM SAVE BAR */}
        <div className="flex items-center justify-between pt-5 border-t border-neutral-200 flex-wrap gap-3">
          <div>
            {saveSuccessMsg && (
              <div className="flex items-center gap-1.5 text-xs font-bold text-emerald-700 bg-emerald-50 px-3.5 py-2 rounded-xl border border-emerald-200 shadow-xs">
                <CheckCircle2 className="w-4 h-4 text-emerald-600" />
                <span>{saveSuccessMsg}</span>
              </div>
            )}
          </div>

          <button
            type="button"
            onClick={handleSaveAll}
            disabled={isSaving}
            className="px-6 py-3 bg-emerald-600 hover:bg-emerald-700 active:bg-emerald-800 text-white rounded-xl text-xs font-extrabold transition-all shadow-md shadow-emerald-600/30 flex items-center gap-2 cursor-pointer disabled:opacity-50"
          >
            {isSaving ? (
              <RefreshCw className="w-4 h-4 animate-spin" />
            ) : (
              <Save className="w-4 h-4" />
            )}
            <span>{"Save All Changes"}</span>
          </button>
        </div>
      </div>

      {/* SECTION 2: PROMOTIONAL COUPONS & DISCOUNTS MANAGEMENT */}
      <div className="bg-white rounded-3xl p-6 sm:p-8 border border-neutral-200 shadow-xs space-y-6">
        <div className="flex flex-wrap items-center justify-between gap-4 pb-2 border-b border-neutral-100">
          <div>
            <div className="flex items-center gap-2">
              <span className="p-2 rounded-xl bg-emerald-50 text-emerald-600">
                <Tag className="w-5 h-5" />
              </span>
              <h2 className="text-base font-bold text-neutral-900">
                {"Coupons & Promotional Discounts"}
              </h2>
              <span className="text-[10px] font-extrabold px-2.5 py-0.5 rounded-full bg-emerald-100 text-emerald-800">
                {couponsList.length} {"Active"}
              </span>
            </div>
            <p className="text-xs text-neutral-500 mt-1">
              {"Manage store discount coupons. Created coupons instantly validate in cart drawer and checkout."}
            </p>
          </div>

          <button
            type="button"
            onClick={handleOpenAddCoupon}
            className="px-4 py-2.5 bg-emerald-600 hover:bg-emerald-700 active:scale-95 text-white rounded-xl text-xs font-bold transition-all shadow-xs flex items-center gap-2 cursor-pointer"
          >
            <Plus className="w-4 h-4" />
            <span>{"Add New Coupon"}</span>
          </button>
        </div>

        {/* Feedback message banner */}
        {couponFeedbackMsg && (
          <div className="p-3.5 rounded-2xl bg-emerald-50 border border-emerald-200 text-emerald-900 text-xs font-bold flex items-center gap-2 animate-in fade-in">
            <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
            <span>{couponFeedbackMsg}</span>
          </div>
        )}

        {/* Coupons Cards Grid */}
        {loadingCoupons && couponsList.length === 0 ? (
          <div className="p-8 text-center text-xs text-neutral-400">
            <RefreshCw className="w-6 h-6 animate-spin mx-auto mb-2 text-emerald-600" />
            <span>{"Loading coupons..."}</span>
          </div>
        ) : couponsList.length === 0 ? (
          <div className="p-8 rounded-2xl bg-neutral-50 border border-dashed border-neutral-200 text-center space-y-2">
            <Tag className="w-8 h-8 text-neutral-300 mx-auto" />
            <p className="text-xs font-bold text-neutral-600">
              {"No coupons created yet."}
            </p>
            <button
              type="button"
              onClick={handleOpenAddCoupon}
              className="text-xs text-emerald-600 hover:underline font-bold"
            >
              {"Create your first coupon"}
            </button>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {couponsList.map((coupon) => {
              const isCopied = copiedCode === coupon.code;
              return (
                <div
                  key={coupon.code}
                  className={`p-4 rounded-2xl border transition-all relative ${coupon.isActive
                    ? "bg-white border-neutral-200 hover:border-emerald-400 shadow-2xs"
                    : "bg-neutral-50/70 border-neutral-200 opacity-60"
                    }`}
                >
                  <div className="flex items-start justify-between gap-3">
                    <div className="space-y-1">
                      <div className="flex items-center gap-2">
                        <span className="font-mono text-sm font-extrabold text-neutral-900 bg-neutral-100 px-2.5 py-1 rounded-lg border border-neutral-200">
                          {coupon.code}
                        </span>
                        <button
                          type="button"
                          onClick={() => handleCopyCoupon(coupon.code)}
                          className="p-1 rounded-md text-neutral-400 hover:text-neutral-700 hover:bg-neutral-100 transition-colors cursor-pointer"
                          title="Copy Code"
                        >
                          {isCopied ? (
                            <Check className="w-3.5 h-3.5 text-emerald-600" />
                          ) : (
                            <Copy className="w-3.5 h-3.5" />
                          )}
                        </button>
                      </div>

                      <div className="text-xs font-bold text-emerald-700 pt-1">
                        {coupon.discountType === "percentage"
                          ? `${coupon.value}% Off (Percentage)`
                          : `${formatBDT(coupon.value)} Off (Fixed)`}
                      </div>

                      <div className="text-[11px] text-neutral-500">
                        {Number(coupon.minSpend) > 0
                          ? `Min Order: ${formatBDT(coupon.minSpend)}`
                          : "No minimum spend"}
                      </div>
                    </div>

                    <div className="flex flex-col items-end gap-2">
                      <button
                        type="button"
                        onClick={() => handleToggleCouponActive(coupon)}
                        className={`text-[10px] font-extrabold px-2 py-0.5 rounded-full cursor-pointer transition-colors ${coupon.isActive
                          ? "bg-emerald-100 text-emerald-800"
                          : "bg-neutral-200 text-neutral-600"
                          }`}
                      >
                        {coupon.isActive ? "Active" : "Inactive"}
                      </button>

                      <div className="flex items-center gap-1 pt-2">
                        <button
                          type="button"
                          onClick={() => handleOpenEditCoupon(coupon)}
                          className="p-1.5 rounded-lg hover:bg-neutral-100 text-neutral-400 hover:text-neutral-700 transition-colors cursor-pointer"
                          title="Edit"
                        >
                          <Pencil className="w-3.5 h-3.5" />
                        </button>
                        <button
                          type="button"
                          onClick={() => handleDeleteCoupon(coupon.code)}
                          className="p-1.5 rounded-lg hover:bg-red-50 text-neutral-400 hover:text-red-600 transition-colors cursor-pointer"
                          title="Delete"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* SECTION 3: EMAIL NOTIFICATIONS AUTOMATION CALLOUT */}
      <div className="bg-gradient-to-r from-emerald-950 via-neutral-900 to-neutral-950 rounded-3xl p-6 sm:p-7 border border-emerald-800/40 shadow-md text-white flex flex-col sm:flex-row sm:items-center justify-between gap-5">
        <div className="space-y-1.5 max-w-xl">
          <div className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full bg-emerald-500/20 text-emerald-400 border border-emerald-500/30 text-[10px] font-bold">
            <Sparkles className="w-3 h-3" />
            <span>{"Automated Customer Email Notifications"}</span>
          </div>
          <h3 className="text-base font-bold text-white flex items-center gap-2">
            <Mail className="w-4 h-4 text-emerald-400" />
            <span>{"Email Gateway (SMTP) Configuration"}</span>
          </h3>
          <p className="text-xs text-neutral-300 leading-relaxed">
            {"Configure your store SMTP email, password, host & port to automatically notify customers via email on every order placement and status update."}
          </p>
        </div>

        <button
          type="button"
          onClick={() => {
            if (onNavigateTab) onNavigateTab("notifications");
          }}
          className="px-5 py-3 rounded-2xl bg-emerald-600 hover:bg-emerald-500 active:bg-emerald-700 text-white font-bold text-xs flex items-center justify-center gap-2 transition-all shadow-lg shadow-emerald-950/60 cursor-pointer shrink-0"
        >
          <span>{"Open Notifications Hub"}</span>
          <ExternalLink className="w-4 h-4" />
        </button>
      </div>

      {/* ADD / EDIT COUPON MODAL */}
      {couponModalOpen && (
        <div className="fixed inset-0 z-50 bg-black/40 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white w-full max-w-md rounded-3xl shadow-2xl border border-neutral-200 overflow-hidden flex flex-col animate-in fade-in zoom-in-95">
            {/* Modal Header */}
            <div className="p-5 border-b border-neutral-100 flex items-center justify-between bg-neutral-50/60">
              <div className="flex items-center gap-2.5">
                <div className="p-2 rounded-xl bg-emerald-100 text-emerald-700">
                  <Tag className="w-4 h-4" />
                </div>
                <div>
                  <h3 className="text-sm font-bold text-neutral-900">
                    {editingCoupon
                      ? ("Edit Coupon Code")
                      : ("Create New Coupon")}
                  </h3>
                  <p className="text-[11px] text-neutral-400">
                    {"Configure discount value and conditions"}
                  </p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setCouponModalOpen(false)}
                className="p-1.5 rounded-lg hover:bg-neutral-200 text-neutral-400 hover:text-neutral-700 transition-colors cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {/* Modal Form */}
            <form onSubmit={handleSaveCoupon} className="p-5 space-y-4">
              {couponFormError && (
                <div className="p-3 rounded-xl bg-red-50 border border-red-200 text-red-700 text-xs font-semibold flex items-center gap-2">
                  <AlertCircle className="w-4 h-4 shrink-0" />
                  <span>{couponFormError}</span>
                </div>
              )}

              {/* Coupon Code */}
              <div>
                <label className="block text-xs font-bold text-neutral-700 mb-1">
                  {"Coupon Code"} *
                </label>
                <input
                  type="text"
                  value={couponFormData.code}
                  disabled={Boolean(editingCoupon)}
                  onChange={(e) =>
                    setCouponFormData({ ...couponFormData, code: e.target.value.toUpperCase() })
                  }
                  placeholder="e.g. EID100 / SAVE20"
                  className="w-full px-3.5 py-2.5 font-mono uppercase rounded-xl bg-neutral-50 border border-neutral-300 text-xs font-bold text-neutral-900 focus:bg-white focus:border-emerald-500 focus:outline-none transition-all disabled:opacity-60"
                  required
                />
              </div>

              {/* Discount Type */}
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-bold text-neutral-700 mb-1">
                    {"Discount Type"}
                  </label>
                  <select
                    value={couponFormData.discountType}
                    onChange={(e) =>
                      setCouponFormData({ ...couponFormData, discountType: e.target.value })
                    }
                    className="w-full px-3 py-2.5 rounded-xl bg-neutral-50 border border-neutral-300 text-xs font-bold text-neutral-900 focus:bg-white focus:border-emerald-500 focus:outline-none transition-all"
                  >
                    <option value="fixed">{"Fixed (৳ BDT)"}</option>
                    <option value="percentage">{"Percentage (%)"}</option>
                  </select>
                </div>

                {/* Discount Value */}
                <div>
                  <label className="block text-xs font-bold text-neutral-700 mb-1">
                    {"Discount Value"} *
                  </label>
                  <input
                    type="number"
                    min="1"
                    value={couponFormData.value}
                    onChange={(e) =>
                      setCouponFormData({ ...couponFormData, value: e.target.value })
                    }
                    placeholder="e.g. 50 or 10"
                    className="w-full px-3.5 py-2.5 rounded-xl bg-neutral-50 border border-neutral-300 text-xs font-bold text-neutral-900 focus:bg-white focus:border-emerald-500 focus:outline-none transition-all"
                    required
                  />
                </div>
              </div>

              {/* Minimum Spend */}
              <div>
                <label className="block text-xs font-bold text-neutral-700 mb-1">
                  {"Minimum Order Value (৳)"}
                </label>
                <input
                  type="number"
                  min="0"
                  value={couponFormData.minSpend}
                  onChange={(e) =>
                    setCouponFormData({ ...couponFormData, minSpend: e.target.value })
                  }
                  placeholder="0 (no minimum requirement)"
                  className="w-full px-3.5 py-2.5 rounded-xl bg-neutral-50 border border-neutral-300 text-xs font-bold text-neutral-900 focus:bg-white focus:border-emerald-500 focus:outline-none transition-all"
                />
                <span className="text-[10px] text-neutral-400 mt-1 block">
                  {"Subtotal must reach this amount for coupon to apply."}
                </span>
              </div>

              {/* Active Toggle */}
              <div className="flex items-center justify-between p-3 rounded-xl bg-neutral-50 border border-neutral-200">
                <div>
                  <span className="text-xs font-bold text-neutral-800 block">
                    {"Active Status"}
                  </span>
                  <span className="text-[10px] text-neutral-400">
                    {"Customers can apply this coupon in cart"}
                  </span>
                </div>
                <input
                  type="checkbox"
                  checked={couponFormData.isActive}
                  onChange={(e) =>
                    setCouponFormData({ ...couponFormData, isActive: e.target.checked })
                  }
                  className="w-4 h-4 text-emerald-600 rounded focus:ring-emerald-500 cursor-pointer"
                />
              </div>

              {/* Action Buttons */}
              <div className="pt-2 flex items-center justify-end gap-2">
                <button
                  type="button"
                  onClick={() => setCouponModalOpen(false)}
                  className="px-4 py-2 rounded-xl border border-neutral-300 text-neutral-600 hover:bg-neutral-100 text-xs font-bold transition-colors cursor-pointer"
                >
                  {"Cancel"}
                </button>
                <button
                  type="submit"
                  disabled={isSavingCoupon}
                  className="px-5 py-2 bg-emerald-600 hover:bg-emerald-700 active:scale-95 text-white rounded-xl text-xs font-bold transition-all shadow-xs flex items-center gap-1.5 cursor-pointer disabled:opacity-50"
                >
                  {isSavingCoupon && <RefreshCw className="w-3.5 h-3.5 animate-spin" />}
                  <span>
                    {editingCoupon
                      ? ("Save Changes")
                      : ("Create Coupon")}
                  </span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
      {/* Media Library Picker for Brand Logos & Favicon */}
      <MediaPickerModal
        isOpen={Boolean(mediaPickerField)}
        onClose={() => setMediaPickerField(null)}
        defaultFolder="branding"
        uploadFolder="branding"
        title="Select Brand Logo / Favicon from Media Library"
        onSelect={(url) => {
          if (!url || typeof url !== "string") return;
          if (mediaPickerField === "faviconUrl") setFaviconUrl(url);
          else if (mediaPickerField === "logoUrl") setLogoUrl(url);
          else if (mediaPickerField === "headerLogoUrl") setHeaderLogoUrl(url);
          else if (mediaPickerField === "footerLogoUrl") setFooterLogoUrl(url);
          updateThemeConfig("shop", { [mediaPickerField]: url });
        }}
      />
    </div>
  );
};

export default AdminShopDetails;
