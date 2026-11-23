import React from "react";
import { formatBDT } from "../../utils/bangladesh";
import { resolveInvoiceConfig } from "../../utils/invoiceTemplates";

/**
 * Unified printable invoice sheet supporting 10 modern templates,
 * optional shop icon/tagline/contact fields, separate Invoice ID vs Order ID,
 * rotatable text/image background watermark overlay, editable Terms & Conditions,
 * and soft-copy Authorized Signature image.
 */
export const InvoiceSheetRenderer = ({
  invoiceData,
  themeConfig,
  configOverride = null,
}) => {
  if (!invoiceData) return null;

  const cfg = configOverride || resolveInvoiceConfig(themeConfig);
  const shop = themeConfig?.shop || {};

  const shopName = (cfg.shopNameOverride || shop.name || shop.shopName || "Store").trim();
  const tagline = cfg.showTagline
    ? String(cfg.taglineOverride !== "" ? cfg.taglineOverride : (shop.tagline || "")).trim()
    : "";
  const address = cfg.showAddress
    ? String(cfg.addressOverride !== "" ? cfg.addressOverride : (shop.address || "")).trim()
    : "";
  const hotline = cfg.showHotline
    ? String(cfg.hotlineOverride !== "" ? cfg.hotlineOverride : (shop.hotline || "")).trim()
    : "";
  const email = cfg.showEmail
    ? String(cfg.emailOverride !== "" ? cfg.emailOverride : (shop.supportEmail || "")).trim()
    : "";

  // Icon / Logo strictly hidden when showIcon is false
  const iconUrl = cfg.showIcon ? (cfg.customLogoUrl || shop.logoUrl || "").trim() : "";

  const templateId = cfg.templateId || "classic-emerald";
  const accentColor = cfg.accentColor || "#065f46";

  const overlayAngle = Number(cfg.overlayAngle ?? -35);
  const overlayOpacity = Math.min(0.6, Math.max(0.01, (Number(cfg.overlayOpacity ?? 8) || 8) / 100));
  const overlaySize = Math.max(16, Number(cfg.overlaySize ?? 54) || 54);
  const overlayText = (cfg.overlayText || shopName || "INVOICE").trim();

  const isDarkBanner = templateId === "modern-slate" || templateId === "royal-navy";
  const isGradientBanner = templateId === "teal-commerce" || templateId === "cyber-indigo";
  const isLeftStripe = templateId === "sidebar-stripe";
  const isBoxedLedger = templateId === "formal-ledger";
  const isBoutique = templateId === "boutique-warm";
  const isMinimal = templateId === "minimal-mono";
  const isCompact = templateId === "compact-thermal";

  const headerBgStyle = isDarkBanner
    ? { backgroundColor: templateId === "royal-navy" ? "#0f172a" : "#111827", color: "#ffffff" }
    : isGradientBanner
    ? {
        background:
          templateId === "teal-commerce"
            ? "linear-gradient(135deg, #065f46 0%, #0d9488 100%)"
            : "linear-gradient(135deg, #312e81 0%, #4f46e5 100%)",
        color: "#ffffff",
      }
    : undefined;

  const containerStyle = {
    backgroundColor: isBoutique ? "#fffdf7" : "#ffffff",
  };

  const renderBrandIdentity = (lightText = false) => (
    <div>
      <div className="flex items-center gap-2.5">
        {cfg.showIcon && (
          iconUrl ? (
            <img
              src={iconUrl}
              alt={shopName}
              className="h-10 w-auto max-w-[160px] object-contain"
            />
          ) : (
            <div
              className="w-9 h-9 rounded-xl flex items-center justify-center font-extrabold text-lg shrink-0"
              style={{
                backgroundColor: lightText ? "rgba(255,255,255,0.18)" : accentColor,
                color: "#ffffff",
                border: lightText ? "1px solid rgba(255,255,255,0.28)" : undefined,
              }}
            >
              {shopName ? shopName.charAt(0).toUpperCase() : "S"}
            </div>
          )
        )}
        <div>
          <h1
            className={`text-xl font-black tracking-tight ${
              isBoutique ? "font-serif" : ""
            } ${lightText ? "text-white" : "text-neutral-900"}`}
          >
            {shopName}
          </h1>
          {tagline && (
            <p className={`text-[10px] ${lightText ? "text-white/80" : "text-neutral-500"}`}>
              {tagline}
            </p>
          )}
        </div>
      </div>

      {(address || hotline || email) && (
        <p className={`text-xs mt-2 leading-relaxed ${lightText ? "text-white/80" : "text-neutral-500"}`}>
          {address && (
            <>
              {address}
              {(hotline || email) && <br />}
            </>
          )}
          {[hotline ? `Hotline: ${hotline}` : "", email ? `Email: ${email}` : ""]
            .filter(Boolean)
            .join(" | ")}
        </p>
      )}
    </div>
  );

  const renderInvoiceTitleBlock = (lightText = false) => (
    <div className="text-right shrink-0">
      <span
        className={`text-2xl font-black tracking-tight block ${
          isMinimal ? "tracking-[0.22em] text-lg uppercase" : ""
        } ${lightText ? "text-white" : "text-neutral-900"}`}
      >
        {cfg.invoiceTitle || "INVOICE"}
      </span>
      <span
        className="font-mono text-sm font-bold block mt-0.5"
        style={{ color: lightText ? (templateId === "royal-navy" ? "#fbbf24" : "#a7f3d0") : accentColor }}
      >
        {invoiceData.invoiceNumber}
      </span>
      {cfg.showOrderIdRef !== false && invoiceData.orderId && (
        <span className={`font-mono text-[11px] block mt-0.5 ${lightText ? "text-white/75" : "text-neutral-500"}`}>
          Order Ref: #{invoiceData.orderId}
        </span>
      )}
      <span className={`text-xs block mt-1 ${lightText ? "text-white/80" : "text-neutral-400"}`}>
        Date: {invoiceData.dateText}
      </span>
    </div>
  );

  const padClass = isCompact ? "p-4 sm:p-5" : "p-6 sm:p-8";

  return (
    <div
      id="amardokan-printable-invoice"
      style={containerStyle}
      className={`relative w-full overflow-hidden rounded-none text-neutral-900 font-sans print:shadow-none print:border-none print:rounded-none ${padClass}`}
    >
      {/* Background Watermark / Overlay Layer (Supports Text OR Image + Arbitrary Rotation Angle) */}
      {cfg.overlayEnabled && (
        <div
          aria-hidden="true"
          className="absolute inset-0 flex items-center justify-center pointer-events-none select-none overflow-hidden z-0"
          style={{ printColorAdjust: "exact", WebkitPrintColorAdjust: "exact" }}
        >
          {cfg.overlayType === "image" && cfg.overlayImageUrl ? (
            <img
              src={cfg.overlayImageUrl}
              alt=""
              style={{
                transform: `rotate(${overlayAngle}deg)`,
                opacity: overlayOpacity,
                maxWidth: `${Math.min(90, Math.max(25, overlaySize * 1.15))}%`,
                maxHeight: `${Math.min(85, Math.max(20, overlaySize * 1.1))}%`,
                objectFit: "contain",
              }}
            />
          ) : (
            <span
              className="font-black uppercase tracking-widest text-center whitespace-nowrap"
              style={{
                transform: `rotate(${overlayAngle}deg)`,
                opacity: overlayOpacity,
                fontSize: `${overlaySize}px`,
                color: cfg.overlayColor || "#0f172a",
                lineHeight: 1.1,
              }}
            >
              {overlayText}
            </span>
          )}
        </div>
      )}

      {/* Main Content Layer */}
      <div className="relative z-10 space-y-5">
        {/* Top Accent Header Bar for Left Accent Stripe Template (Clean, without edge border) */}
        {isLeftStripe && (
          <div className="h-1.5 w-full" style={{ backgroundColor: accentColor }} />
        )}
        {/* Header Zone (Adapts cleanly across all 10 templates) */}
        {isDarkBanner || isGradientBanner ? (
          <div
            style={headerBgStyle}
            className="flex flex-wrap justify-between items-start gap-4 p-5 rounded-none"
          >
            {renderBrandIdentity(true)}
            {renderInvoiceTitleBlock(true)}
          </div>
        ) : (
          <div
            className={`flex flex-wrap justify-between items-start gap-4 ${
              isMinimal || isBoutique ? "pb-4 border-b" : ""
            }`}
            style={{
              borderColor: isBoutique ? "#f59e0b66" : isMinimal ? "#171717" : undefined,
            }}
          >
            {renderBrandIdentity(false)}
            {renderInvoiceTitleBlock(false)}
          </div>
        )}

        {/* KPI Highlight Strip for Template 5 (Teal Commerce) or 4 (Royal Navy Gold) */}
        {(templateId === "teal-commerce" || templateId === "royal-navy") && (
          <div
            className="grid grid-cols-3 gap-3 p-3 rounded-none border text-xs"
            style={{
              backgroundColor: templateId === "royal-navy" ? "#fffbeb" : "#f0fdfa",
              borderColor: templateId === "royal-navy" ? "#fde68a" : "#99f6e4",
            }}
          >
            <div>
              <span className="text-[10px] font-bold uppercase text-neutral-500 block">Invoice No</span>
              <span className="font-mono font-extrabold text-neutral-900">{invoiceData.invoiceNumber}</span>
            </div>
            <div>
              <span className="text-[10px] font-bold uppercase text-neutral-500 block">Payment Status</span>
              <span className="font-extrabold text-neutral-900">{invoiceData.paymentStatus}</span>
            </div>
            <div className="text-right">
              <span className="text-[10px] font-bold uppercase text-neutral-500 block">Amount Due / Total</span>
              <span className="font-black text-sm" style={{ color: accentColor }}>
                {formatBDT(invoiceData.total)}
              </span>
            </div>
          </div>
        )}

        {/* Customer Details & Shipping / Payment Details (Classic 2-Col Structure) */}
        <div
          className={`grid grid-cols-1 sm:grid-cols-2 gap-4 text-xs rounded-none ${
            isBoxedLedger
              ? "border border-neutral-400 p-4 bg-neutral-50/70"
              : isMinimal
              ? "py-4 border-y border-neutral-200"
              : isBoutique
              ? "p-4 bg-amber-50/50 border border-amber-200/80"
              : templateId === "cyber-indigo"
              ? "p-4 bg-indigo-50/50 border border-indigo-200"
              : "p-4 bg-neutral-50/90 border border-neutral-200"
          }`}
        >
          <div>
            <span className="text-[10px] font-bold uppercase tracking-wider text-neutral-400 block mb-1">
              Customer Details:
            </span>
            <p className="font-bold text-sm text-neutral-900">{invoiceData.customerName}</p>
            {invoiceData.customerPhone && (
              <p className="font-mono font-medium text-neutral-700">{invoiceData.customerPhone}</p>
            )}
            {invoiceData.customerEmail && (
              <p className="text-[11px] text-neutral-600">{invoiceData.customerEmail}</p>
            )}
            {invoiceData.customerAddress && (
              <p className="text-neutral-600 mt-0.5 leading-snug">{invoiceData.customerAddress}</p>
            )}
            {invoiceData.orderNote && (
              <p className="text-[11px] text-amber-800 italic mt-1">
                Note: {invoiceData.orderNote}
              </p>
            )}
          </div>

          <div className="sm:border-l border-neutral-200 sm:pl-4 space-y-0.5">
            <span className="text-[10px] font-bold uppercase tracking-wider text-neutral-400 block mb-1">
              Shipping &amp; Payment Details:
            </span>
            <p className="text-neutral-700">
              Payment Method:{" "}
              <strong>
                {invoiceData.paymentMethod === "COD"
                  ? "Cash on Delivery (COD)"
                  : invoiceData.paymentMethod}
              </strong>
            </p>
            <p className="text-neutral-700">
              Payment Status:{" "}
              <span
                className={`font-bold ${
                  invoiceData.paymentStatus === "PAID" ? "text-emerald-700" : "text-amber-700"
                }`}
              >
                {invoiceData.paymentStatus}
              </span>
            </p>
            {invoiceData.paymentTrxId && (
              <p className="text-neutral-700">
                TrxID:{" "}
                <span className="font-mono font-semibold text-emerald-800 bg-emerald-50 px-1 py-0.5 rounded">
                  {invoiceData.paymentTrxId}
                </span>
              </p>
            )}
            {invoiceData.courierProvider ? (
              <div className="mt-1 text-neutral-700">
                <p>
                  Courier: <strong className="capitalize">{invoiceData.courierProvider}</strong>
                </p>
                {invoiceData.trackingId && (
                  <p className="font-mono text-[11px]">Tracking: {invoiceData.trackingId}</p>
                )}
              </div>
            ) : (
              <p className="text-neutral-500 italic mt-1">Courier assignment pending</p>
            )}
          </div>
        </div>

        {/* Items Table */}
        <div className="overflow-x-auto">
          <table
            className={`w-full text-left text-xs ${
              isBoxedLedger ? "border border-neutral-400 border-collapse" : ""
            }`}
          >
            <thead
              className={`font-bold border-y ${
                isMinimal
                  ? "bg-transparent text-neutral-900 border-neutral-900 uppercase text-[11px]"
                  : isDarkBanner || isGradientBanner || templateId === "cyber-indigo"
                  ? "text-white border-transparent"
                  : isBoutique
                  ? "bg-amber-100/70 text-amber-950 border-amber-300"
                  : "bg-neutral-100 text-neutral-700 border-neutral-300"
              }`}
              style={
                isDarkBanner || isGradientBanner || templateId === "cyber-indigo"
                  ? { backgroundColor: accentColor }
                  : undefined
              }
            >
              <tr>
                <th className={`${isCompact ? "py-2 px-2.5" : "py-2.5 px-3"} ${isBoxedLedger ? "border border-neutral-300" : ""}`}>SL</th>
                <th className={`${isCompact ? "py-2 px-2.5" : "py-2.5 px-3"} ${isBoxedLedger ? "border border-neutral-300" : ""}`}>Item &amp; Description</th>
                <th className={`${isCompact ? "py-2 px-2.5" : "py-2.5 px-3"} ${isBoxedLedger ? "border border-neutral-300" : ""}`}>SKU</th>
                <th className={`${isCompact ? "py-2 px-2.5" : "py-2.5 px-3"} text-right ${isBoxedLedger ? "border border-neutral-300" : ""}`}>Unit Price</th>
                <th className={`${isCompact ? "py-2 px-2.5" : "py-2.5 px-3"} text-center ${isBoxedLedger ? "border border-neutral-300" : ""}`}>Qty</th>
                <th className={`${isCompact ? "py-2 px-2.5" : "py-2.5 px-3"} text-right ${isBoxedLedger ? "border border-neutral-300" : ""}`}>Total</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-neutral-200">
              {(invoiceData.items || []).map((item, idx) => (
                <tr key={item.id || idx}>
                  <td className={`${isCompact ? "py-2 px-2.5" : "py-3 px-3"} text-neutral-400 ${isBoxedLedger ? "border border-neutral-300" : ""}`}>
                    {idx + 1}
                  </td>
                  <td className={`${isCompact ? "py-2 px-2.5" : "py-3 px-3"} ${isBoxedLedger ? "border border-neutral-300" : ""}`}>
                    <span className="font-semibold text-neutral-900 block">{item.name}</span>
                    {item.variant && <span className="text-[11px] text-neutral-500">{item.variant}</span>}
                  </td>
                  <td className={`${isCompact ? "py-2 px-2.5" : "py-3 px-3"} font-mono text-neutral-500 ${isBoxedLedger ? "border border-neutral-300" : ""}`}>
                    {item.sku || "—"}
                  </td>
                  <td className={`${isCompact ? "py-2 px-2.5" : "py-3 px-3"} text-right ${isBoxedLedger ? "border border-neutral-300" : ""}`}>
                    {formatBDT(item.price)}
                  </td>
                  <td className={`${isCompact ? "py-2 px-2.5" : "py-3 px-3"} text-center font-bold ${isBoxedLedger ? "border border-neutral-300" : ""}`}>
                    {item.quantity}
                  </td>
                  <td className={`${isCompact ? "py-2 px-2.5" : "py-3 px-3"} text-right font-bold text-neutral-900 ${isBoxedLedger ? "border border-neutral-300" : ""}`}>
                    {formatBDT((Number(item.price) || 0) * Math.max(1, Number(item.quantity) || 1))}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        {/* Financial Calculation */}
        <div className="flex justify-end pt-2">
          <div className="w-68 space-y-2 text-xs">
            <div className="flex justify-between text-neutral-600">
              <span>Subtotal</span>
              <span className="font-semibold text-neutral-900">{formatBDT(invoiceData.subtotal)}</span>
            </div>
            <div className="flex justify-between text-neutral-600">
              <span>
                Delivery Fee{invoiceData.district ? ` (${invoiceData.district})` : ""}
              </span>
              <span className="font-semibold text-neutral-900">{formatBDT(invoiceData.deliveryFee)}</span>
            </div>
            {Number(invoiceData.discount || 0) > 0 && (
              <div className="flex justify-between text-emerald-700">
                <span>Discount</span>
                <span>-{formatBDT(invoiceData.discount)}</span>
              </div>
            )}
            <div
              className="pt-2 border-t-2 flex justify-between text-sm font-black text-neutral-900"
              style={{ borderColor: isMinimal || isDarkBanner ? "#171717" : accentColor }}
            >
              <span>Total Payable</span>
              <span className="text-base" style={{ color: accentColor }}>
                {formatBDT(invoiceData.total)}
              </span>
            </div>

            {invoiceData.paymentMethod === "COD" && (
              <div className="p-2 rounded bg-amber-50 border border-amber-200 text-[11px] text-amber-900 font-bold text-center">
                Collection Amount: {formatBDT(invoiceData.total)}
              </div>
            )}
          </div>
        </div>

        {/* Footer: Editable Terms & Conditions + Soft-Copy Authorized Signature */}
        {(cfg.showTerms || cfg.showSignature) && (
          <div className="pt-5 border-t border-neutral-200 grid grid-cols-1 sm:grid-cols-2 gap-6 items-end text-xs text-neutral-500">
            <div>
              {cfg.showTerms && (cfg.termsTitle || cfg.termsText) && (
                <>
                  {cfg.termsTitle && (
                    <p className="font-bold text-neutral-700">{cfg.termsTitle}</p>
                  )}
                  {cfg.termsText && (
                    <p className="text-[11px] leading-relaxed whitespace-pre-line">
                      {cfg.termsText}
                    </p>
                  )}
                </>
              )}
            </div>
            <div className="text-right">
              {cfg.showSignature && (
                <>
                  {cfg.signatureImageUrl && (
                    <img
                      src={cfg.signatureImageUrl}
                      alt={cfg.signatureLabel || "Authorized Signature"}
                      className="h-14 w-auto max-w-[180px] object-contain ml-auto mb-1"
                    />
                  )}
                  <div className="w-40 border-b border-neutral-400 ml-auto mb-1" />
                  <p className="text-[11px] font-semibold text-neutral-600">
                    {cfg.signatureLabel || "Authorized Signature"}
                  </p>
                </>
              )}
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default InvoiceSheetRenderer;

