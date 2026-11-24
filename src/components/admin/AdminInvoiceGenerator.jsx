import React, { useState, useEffect, useMemo, useRef } from "react";
import {
  Printer,
  Save,
  RotateCcw,
  Search,
  CheckCircle2,
  Loader2,
  Upload,
  Image as ImageIcon,
  Trash2,
  Plus,
  RotateCw,
  FileText,
  Sparkles,
  PenTool,
  Layers,
  Edit3,
  Eye,
  EyeOff,
  AlertCircle,
  ShoppingBag,
} from "lucide-react";
import { useThemeConfig } from "../frontPanel/FrontPanelContext";
import { DEFAULT_THEME_CONFIG } from "../frontPanel/defaultThemeConfig";
import { apiClient } from "../../services/api";
import { formatBDT } from "../../utils/bangladesh";
import {
  INVOICE_TEMPLATES,
  resolveInvoiceConfig,
  resolveInvoiceNumber,
  buildInitialInvoiceData,
} from "../../utils/invoiceTemplates";
import { InvoiceSheetRenderer } from "./InvoiceSheetRenderer";
import { MediaPickerModal } from "./MediaPickerModal";

export const AdminInvoiceGenerator = ({ orders = [], products = [] }) => {
  const { themeConfig, updateThemeConfig } = useThemeConfig();

  const [configDraft, setConfigDraft] = useState(() => resolveInvoiceConfig(themeConfig));
  const [hasUnsavedConfig, setHasUnsavedConfig] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [feedback, setFeedback] = useState(null);
  const [activeEditorTab, setActiveEditorTab] = useState("orders"); // "orders" | "design" | "content"

  // Orders browsing & selection
  const [orderSearch, setOrderSearch] = useState("");
  const sortedOrders = useMemo(() => {
    return [...(Array.isArray(orders) ? orders : [])].sort((a, b) => {
      const ta = new Date(a?.createdAt || 0).getTime() || 0;
      const tb = new Date(b?.createdAt || 0).getTime() || 0;
      return tb - ta;
    });
  }, [orders]);

  const [selectedOrderId, setSelectedOrderId] = useState(() => sortedOrders[0]?.id || "");
  useEffect(() => {
    if (!selectedOrderId && sortedOrders.length > 0) {
      setSelectedOrderId(sortedOrders[0].id);
    }
  }, [sortedOrders, selectedOrderId]);

  const filteredOrders = useMemo(() => {
    const q = orderSearch.trim().toLowerCase();
    if (!q) return sortedOrders;
    return sortedOrders.filter((o) => {
      const invNo = resolveInvoiceNumber(o, sortedOrders, configDraft).toLowerCase();
      const oid = String(o?.id || "").toLowerCase();
      const cname = String(o?.address?.customerName || "").toLowerCase();
      const phone = String(o?.address?.phone || "").toLowerCase();
      const itemNames = Array.isArray(o?.items)
        ? o.items.map((it) => `${it?.name || ""} ${it?.sku || ""}`).join(" ").toLowerCase()
        : "";
      return (
        invNo.includes(q) ||
        oid.includes(q) ||
        cname.includes(q) ||
        phone.includes(q) ||
        itemNames.includes(q)
      );
    });
  }, [sortedOrders, orderSearch, configDraft]);

  const selectedOrder = useMemo(() => {
    return sortedOrders.find((o) => o.id === selectedOrderId) || sortedOrders[0] || null;
  }, [sortedOrders, selectedOrderId]);

  // Editable Invoice Data for currently selected order (or preview sample if no orders exist yet)
  const [invoiceDraft, setInvoiceDraft] = useState(() => {
    if (sortedOrders[0]) {
      return buildInitialInvoiceData(sortedOrders[0], sortedOrders, themeConfig);
    }
    const firstProd = products[0];
    const samplePrice = Number(firstProd?.price || 0);
    return {
      orderId: "PREVIEW",
      invoiceNumber: `${configDraft.invoicePrefix || "INV-"}${configDraft.invoiceStartNumber || 1001}`,
      dateText: new Date().toLocaleString("en-GB", { dateStyle: "medium", timeStyle: "short" }),
      customerName: "Sample Customer",
      customerPhone: themeConfig?.shop?.hotline || "",
      customerEmail: themeConfig?.shop?.supportEmail || "",
      customerAddress: themeConfig?.shop?.address || "",
      district: "",
      orderNote: "",
      paymentMethod: "COD",
      paymentStatus: "PENDING",
      paymentTrxId: "",
      courierProvider: "",
      trackingId: "",
      items: [
        {
          id: firstProd?.id || "item-preview-1",
          name: firstProd?.name || "Sample Store Product",
          variant: "",
          sku: firstProd?.sku || "",
          price: samplePrice,
          quantity: 1,
        },
      ],
      subtotal: samplePrice,
      deliveryFee: 0,
      discount: 0,
      total: samplePrice,
    };
  });

  // Re-hydrate invoiceDraft when switching orders or changing invoice prefix/start number cleanly
  useEffect(() => {
    if (selectedOrder) {
      const built = buildInitialInvoiceData(selectedOrder, sortedOrders, {
        ...themeConfig,
        invoiceConfig: configDraft,
      });
      setInvoiceDraft(built);
    } else {
      setInvoiceDraft((prev) => ({
        ...prev,
        invoiceNumber: `${configDraft.invoicePrefix ?? "INV-"}${Math.max(1, parseInt(configDraft.invoiceStartNumber, 10) || 1001)}`,
      }));
    }
  }, [
    selectedOrder?.id,
    configDraft.invoicePrefix,
    configDraft.invoiceStartNumber,
  ]);

  // Sync external DB themeConfig updates only if not actively dirty
  const dirtyRef = useRef(hasUnsavedConfig);
  useEffect(() => {
    dirtyRef.current = hasUnsavedConfig;
  }, [hasUnsavedConfig]);
  useEffect(() => {
    if (!dirtyRef.current) {
      setConfigDraft(resolveInvoiceConfig(themeConfig));
    }
  }, [themeConfig?.invoiceConfig]);

  // Upload & Media Picker states
  const [mediaPickerTarget, setMediaPickerTarget] = useState(null); // "logo" | "overlay" | "signature" | null
  const [uploadingTarget, setUploadingTarget] = useState("");
  const logoInputRef = useRef(null);
  const overlayInputRef = useRef(null);
  const signatureInputRef = useRef(null);

  const showToast = (type, text) => {
    setFeedback({ type, text });
    setTimeout(() => setFeedback(null), 4500);
  };

  const updateCfg = (patch) => {
    setHasUnsavedConfig(true);
    setConfigDraft((prev) => ({ ...prev, ...patch }));
  };

  const handleSaveGlobalConfig = async () => {
    setIsSaving(true);
    try {
      await updateThemeConfig("invoiceConfig", configDraft);
      setHasUnsavedConfig(false);
      showToast("success", "Invoice templates, numbering, overlay & signature settings saved live!");
    } catch (err) {
      showToast("error", err?.message || "Failed to save invoice configuration.");
    } finally {
      setIsSaving(false);
    }
  };

  const handleResetConfigDefaults = async () => {
    const resetCfg = { ...DEFAULT_THEME_CONFIG.invoiceConfig };
    setConfigDraft(resetCfg);
    setIsSaving(true);
    try {
      await updateThemeConfig("invoiceConfig", resetCfg);
      setHasUnsavedConfig(false);
      showToast("success", "Invoice Generator settings reset to defaults.");
    } catch {
      showToast("error", "Failed to reset invoice settings.");
    } finally {
      setIsSaving(false);
    }
  };

  // Upload image helper (uploads to Backend/Cloudinary Media Library with local DataURL fallback if offline)
  const handleImageFileUpload = async (file, target) => {
    if (!file) return;
    setUploadingTarget(target);
    try {
      const res = await apiClient.uploadMediaAssets(file, "branding", {
        title: `Invoice ${target}`,
      });
      const uploadedUrl = res?.assets?.[0]?.url || res?.url || "";
      if (uploadedUrl) {
        if (target === "logo") updateCfg({ showIcon: true, customLogoUrl: uploadedUrl });
        if (target === "overlay") updateCfg({ overlayEnabled: true, overlayType: "image", overlayImageUrl: uploadedUrl });
        if (target === "signature") updateCfg({ showSignature: true, signatureImageUrl: uploadedUrl });
        showToast("success", `Uploaded ${target} image successfully!`);
        return;
      }
      throw new Error("No image URL returned");
    } catch {
      const reader = new FileReader();
      reader.onload = () => {
        const dataUrl = String(reader.result || "");
        if (!dataUrl) return;
        if (target === "logo") updateCfg({ showIcon: true, customLogoUrl: dataUrl });
        if (target === "overlay") updateCfg({ overlayEnabled: true, overlayType: "image", overlayImageUrl: dataUrl });
        if (target === "signature") updateCfg({ showSignature: true, signatureImageUrl: dataUrl });
        showToast("success", `Loaded ${target} image preview! Click Save Global Settings to persist.`);
      };
      reader.readAsDataURL(file);
    } finally {
      setUploadingTarget("");
    }
  };

  // Per-order item editing helpers
  const recalcInvoiceTotals = (nextItems, nextDelivery = invoiceDraft.deliveryFee, nextDiscount = invoiceDraft.discount) => {
    const nextSubtotal = (nextItems || []).reduce(
      (sum, it) => sum + (Number(it.price) || 0) * Math.max(1, Number(it.quantity) || 1),
      0
    );
    const del = Math.max(0, Number(nextDelivery) || 0);
    const disc = Math.max(0, Number(nextDiscount) || 0);
    return {
      items: nextItems,
      subtotal: nextSubtotal,
      deliveryFee: del,
      discount: disc,
      total: Math.max(0, nextSubtotal + del - disc),
    };
  };

  const handleUpdateLineItem = (idx, patch) => {
    setInvoiceDraft((prev) => {
      const nextItems = prev.items.map((it, i) => (i === idx ? { ...it, ...patch } : it));
      return { ...prev, ...recalcInvoiceTotals(nextItems, prev.deliveryFee, prev.discount) };
    });
  };

  const handleAddLineItem = () => {
    const sampleProd = products[0];
    setInvoiceDraft((prev) => {
      const nextItems = [
        ...(prev.items || []),
        {
          id: `custom-item-${Date.now()}`,
          name: sampleProd?.name || "New Product Item",
          variant: "",
          sku: sampleProd?.sku || "",
          price: Number(sampleProd?.price || 0),
          quantity: 1,
        },
      ];
      return { ...prev, ...recalcInvoiceTotals(nextItems, prev.deliveryFee, prev.discount) };
    });
  };

  const handleRemoveLineItem = (idx) => {
    setInvoiceDraft((prev) => {
      const nextItems = prev.items.filter((_, i) => i !== idx);
      return { ...prev, ...recalcInvoiceTotals(nextItems, prev.deliveryFee, prev.discount) };
    });
  };

  const handleSaveOrderInvoiceOverride = async () => {
    if (!selectedOrder?.id) return;
    const nextOverrides = {
      ...(configDraft.orderOverrides || {}),
      [selectedOrder.id]: invoiceDraft,
    };
    const nextCfg = { ...configDraft, orderOverrides: nextOverrides };
    setConfigDraft(nextCfg);
    setIsSaving(true);
    try {
      await updateThemeConfig("invoiceConfig", nextCfg);
      setHasUnsavedConfig(false);
      showToast("success", `Saved customized invoice (${invoiceDraft.invoiceNumber}) for Order #${selectedOrder.id}!`);
    } catch {
      showToast("error", "Failed to save customized order invoice.");
    } finally {
      setIsSaving(false);
    }
  };

  const handleResetSelectedOrderInvoice = async () => {
    if (!selectedOrder) return;
    const nextOverrides = { ...(configDraft.orderOverrides || {}) };
    delete nextOverrides[selectedOrder.id];
    const nextCfg = { ...configDraft, orderOverrides: nextOverrides };
    setConfigDraft(nextCfg);
    setInvoiceDraft(
      buildInitialInvoiceData(selectedOrder, sortedOrders, {
        ...themeConfig,
        invoiceConfig: nextCfg,
      })
    );
    try {
      await updateThemeConfig("invoiceConfig", nextCfg);
      setHasUnsavedConfig(false);
      showToast("success", `Reset invoice for Order #${selectedOrder.id} back to live order values.`);
    } catch {}
  };

  const handlePrint = () => {
    window.print();
  };

  return (
    <div className="h-full min-h-0 flex flex-col gap-3 max-w-[1440px] w-full mx-auto overflow-hidden print:h-auto print:overflow-visible print:p-0 print:m-0">
      {/* Compact Top Action Header (Hidden when printing) */}
      <div className="shrink-0 bg-white rounded-2xl border border-neutral-200/80 shadow-xs px-4 py-3 flex flex-col lg:flex-row lg:items-center justify-between gap-3 print:hidden">
        <div className="flex items-center gap-3 min-w-0">
          <div className="w-9 h-9 rounded-xl bg-emerald-50 border border-emerald-200 flex items-center justify-center text-emerald-700 shrink-0">
            <FileText className="w-4 h-4" />
          </div>
          <div className="min-w-0">
            <div className="flex items-center gap-2 flex-wrap">
              <h2 className="text-base sm:text-lg font-black text-neutral-900 truncate">
                Invoice Generator Studio
              </h2>
              {hasUnsavedConfig && (
                <span className="px-2 py-0.5 rounded-full bg-amber-100 text-amber-800 border border-amber-200 text-[10px] font-bold">
                  Unsaved Settings
                </span>
              )}
              {selectedOrder && (
                <span className="px-2 py-0.5 rounded-full bg-emerald-50 text-emerald-800 border border-emerald-200 font-mono text-[10px] font-bold">
                  {invoiceDraft?.invoiceNumber}
                </span>
              )}
            </div>
            <p className="text-[11px] text-neutral-500 truncate">
              10 modern templates, separate Invoice ID sequence, rotatable overlay, optional branding &amp; soft-copy signature.
            </p>
          </div>
        </div>

        <div className="flex flex-wrap items-center gap-2 shrink-0">
          <button
            type="button"
            disabled={isSaving}
            onClick={handleResetConfigDefaults}
            className="px-3 py-2 rounded-xl border border-neutral-300 bg-white hover:bg-neutral-50 text-neutral-700 text-xs font-bold flex items-center gap-1.5 cursor-pointer disabled:opacity-50"
          >
            <RotateCcw className="w-3.5 h-3.5" />
            <span>Reset Defaults</span>
          </button>
          <button
            type="button"
            onClick={handlePrint}
            className="px-3.5 py-2 rounded-xl bg-neutral-900 hover:bg-neutral-800 text-white text-xs font-bold flex items-center gap-1.5 cursor-pointer shadow-xs"
          >
            <Printer className="w-3.5 h-3.5" />
            <span>Print / Save PDF</span>
          </button>
          <button
            type="button"
            disabled={isSaving}
            onClick={handleSaveGlobalConfig}
            className="px-4 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-extrabold shadow-sm flex items-center gap-1.5 cursor-pointer disabled:opacity-60"
          >
            {isSaving ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Save className="w-3.5 h-3.5" />}
            <span>{isSaving ? "Saving..." : "Save Global Settings"}</span>
          </button>
        </div>
      </div>

      {feedback && (
        <div
          className={`shrink-0 px-3.5 py-2 rounded-xl border text-xs font-bold flex items-center gap-2 print:hidden ${
            feedback.type === "success"
              ? "bg-emerald-50 border-emerald-200 text-emerald-800"
              : "bg-rose-50 border-rose-200 text-rose-800"
          }`}
        >
          {feedback.type === "success" ? (
            <CheckCircle2 className="w-4 h-4 shrink-0" />
          ) : (
            <AlertCircle className="w-4 h-4 shrink-0" />
          )}
          <span>{feedback.text}</span>
        </div>
      )}

      {/* Main 100vh Split Workspace: Left 3-Tab Panel + Right Live Printable Invoice */}
      <div className="flex-1 min-h-0 grid grid-cols-1 xl:grid-cols-12 gap-4 items-stretch print:block">
        {/* LEFT PANEL: Unified 3-Tab Editor (Customer Order | Templates | Edit) */}
        <div className="xl:col-span-5 h-full min-h-0 flex flex-col print:hidden">
          <div className="flex-1 min-h-0 bg-white rounded-2xl border border-neutral-200 overflow-hidden shadow-xs flex flex-col">
            {/* 3 Short Menu Tabs */}
            <div className="shrink-0 p-1.5 bg-neutral-100 grid grid-cols-3 gap-1 border-b border-neutral-200">
              <button
                type="button"
                onClick={() => setActiveEditorTab("orders")}
                className={`py-2 px-2 rounded-xl text-xs font-bold flex items-center justify-center gap-1.5 cursor-pointer transition-all truncate ${
                  activeEditorTab === "orders"
                    ? "bg-neutral-900 text-white shadow-xs"
                    : "text-neutral-600 hover:text-neutral-900"
                }`}
              >
                <ShoppingBag className="w-3.5 h-3.5 shrink-0" />
                <span className="truncate">Customer Order</span>
                <span
                  className={`px-1.5 py-0.2 rounded-full text-[10px] font-bold shrink-0 ${
                    activeEditorTab === "orders"
                      ? "bg-white/20 text-white"
                      : "bg-neutral-200 text-neutral-700"
                  }`}
                >
                  {sortedOrders.length}
                </span>
              </button>
              <button
                type="button"
                onClick={() => setActiveEditorTab("design")}
                className={`py-2 px-2 rounded-xl text-xs font-bold flex items-center justify-center gap-1.5 cursor-pointer transition-all truncate ${
                  activeEditorTab === "design"
                    ? "bg-neutral-900 text-white shadow-xs"
                    : "text-neutral-600 hover:text-neutral-900"
                }`}
              >
                <Sparkles className="w-3.5 h-3.5 shrink-0" />
                <span className="truncate">Templates</span>
              </button>
              <button
                type="button"
                onClick={() => setActiveEditorTab("content")}
                className={`py-2 px-2 rounded-xl text-xs font-bold flex items-center justify-center gap-1.5 cursor-pointer transition-all truncate ${
                  activeEditorTab === "content"
                    ? "bg-neutral-900 text-white shadow-xs"
                    : "text-neutral-600 hover:text-neutral-900"
                }`}
              >
                <Edit3 className="w-3.5 h-3.5 shrink-0" />
                <span className="truncate">Edit</span>
              </button>
            </div>

            {/* TAB 1: CUSTOMER ORDER SELECTOR */}
            {activeEditorTab === "orders" && (
              <div className="flex-1 min-h-0 p-4 flex flex-col gap-3">
                <div className="flex items-center justify-between gap-2 shrink-0">
                  <span className="text-[11px] font-black uppercase tracking-wider text-neutral-700">
                    Select Customer Order ({filteredOrders.length})
                  </span>
                  {selectedOrder && configDraft.orderOverrides?.[selectedOrder.id] && (
                    <span className="px-2 py-0.5 rounded-full bg-indigo-50 text-indigo-700 border border-indigo-200 text-[10px] font-bold">
                      Custom Edited
                    </span>
                  )}
                </div>

                <div className="relative shrink-0">
                  <Search className="w-3.5 h-3.5 text-neutral-400 absolute left-3 top-1/2 -translate-y-1/2" />
                  <input
                    type="text"
                    value={orderSearch}
                    onChange={(e) => setOrderSearch(e.target.value)}
                    placeholder="Search Invoice #, Order #, Name, Phone or Product..."
                    className="w-full pl-8 pr-3 py-2 rounded-xl border border-neutral-300 text-xs focus:border-emerald-600 focus:outline-none"
                  />
                </div>

                {filteredOrders.length === 0 ? (
                  <div className="p-6 rounded-2xl bg-neutral-50 border border-dashed border-neutral-200 text-center text-xs text-neutral-500">
                    {sortedOrders.length === 0
                      ? "No customer orders placed yet. Showing live sample preview on the right—any new order will auto-populate here!"
                      : "No matching orders found."}
                  </div>
                ) : (
                  <div className="flex-1 min-h-0 overflow-y-auto space-y-1.5 pr-1">
                    {filteredOrders.map((ord) => {
                      const invNo = resolveInvoiceNumber(ord, sortedOrders, configDraft);
                      const isSel = selectedOrder?.id === ord.id;
                      const firstItemName = ord.items?.[0]?.name || "Product";
                      const extraCount = (ord.items?.length || 1) - 1;
                      return (
                        <button
                          key={ord.id}
                          type="button"
                          onClick={() => setSelectedOrderId(ord.id)}
                          className={`w-full text-left p-2.5 rounded-xl border transition-all flex items-center justify-between gap-2 cursor-pointer text-xs ${
                            isSel
                              ? "bg-emerald-50 border-emerald-500 ring-1 ring-emerald-500/30"
                              : "bg-white border-neutral-200 hover:bg-neutral-50"
                          }`}
                        >
                          <div className="min-w-0">
                            <div className="flex items-center gap-1.5 flex-wrap">
                              <span className="font-mono font-extrabold text-emerald-800">{invNo}</span>
                              <span className="text-[10px] font-mono text-neutral-400">#{ord.id}</span>
                              {configDraft.orderOverrides?.[ord.id] && (
                                <span className="px-1.5 py-0.2 rounded bg-indigo-50 text-indigo-700 text-[9px] font-bold">
                                  Edited
                                </span>
                              )}
                            </div>
                            <p className="font-bold text-neutral-900 truncate mt-0.5">
                              {ord.address?.customerName || "Customer"} • {ord.address?.phone || ""}
                            </p>
                            <p className="text-[11px] text-neutral-500 truncate">
                              {firstItemName}
                              {extraCount > 0 ? ` +${extraCount} more` : ""}
                            </p>
                          </div>
                          <div className="text-right shrink-0">
                            <span className="font-black text-neutral-900 block">{formatBDT(ord.total)}</span>
                            <span
                              className={`text-[10px] font-bold uppercase ${
                                ord.paymentStatus === "PAID" ? "text-emerald-700" : "text-amber-700"
                              }`}
                            >
                              {ord.paymentStatus || ord.status}
                            </span>
                          </div>
                        </button>
                      );
                    })}
                  </div>
                )}
              </div>
            )}

            {/* TAB 2: TEMPLATES, OVERLAY & BRANDING */}
            {activeEditorTab === "design" && (
              <div className="flex-1 min-h-0 p-4 space-y-5 text-xs overflow-y-auto">
                {/* 10 Modern Templates */}
                <div className="space-y-2.5">
                  <div className="flex items-center justify-between gap-2">
                    <span className="font-black text-neutral-900 uppercase tracking-wider text-[11px]">
                      10 Modern Invoice Templates
                    </span>
                    <div className="flex items-center gap-1.5">
                      <span className="text-[11px] font-semibold text-neutral-500">Accent:</span>
                      <input
                        type="color"
                        value={configDraft.accentColor || "#065f46"}
                        onChange={(e) => updateCfg({ accentColor: e.target.value })}
                        className="w-7 h-7 rounded-lg border border-neutral-300 cursor-pointer p-0.5 bg-white"
                      />
                    </div>
                  </div>

                  <div className="grid grid-cols-2 gap-2">
                    {INVOICE_TEMPLATES.map((tpl) => {
                      const active = (configDraft.templateId || "classic-emerald") === tpl.id;
                      return (
                        <button
                          key={tpl.id}
                          type="button"
                          onClick={() => {
                            const nextCfg = {
                              ...configDraft,
                              templateId: tpl.id,
                              accentColor: tpl.previewAccent,
                            };
                            setConfigDraft(nextCfg);
                            setHasUnsavedConfig(false);
                            updateThemeConfig("invoiceConfig", nextCfg).catch(() => {});
                          }}
                          className={`p-2.5 rounded-xl border text-left transition-all cursor-pointer flex items-center gap-2.5 ${
                            active
                              ? "border-emerald-600 bg-emerald-50/70 ring-1 ring-emerald-500/30"
                              : "border-neutral-200 bg-white hover:bg-neutral-50"
                          }`}
                        >
                          <div
                            className="w-7 h-9 rounded-md border border-neutral-300 shrink-0 overflow-hidden flex flex-col justify-between p-1"
                            style={{ backgroundColor: tpl.previewBg }}
                          >
                            <div
                              className="h-1.5 w-full rounded-xs"
                              style={{ backgroundColor: tpl.previewAccent }}
                            />
                            <div className="space-y-0.5">
                              <div className="h-0.5 w-4/5 bg-neutral-400/60 rounded" />
                              <div className="h-0.5 w-3/5 bg-neutral-400/60 rounded" />
                            </div>
                          </div>
                          <div className="min-w-0">
                            <p className="font-bold text-neutral-900 truncate text-[11px]">{tpl.name}</p>
                            <p className="text-[10px] text-neutral-500 truncate">{tpl.subtitle}</p>
                          </div>
                        </button>
                      );
                    })}
                  </div>
                </div>

                {/* Invoice ID Prefix & Sequence (Separate from Order ID) */}
                <div className="p-3.5 rounded-2xl bg-neutral-50 border border-neutral-200 space-y-3">
                  <span className="font-black text-neutral-900 uppercase tracking-wider text-[11px] block">
                    Invoice ID Sequence (Separate from Order ID)
                  </span>
                  <div className="grid grid-cols-2 gap-2.5">
                    <div>
                      <label className="block font-bold text-neutral-700 mb-1">Invoice Prefix</label>
                      <input
                        type="text"
                        value={configDraft.invoicePrefix ?? "INV-"}
                        onChange={(e) => updateCfg({ invoicePrefix: e.target.value })}
                        placeholder="INV-"
                        className="w-full px-3 py-2 rounded-xl border border-neutral-300 bg-white font-mono font-bold focus:border-emerald-600 focus:outline-none"
                      />
                    </div>
                    <div>
                      <label className="block font-bold text-neutral-700 mb-1">Starting Number</label>
                      <input
                        type="number"
                        min="1"
                        value={configDraft.invoiceStartNumber ?? 1001}
                        onChange={(e) =>
                          updateCfg({ invoiceStartNumber: Math.max(1, parseInt(e.target.value, 10) || 1) })
                        }
                        className="w-full px-3 py-2 rounded-xl border border-neutral-300 bg-white font-mono font-bold focus:border-emerald-600 focus:outline-none"
                      />
                    </div>
                  </div>
                  <div className="grid grid-cols-2 gap-2.5 items-center">
                    <div>
                      <label className="block font-bold text-neutral-700 mb-1">Document Heading</label>
                      <input
                        type="text"
                        value={configDraft.invoiceTitle ?? "INVOICE"}
                        onChange={(e) => updateCfg({ invoiceTitle: e.target.value })}
                        placeholder="INVOICE"
                        className="w-full px-3 py-1.5 rounded-xl border border-neutral-300 bg-white font-bold focus:border-emerald-600 focus:outline-none"
                      />
                    </div>
                    <label className="inline-flex items-center gap-2 font-bold text-neutral-700 pt-5 cursor-pointer">
                      <input
                        type="checkbox"
                        checked={configDraft.showOrderIdRef !== false}
                        onChange={(e) => updateCfg({ showOrderIdRef: e.target.checked })}
                        className="w-4 h-4 accent-emerald-600"
                      />
                      <span>Show Order Ref (#ID)</span>
                    </label>
                  </div>
                </div>

                {/* Shop Identity, Optional Icon & Optional Tagline */}
                <div className="p-3.5 rounded-2xl bg-neutral-50 border border-neutral-200 space-y-3">
                  <span className="font-black text-neutral-900 uppercase tracking-wider text-[11px] block">
                    Shop Header, Icon &amp; Contact (Optional Controls)
                  </span>

                  {/* Icon toggle & upload */}
                  <div className="p-2.5 rounded-xl bg-white border border-neutral-200 space-y-2">
                    <div className="flex items-center justify-between">
                      <label className="inline-flex items-center gap-2 font-bold text-neutral-800 cursor-pointer">
                        <input
                          type="checkbox"
                          checked={configDraft.showIcon !== false}
                          onChange={(e) => updateCfg({ showIcon: e.target.checked })}
                          className="w-4 h-4 accent-emerald-600"
                        />
                        <span>Show Brand Icon / Logo on Invoice</span>
                      </label>
                      {configDraft.showIcon === false && (
                        <span className="text-[10px] font-bold text-neutral-400">Text-Only Header</span>
                      )}
                    </div>

                    {configDraft.showIcon !== false && (
                      <div className="flex flex-wrap items-center gap-2 pt-1">
                        <input
                          ref={logoInputRef}
                          type="file"
                          accept="image/*"
                          className="hidden"
                          onChange={(e) => handleImageFileUpload(e.target.files?.[0], "logo")}
                        />
                        <button
                          type="button"
                          onClick={() => logoInputRef.current?.click()}
                          className="px-2.5 py-1.5 rounded-lg border border-neutral-300 bg-neutral-50 hover:bg-neutral-100 font-bold text-[11px] flex items-center gap-1 cursor-pointer"
                        >
                          <Upload className="w-3 h-3" />
                          <span>{uploadingTarget === "logo" ? "Uploading..." : "Upload Icon"}</span>
                        </button>
                        <button
                          type="button"
                          onClick={() => setMediaPickerTarget("logo")}
                          className="px-2.5 py-1.5 rounded-lg border border-neutral-300 bg-neutral-50 hover:bg-neutral-100 font-bold text-[11px] flex items-center gap-1 cursor-pointer"
                        >
                          <ImageIcon className="w-3 h-3" />
                          <span>Media Library</span>
                        </button>
                        {configDraft.customLogoUrl && (
                          <button
                            type="button"
                            onClick={() => updateCfg({ customLogoUrl: "" })}
                            className="px-2 py-1.5 rounded-lg text-rose-600 hover:bg-rose-50 font-bold text-[11px] cursor-pointer"
                          >
                            Reset Logo
                          </button>
                        )}
                      </div>
                    )}
                  </div>

                  <div>
                    <label className="block font-bold text-neutral-700 mb-1">
                      Shop Name (Leave blank to use Shop Details)
                    </label>
                    <input
                      type="text"
                      value={configDraft.shopNameOverride ?? ""}
                      onChange={(e) => updateCfg({ shopNameOverride: e.target.value })}
                      placeholder={themeConfig?.shop?.name || "Auto from Shop Details"}
                      className="w-full px-3 py-1.5 rounded-xl border border-neutral-300 bg-white focus:border-emerald-600 focus:outline-none"
                    />
                  </div>

                  <div>
                    <div className="flex items-center justify-between mb-1">
                      <label className="font-bold text-neutral-700">Shop Tagline (Optional)</label>
                      <button
                        type="button"
                        onClick={() => updateCfg({ showTagline: configDraft.showTagline === false })}
                        className="text-[11px] font-bold text-emerald-700 flex items-center gap-1 cursor-pointer"
                      >
                        {configDraft.showTagline !== false ? <Eye className="w-3 h-3" /> : <EyeOff className="w-3 h-3" />}
                        <span>{configDraft.showTagline !== false ? "Visible" : "Hidden"}</span>
                      </button>
                    </div>
                    {configDraft.showTagline !== false && (
                      <input
                        type="text"
                        value={configDraft.taglineOverride ?? ""}
                        onChange={(e) => updateCfg({ taglineOverride: e.target.value })}
                        placeholder={themeConfig?.shop?.tagline || "Leave blank for Shop Details tagline"}
                        className="w-full px-3 py-1.5 rounded-xl border border-neutral-300 bg-white focus:border-emerald-600 focus:outline-none"
                      />
                    )}
                  </div>

                  <div className="grid grid-cols-1 gap-2">
                    <div>
                      <div className="flex items-center justify-between mb-1">
                        <label className="font-bold text-neutral-700">Address</label>
                        <input
                          type="checkbox"
                          checked={configDraft.showAddress !== false}
                          onChange={(e) => updateCfg({ showAddress: e.target.checked })}
                          className="accent-emerald-600 cursor-pointer"
                          title="Show Address"
                        />
                      </div>
                      {configDraft.showAddress !== false && (
                        <input
                          type="text"
                          value={configDraft.addressOverride ?? ""}
                          onChange={(e) => updateCfg({ addressOverride: e.target.value })}
                          placeholder={themeConfig?.shop?.address || "Auto from Shop Details"}
                          className="w-full px-3 py-1.5 rounded-xl border border-neutral-300 bg-white focus:border-emerald-600 focus:outline-none"
                        />
                      )}
                    </div>

                    <div className="grid grid-cols-2 gap-2">
                      <div>
                        <div className="flex items-center justify-between mb-1">
                          <label className="font-bold text-neutral-700">Hotline</label>
                          <input
                            type="checkbox"
                            checked={configDraft.showHotline !== false}
                            onChange={(e) => updateCfg({ showHotline: e.target.checked })}
                            className="accent-emerald-600 cursor-pointer"
                          />
                        </div>
                        {configDraft.showHotline !== false && (
                          <input
                            type="text"
                            value={configDraft.hotlineOverride ?? ""}
                            onChange={(e) => updateCfg({ hotlineOverride: e.target.value })}
                            placeholder={themeConfig?.shop?.hotline || "Auto"}
                            className="w-full px-3 py-1.5 rounded-xl border border-neutral-300 bg-white focus:border-emerald-600 focus:outline-none"
                          />
                        )}
                      </div>

                      <div>
                        <div className="flex items-center justify-between mb-1">
                          <label className="font-bold text-neutral-700">Email</label>
                          <input
                            type="checkbox"
                            checked={configDraft.showEmail !== false}
                            onChange={(e) => updateCfg({ showEmail: e.target.checked })}
                            className="accent-emerald-600 cursor-pointer"
                          />
                        </div>
                        {configDraft.showEmail !== false && (
                          <input
                            type="text"
                            value={configDraft.emailOverride ?? ""}
                            onChange={(e) => updateCfg({ emailOverride: e.target.value })}
                            placeholder={themeConfig?.shop?.supportEmail || "Auto"}
                            className="w-full px-3 py-1.5 rounded-xl border border-neutral-300 bg-white focus:border-emerald-600 focus:outline-none"
                          />
                        )}
                      </div>
                    </div>
                  </div>
                </div>

                {/* Background Overlay / Watermark + Rotation Angle */}
                <div className="p-3.5 rounded-2xl bg-neutral-50 border border-neutral-200 space-y-3">
                  <div className="flex items-center justify-between">
                    <span className="font-black text-neutral-900 uppercase tracking-wider text-[11px] flex items-center gap-1.5">
                      <Layers className="w-3.5 h-3.5 text-emerald-700" />
                      <span>Background Overlay &amp; Angle</span>
                    </span>
                    <label className="inline-flex items-center gap-1.5 font-bold cursor-pointer">
                      <input
                        type="checkbox"
                        checked={Boolean(configDraft.overlayEnabled)}
                        onChange={(e) => updateCfg({ overlayEnabled: e.target.checked })}
                        className="w-4 h-4 accent-emerald-600"
                      />
                      <span>Enable</span>
                    </label>
                  </div>

                  {configDraft.overlayEnabled && (
                    <div className="space-y-3 pt-1">
                      <div className="flex gap-1.5 bg-white p-1 rounded-xl border border-neutral-200">
                        <button
                          type="button"
                          onClick={() => updateCfg({ overlayType: "text" })}
                          className={`flex-1 py-1.5 rounded-lg font-bold text-[11px] cursor-pointer ${
                            (configDraft.overlayType || "text") === "text"
                              ? "bg-neutral-900 text-white"
                              : "text-neutral-600"
                          }`}
                        >
                          Text Watermark
                        </button>
                        <button
                          type="button"
                          onClick={() => updateCfg({ overlayType: "image" })}
                          className={`flex-1 py-1.5 rounded-lg font-bold text-[11px] cursor-pointer ${
                            configDraft.overlayType === "image"
                              ? "bg-neutral-900 text-white"
                              : "text-neutral-600"
                          }`}
                        >
                          Image / Logo Overlay
                        </button>
                      </div>

                      {(configDraft.overlayType || "text") === "text" ? (
                        <div className="grid grid-cols-3 gap-2">
                          <div className="col-span-2">
                            <label className="block font-bold text-neutral-700 mb-1">Overlay Text</label>
                            <input
                              type="text"
                              value={configDraft.overlayText ?? ""}
                              onChange={(e) => updateCfg({ overlayText: e.target.value })}
                              placeholder={themeConfig?.shop?.name || "PAID / ORIGINAL"}
                              className="w-full px-3 py-1.5 rounded-xl border border-neutral-300 bg-white focus:border-emerald-600 focus:outline-none"
                            />
                          </div>
                          <div>
                            <label className="block font-bold text-neutral-700 mb-1">Color</label>
                            <input
                              type="color"
                              value={configDraft.overlayColor || "#0f172a"}
                              onChange={(e) => updateCfg({ overlayColor: e.target.value })}
                              className="w-full h-8 rounded-xl border border-neutral-300 bg-white p-0.5 cursor-pointer"
                            />
                          </div>
                        </div>
                      ) : (
                        <div className="flex flex-wrap items-center gap-2">
                          <input
                            ref={overlayInputRef}
                            type="file"
                            accept="image/*"
                            className="hidden"
                            onChange={(e) => handleImageFileUpload(e.target.files?.[0], "overlay")}
                          />
                          <button
                            type="button"
                            onClick={() => overlayInputRef.current?.click()}
                            className="px-3 py-1.5 rounded-xl border border-neutral-300 bg-white hover:bg-neutral-100 font-bold text-[11px] flex items-center gap-1 cursor-pointer"
                          >
                            <Upload className="w-3.5 h-3.5" />
                            <span>{uploadingTarget === "overlay" ? "Uploading..." : "Upload Overlay Image"}</span>
                          </button>
                          <button
                            type="button"
                            onClick={() => setMediaPickerTarget("overlay")}
                            className="px-3 py-1.5 rounded-xl border border-neutral-300 bg-white hover:bg-neutral-100 font-bold text-[11px] flex items-center gap-1 cursor-pointer"
                          >
                            <ImageIcon className="w-3.5 h-3.5" />
                            <span>Media Library</span>
                          </button>
                          {configDraft.overlayImageUrl && (
                            <button
                              type="button"
                              onClick={() => updateCfg({ overlayImageUrl: "" })}
                              className="text-rose-600 font-bold text-[11px] cursor-pointer"
                            >
                              Remove
                            </button>
                          )}
                        </div>
                      )}

                      {/* Rotation Angle (-180 to 360) */}
                      <div className="space-y-1.5">
                        <div className="flex items-center justify-between gap-2">
                          <label className="font-bold text-neutral-700 flex items-center gap-1">
                            <RotateCw className="w-3.5 h-3.5 text-emerald-700" />
                            <span>Rotation Angle (Degrees)</span>
                          </label>
                          <div className="flex items-center gap-1">
                            <input
                              type="number"
                              min="-360"
                              max="360"
                              value={configDraft.overlayAngle ?? -35}
                              onChange={(e) => updateCfg({ overlayAngle: Number(e.target.value) || 0 })}
                              className="w-16 px-2 py-1 rounded-lg border border-neutral-300 bg-white font-mono font-bold text-right"
                            />
                            <span className="font-bold text-neutral-500">°</span>
                          </div>
                        </div>
                        <input
                          type="range"
                          min="-180"
                          max="180"
                          value={Math.max(-180, Math.min(180, Number(configDraft.overlayAngle ?? -35)))}
                          onChange={(e) => updateCfg({ overlayAngle: Number(e.target.value) })}
                          className="w-full accent-emerald-600 cursor-pointer"
                        />
                        <div className="flex flex-wrap gap-1">
                          {[0, -45, 45, 165, -15].map((ang) => (
                            <button
                              key={ang}
                              type="button"
                              onClick={() => updateCfg({ overlayAngle: ang })}
                              className={`px-2 py-0.5 rounded-md border text-[10px] font-mono font-bold cursor-pointer ${
                                Number(configDraft.overlayAngle) === ang
                                  ? "bg-emerald-600 text-white border-emerald-600"
                                  : "bg-white text-neutral-600 border-neutral-200 hover:bg-neutral-100"
                              }`}
                            >
                              {ang}°
                            </button>
                          ))}
                        </div>
                      </div>

                      <div className="grid grid-cols-2 gap-3">
                        <div>
                          <label className="block font-bold text-neutral-700 mb-1">
                            Opacity ({configDraft.overlayOpacity ?? 8}%)
                          </label>
                          <input
                            type="range"
                            min="2"
                            max="40"
                            value={configDraft.overlayOpacity ?? 8}
                            onChange={(e) => updateCfg({ overlayOpacity: Number(e.target.value) })}
                            className="w-full accent-emerald-600 cursor-pointer"
                          />
                        </div>
                        <div>
                          <label className="block font-bold text-neutral-700 mb-1">
                            Size ({configDraft.overlaySize ?? 54})
                          </label>
                          <input
                            type="range"
                            min="20"
                            max="96"
                            value={configDraft.overlaySize ?? 54}
                            onChange={(e) => updateCfg({ overlaySize: Number(e.target.value) })}
                            className="w-full accent-emerald-600 cursor-pointer"
                          />
                        </div>
                      </div>
                    </div>
                  )}
                </div>

                {/* Editable Terms & Conditions */}
                <div className="p-3.5 rounded-2xl bg-neutral-50 border border-neutral-200 space-y-2.5">
                  <div className="flex items-center justify-between">
                    <span className="font-black text-neutral-900 uppercase tracking-wider text-[11px]">
                      Terms &amp; Conditions
                    </span>
                    <label className="inline-flex items-center gap-1.5 font-bold cursor-pointer">
                      <input
                        type="checkbox"
                        checked={configDraft.showTerms !== false}
                        onChange={(e) => updateCfg({ showTerms: e.target.checked })}
                        className="w-4 h-4 accent-emerald-600"
                      />
                      <span>Show</span>
                    </label>
                  </div>
                  {configDraft.showTerms !== false && (
                    <>
                      <input
                        type="text"
                        value={configDraft.termsTitle ?? "Terms & Conditions:"}
                        onChange={(e) => updateCfg({ termsTitle: e.target.value })}
                        placeholder="Terms & Conditions:"
                        className="w-full px-3 py-1.5 rounded-xl border border-neutral-300 bg-white font-bold focus:border-emerald-600 focus:outline-none"
                      />
                      <textarea
                        rows="3"
                        value={configDraft.termsText ?? ""}
                        onChange={(e) => updateCfg({ termsText: e.target.value })}
                        placeholder="Enter return, inspection, or warranty terms (optional)..."
                        className="w-full px-3 py-2 rounded-xl border border-neutral-300 bg-white focus:border-emerald-600 focus:outline-none"
                      />
                    </>
                  )}
                </div>

                {/* Authorized Signature (Soft Copy Upload) */}
                <div className="p-3.5 rounded-2xl bg-neutral-50 border border-neutral-200 space-y-2.5">
                  <div className="flex items-center justify-between">
                    <span className="font-black text-neutral-900 uppercase tracking-wider text-[11px] flex items-center gap-1.5">
                      <PenTool className="w-3.5 h-3.5 text-emerald-700" />
                      <span>Authorized Signature (Soft Copy)</span>
                    </span>
                    <label className="inline-flex items-center gap-1.5 font-bold cursor-pointer">
                      <input
                        type="checkbox"
                        checked={configDraft.showSignature !== false}
                        onChange={(e) => updateCfg({ showSignature: e.target.checked })}
                        className="w-4 h-4 accent-emerald-600"
                      />
                      <span>Show</span>
                    </label>
                  </div>

                  {configDraft.showSignature !== false && (
                    <div className="space-y-2.5">
                      <input
                        type="text"
                        value={configDraft.signatureLabel ?? "Authorized Signature"}
                        onChange={(e) => updateCfg({ signatureLabel: e.target.value })}
                        placeholder="Authorized Signature"
                        className="w-full px-3 py-1.5 rounded-xl border border-neutral-300 bg-white font-semibold focus:border-emerald-600 focus:outline-none"
                      />
                      <div className="flex flex-wrap items-center gap-2">
                        <input
                          ref={signatureInputRef}
                          type="file"
                          accept="image/*"
                          className="hidden"
                          onChange={(e) => handleImageFileUpload(e.target.files?.[0], "signature")}
                        />
                        <button
                          type="button"
                          onClick={() => signatureInputRef.current?.click()}
                          className="px-3 py-1.5 rounded-xl border border-neutral-300 bg-white hover:bg-neutral-100 font-bold text-[11px] flex items-center gap-1 cursor-pointer"
                        >
                          <Upload className="w-3.5 h-3.5" />
                          <span>
                            {uploadingTarget === "signature" ? "Uploading..." : "Upload Signature Image"}
                          </span>
                        </button>
                        <button
                          type="button"
                          onClick={() => setMediaPickerTarget("signature")}
                          className="px-3 py-1.5 rounded-xl border border-neutral-300 bg-white hover:bg-neutral-100 font-bold text-[11px] flex items-center gap-1 cursor-pointer"
                        >
                          <ImageIcon className="w-3.5 h-3.5" />
                          <span>Media Library</span>
                        </button>
                        {configDraft.signatureImageUrl && (
                          <button
                            type="button"
                            onClick={() => updateCfg({ signatureImageUrl: "" })}
                            className="px-2.5 py-1.5 rounded-xl text-rose-600 hover:bg-rose-50 font-bold text-[11px] cursor-pointer"
                          >
                            Remove Signature
                          </button>
                        )}
                      </div>
                      {configDraft.signatureImageUrl && (
                        <div className="p-2 rounded-xl bg-white border border-neutral-200 inline-block">
                          <img
                            src={configDraft.signatureImageUrl}
                            alt="Signature Preview"
                            className="h-12 w-auto object-contain"
                          />
                        </div>
                      )}
                    </div>
                  )}
                </div>
              </div>
            )}

            {/* TAB 3: EDIT SELECTED INVOICE DATA (CUSTOMER, PAYMENT, COURIER, PRODUCTS) */}
            {activeEditorTab === "content" && invoiceDraft && (
              <div className="flex-1 min-h-0 p-4 space-y-4 text-xs overflow-y-auto">
                <div className="flex flex-wrap items-center justify-between gap-2 pb-2 border-b border-neutral-100">
                  <span className="font-bold text-neutral-700">
                    Customize this order&apos;s invoice fields (live preview updates instantly)
                  </span>
                  <div className="flex items-center gap-1.5">
                    {selectedOrder && (
                      <>
                        <button
                          type="button"
                          onClick={handleResetSelectedOrderInvoice}
                          className="px-2.5 py-1 rounded-lg border border-neutral-200 hover:bg-neutral-50 text-neutral-600 font-bold cursor-pointer"
                        >
                          Reset
                        </button>
                        <button
                          type="button"
                          onClick={handleSaveOrderInvoiceOverride}
                          disabled={isSaving}
                          className="px-3 py-1 rounded-lg bg-emerald-600 hover:bg-emerald-700 text-white font-bold cursor-pointer"
                        >
                          Save for Order
                        </button>
                      </>
                    )}
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-2.5">
                  <div>
                    <label className="block font-bold text-neutral-700 mb-1">Invoice Number</label>
                    <input
                      type="text"
                      value={invoiceDraft.invoiceNumber || ""}
                      onChange={(e) => setInvoiceDraft((p) => ({ ...p, invoiceNumber: e.target.value }))}
                      className="w-full px-3 py-1.5 rounded-xl border border-neutral-300 font-mono font-bold"
                    />
                  </div>
                  <div>
                    <label className="block font-bold text-neutral-700 mb-1">Date &amp; Time</label>
                    <input
                      type="text"
                      value={invoiceDraft.dateText || ""}
                      onChange={(e) => setInvoiceDraft((p) => ({ ...p, dateText: e.target.value }))}
                      className="w-full px-3 py-1.5 rounded-xl border border-neutral-300"
                    />
                  </div>
                </div>

                {/* Customer Details */}
                <div className="p-3 rounded-2xl bg-neutral-50 border border-neutral-200 space-y-2">
                  <span className="font-black text-neutral-700 uppercase text-[10px] block">Customer Details</span>
                  <div className="grid grid-cols-2 gap-2">
                    <input
                      type="text"
                      value={invoiceDraft.customerName || ""}
                      onChange={(e) => setInvoiceDraft((p) => ({ ...p, customerName: e.target.value }))}
                      placeholder="Customer Name"
                      className="px-2.5 py-1.5 rounded-xl border border-neutral-300 bg-white"
                    />
                    <input
                      type="text"
                      value={invoiceDraft.customerPhone || ""}
                      onChange={(e) => setInvoiceDraft((p) => ({ ...p, customerPhone: e.target.value }))}
                      placeholder="Phone"
                      className="px-2.5 py-1.5 rounded-xl border border-neutral-300 bg-white font-mono"
                    />
                  </div>
                  <input
                    type="text"
                    value={invoiceDraft.customerAddress || ""}
                    onChange={(e) => setInvoiceDraft((p) => ({ ...p, customerAddress: e.target.value }))}
                    placeholder="Full Address"
                    className="w-full px-2.5 py-1.5 rounded-xl border border-neutral-300 bg-white"
                  />
                  <div className="grid grid-cols-2 gap-2">
                    <input
                      type="text"
                      value={invoiceDraft.customerEmail || ""}
                      onChange={(e) => setInvoiceDraft((p) => ({ ...p, customerEmail: e.target.value }))}
                      placeholder="Email (optional)"
                      className="px-2.5 py-1.5 rounded-xl border border-neutral-300 bg-white"
                    />
                    <input
                      type="text"
                      value={invoiceDraft.orderNote || ""}
                      onChange={(e) => setInvoiceDraft((p) => ({ ...p, orderNote: e.target.value }))}
                      placeholder="Order Note (optional)"
                      className="px-2.5 py-1.5 rounded-xl border border-neutral-300 bg-white"
                    />
                  </div>
                </div>

                {/* Payment & Courier */}
                <div className="p-3 rounded-2xl bg-neutral-50 border border-neutral-200 space-y-2">
                  <span className="font-black text-neutral-700 uppercase text-[10px] block">
                    Payment &amp; Courier
                  </span>
                  <div className="grid grid-cols-3 gap-2">
                    <input
                      type="text"
                      value={invoiceDraft.paymentMethod || ""}
                      onChange={(e) => setInvoiceDraft((p) => ({ ...p, paymentMethod: e.target.value }))}
                      placeholder="Method (COD/bKash)"
                      className="px-2.5 py-1.5 rounded-xl border border-neutral-300 bg-white"
                    />
                    <input
                      type="text"
                      value={invoiceDraft.paymentStatus || ""}
                      onChange={(e) => setInvoiceDraft((p) => ({ ...p, paymentStatus: e.target.value }))}
                      placeholder="Status (PAID/PENDING)"
                      className="px-2.5 py-1.5 rounded-xl border border-neutral-300 bg-white"
                    />
                    <input
                      type="text"
                      value={invoiceDraft.paymentTrxId || ""}
                      onChange={(e) => setInvoiceDraft((p) => ({ ...p, paymentTrxId: e.target.value }))}
                      placeholder="TrxID"
                      className="px-2.5 py-1.5 rounded-xl border border-neutral-300 bg-white font-mono"
                    />
                  </div>
                  <div className="grid grid-cols-2 gap-2">
                    <input
                      type="text"
                      value={invoiceDraft.courierProvider || ""}
                      onChange={(e) => setInvoiceDraft((p) => ({ ...p, courierProvider: e.target.value }))}
                      placeholder="Courier (Steadfast/Pathao)"
                      className="px-2.5 py-1.5 rounded-xl border border-neutral-300 bg-white"
                    />
                    <input
                      type="text"
                      value={invoiceDraft.trackingId || ""}
                      onChange={(e) => setInvoiceDraft((p) => ({ ...p, trackingId: e.target.value }))}
                      placeholder="Tracking ID"
                      className="px-2.5 py-1.5 rounded-xl border border-neutral-300 bg-white font-mono"
                    />
                  </div>
                </div>

                {/* Product Line Items */}
                <div className="p-3 rounded-2xl bg-neutral-50 border border-neutral-200 space-y-2.5">
                  <div className="flex items-center justify-between">
                    <span className="font-black text-neutral-700 uppercase text-[10px]">
                      Product Line Items ({invoiceDraft.items?.length || 0})
                    </span>
                    <button
                      type="button"
                      onClick={handleAddLineItem}
                      className="px-2.5 py-1 rounded-lg bg-neutral-900 text-white font-bold text-[11px] flex items-center gap-1 cursor-pointer"
                    >
                      <Plus className="w-3 h-3" />
                      <span>Add Product</span>
                    </button>
                  </div>

                  <div className="space-y-2">
                    {(invoiceDraft.items || []).map((item, idx) => (
                      <div key={item.id || idx} className="p-2.5 rounded-xl bg-white border border-neutral-200 space-y-2">
                        <div className="flex items-center justify-between gap-2">
                          <input
                            type="text"
                            value={item.name || ""}
                            onChange={(e) => handleUpdateLineItem(idx, { name: e.target.value })}
                            placeholder="Product Name"
                            className="flex-1 px-2.5 py-1 rounded-lg border border-neutral-300 font-semibold"
                          />
                          {(invoiceDraft.items || []).length > 1 && (
                            <button
                              type="button"
                              onClick={() => handleRemoveLineItem(idx)}
                              className="p-1.5 rounded-lg text-rose-600 hover:bg-rose-50 cursor-pointer"
                              title="Remove item"
                            >
                              <Trash2 className="w-3.5 h-3.5" />
                            </button>
                          )}
                        </div>
                        <div className="grid grid-cols-3 gap-2">
                          <input
                            type="text"
                            value={item.sku || ""}
                            onChange={(e) => handleUpdateLineItem(idx, { sku: e.target.value })}
                            placeholder="SKU"
                            className="px-2 py-1 rounded-lg border border-neutral-300 font-mono"
                          />
                          <input
                            type="number"
                            min="0"
                            value={item.price ?? 0}
                            onChange={(e) => handleUpdateLineItem(idx, { price: Number(e.target.value) || 0 })}
                            placeholder="Price"
                            className="px-2 py-1 rounded-lg border border-neutral-300 font-bold"
                          />
                          <input
                            type="number"
                            min="1"
                            value={item.quantity ?? 1}
                            onChange={(e) =>
                              handleUpdateLineItem(idx, { quantity: Math.max(1, parseInt(e.target.value, 10) || 1) })
                            }
                            placeholder="Qty"
                            className="px-2 py-1 rounded-lg border border-neutral-300 font-bold text-center"
                          />
                        </div>
                      </div>
                    ))}
                  </div>

                  <div className="grid grid-cols-2 gap-2 pt-1">
                    <div>
                      <label className="block font-bold text-neutral-700 mb-1">Delivery Fee (৳)</label>
                      <input
                        type="number"
                        min="0"
                        value={invoiceDraft.deliveryFee ?? 0}
                        onChange={(e) =>
                          setInvoiceDraft((prev) => ({
                            ...prev,
                            ...recalcInvoiceTotals(prev.items, Number(e.target.value) || 0, prev.discount),
                          }))
                        }
                        className="w-full px-2.5 py-1.5 rounded-xl border border-neutral-300 bg-white font-bold"
                      />
                    </div>
                    <div>
                      <label className="block font-bold text-neutral-700 mb-1">Discount (৳)</label>
                      <input
                        type="number"
                        min="0"
                        value={invoiceDraft.discount ?? 0}
                        onChange={(e) =>
                          setInvoiceDraft((prev) => ({
                            ...prev,
                            ...recalcInvoiceTotals(prev.items, prev.deliveryFee, Number(e.target.value) || 0),
                          }))
                        }
                        className="w-full px-2.5 py-1.5 rounded-xl border border-neutral-300 bg-white font-bold"
                      />
                    </div>
                  </div>
                </div>
              </div>
            )}
          </div>
        </div>

        {/* RIGHT PANEL: Real-Time Printable Invoice Preview */}
        <div className="xl:col-span-7 h-full min-h-0 flex flex-col print:col-span-12 print:block print:h-auto">
          <div className="flex-1 min-h-0 overflow-y-auto bg-neutral-200/70 p-3 sm:p-4 rounded-2xl border border-neutral-300/70 print:bg-white print:p-0 print:border-none print:rounded-none print:overflow-visible">
            <div className="bg-white rounded-none shadow-lg overflow-hidden print:shadow-none print:border-none print:rounded-none print:overflow-visible">
              <InvoiceSheetRenderer
                invoiceData={invoiceDraft}
                themeConfig={themeConfig}
                configOverride={configDraft}
              />
            </div>
          </div>
        </div>
      </div>

      {/* Media Picker Modal for Logo, Overlay Image, or Soft Signature */}
      <MediaPickerModal
        isOpen={Boolean(mediaPickerTarget)}
        onClose={() => setMediaPickerTarget(null)}
        defaultFolder="branding"
        uploadFolder="branding"
        title={
          mediaPickerTarget === "signature"
            ? "Select Signature Image"
            : mediaPickerTarget === "overlay"
            ? "Select Watermark / Overlay Image"
            : "Select Invoice Brand Logo"
        }
        onSelect={(url) => {
          const picked = Array.isArray(url) ? url[0] : url;
          if (!picked) return;
          if (mediaPickerTarget === "logo") updateCfg({ showIcon: true, customLogoUrl: picked });
          if (mediaPickerTarget === "overlay") updateCfg({ overlayEnabled: true, overlayType: "image", overlayImageUrl: picked });
          if (mediaPickerTarget === "signature") updateCfg({ showSignature: true, signatureImageUrl: picked });
          setMediaPickerTarget(null);
        }}
      />
    </div>
  );
};

export default AdminInvoiceGenerator;

