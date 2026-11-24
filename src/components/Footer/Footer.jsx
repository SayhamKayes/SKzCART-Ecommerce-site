import React, { useState, useEffect } from "react";
import { PhoneCall } from "lucide-react";
import { useThemeConfig } from "../frontPanel/FrontPanelContext";
import { buildBgStyle, resolveThemeText } from "../../utils/themeHelper";
import { apiClient } from "../../services/api";
import { realtimeService } from "../../services/realtime";
import codImg from "../../assets/COD.png";
import bkashImg from "../../assets/bkash.png";
import nagadImg from "../../assets/nagad2.png";
import rocketImg from "../../assets/rocket2.png";

export const Footer = () => {
  const { themeConfig, isThemeLoaded } = useThemeConfig();
  const shop = themeConfig?.shop || {};
  const shopName = isThemeLoaded ? (shop.name || "AmarDokan") : "";
  const shopLogo = isThemeLoaded ? (shop.footerLogoUrl || shop.logoUrl || "") : "";
  const activeHotline = isThemeLoaded
    ? (shop.footerHotline !== undefined
        ? String(shop.footerHotline).trim()
        : (shop.hotline !== undefined
            ? String(shop.hotline).trim()
            : (themeConfig?.header?.hotline || "")))
    : "";
  const supportEmail = isThemeLoaded
    ? (shop.footerEmail !== undefined
        ? String(shop.footerEmail).trim()
        : (shop.supportEmail || ""))
    : "";
  const deliveryNotice = isThemeLoaded
    ? resolveThemeText(
        shop.footerNotice,
        shop.footerNoticeEn,
        "Fastest nationwide delivery with secure cash on delivery across Bangladesh.",
        shop.tagline || ""
      )
    : "";
  const workingHours = isThemeLoaded
    ? resolveThemeText(
        shop.footerWorkingHours,
        shop.footerWorkingHoursEn,
        "Hours: 9:00 AM - 11:00 PM",
        ""
      )
    : "";
  const courier1 = isThemeLoaded ? (shop.footerCourier1 !== undefined ? shop.footerCourier1 : "Pathao Courier Express") : "";
  const courier2 = isThemeLoaded ? (shop.footerCourier2 !== undefined ? shop.footerCourier2 : "Steadfast Courier Service") : "";
  const courier3 = isThemeLoaded ? (shop.footerCourier3 !== undefined ? shop.footerCourier3 : "RedX Logistics") : "";
  const copyrightText = isThemeLoaded
    ? (shop.footerCopyrightText ? shop.footerCopyrightText : `© ${new Date().getFullYear()} ${shopName}. All rights reserved.`)
    : "";

  const paymentColumns = Number(themeConfig?.shop?.footerPaymentColumns) || 4;
  const showPayments = shop.footerShowPayments !== false;
  const [paymentMethods, setPaymentMethods] = useState([]);

  useEffect(() => {
    let active = true;
    const loadMethods = () => {
      apiClient.getPaymentMethods().then((list) => {
        if (active && Array.isArray(list)) setPaymentMethods(list);
      }).catch(() => {});
    };
    loadMethods();
    const unsub = realtimeService.subscribe((msg) => {
      const t = typeof msg === "string" ? msg : msg?.type;
      if (t === "PAYMENT_METHODS_UPDATED" || t === "PAYMENT_CONFIG_UPDATED") {
        loadMethods();
      }
    });
    return () => {
      active = false;
      if (typeof unsub === "function") unsub();
    };
  }, []);

  const isMethodEnabled = (id) => {
    if (!Array.isArray(paymentMethods) || paymentMethods.length === 0) return false;
    const found = paymentMethods.find((m) => String(m.method_id || "").toLowerCase() === id);
    if (!found || found.is_active === false) return false;
    if (["bkash", "nagad", "rocket"].includes(id)) {
      return Boolean(String(found.number || "").trim());
    }
    return true;
  };

  const activePaymentBadges = [
    isMethodEnabled("cod") && { id: "cod", type: "img", src: codImg, alt: "Cash on Delivery" },
    isMethodEnabled("bkash") && { id: "bkash", type: "img", src: bkashImg, alt: "bKash" },
    isMethodEnabled("nagad") && { id: "nagad", type: "img", src: nagadImg, alt: "Nagad" },
    isMethodEnabled("rocket") && { id: "rocket", type: "img", src: rocketImg, alt: "Rocket" },
    isMethodEnabled("sslcommerz") && { id: "sslcommerz", type: "text", label: "Cards / SSLCommerz" },
  ].filter(Boolean);

  const fTheme = themeConfig?.themesColors?.footer || {};
  const footerBgStyle = buildBgStyle(fTheme, "#171717");

  return (
    <footer
      style={{
        ...footerBgStyle,
        color: fTheme.textColor || undefined,
        borderTopColor: fTheme.borderTopColor || undefined,
      }}
      className="bg-neutral-900 text-neutral-400 pt-10 pb-8 border-t border-neutral-800 text-xs"
    >
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="grid grid-cols-1 sm:grid-cols-4 gap-8">
          {/* Column 1: Logo & Tagline */}
          <div className="space-y-3">
            <div className="flex items-center gap-2">
              {!isThemeLoaded ? (
                <span className="inline-block h-7 w-28 rounded-lg bg-white/10 animate-pulse" />
              ) : shopLogo ? (
                <img
                  src={shopLogo}
                  alt={`${shopName} Logo`}
                  className="h-9 sm:h-10 w-auto max-w-[170px] object-contain"
                />
              ) : (
                <span
                  style={{ color: fTheme.logoTextColor || undefined }}
                  className="text-xl font-black tracking-tight text-white"
                >
                  {shopName}
                </span>
              )}
            </div>
            {deliveryNotice && (
              <p
                style={{ color: fTheme.textColor || undefined }}
                className="text-[11px] text-neutral-400 leading-relaxed"
              >
                {deliveryNotice}
              </p>
            )}
          </div>

          {/* Column 2: Courier & Logistics */}
          <div className="space-y-2">
            <h4 style={{ color: fTheme.headingColor || undefined }} className="text-white font-bold">
              Courier & Logistics
            </h4>
            {courier1 && <p>• {courier1}</p>}
            {courier2 && <p>• {courier2}</p>}
            {courier3 && <p>• {courier3}</p>}
          </div>

          {/* Column 3: Customer Service */}
          <div className="space-y-2">
            <h4 style={{ color: fTheme.headingColor || undefined }} className="text-white font-bold">
              Customer Service
            </h4>
            {activeHotline && (
              <p className="flex items-center gap-1.5" style={{ color: fTheme.textColor || undefined }}>
                <PhoneCall className="w-3.5 h-3.5 shrink-0" style={{ color: fTheme.iconColor || fTheme.textColor || undefined }} />
                <span>{activeHotline}</span>
              </p>
            )}
            {workingHours && <p style={{ color: fTheme.textColor || undefined }}>{workingHours}</p>}
            {supportEmail && <p style={{ color: fTheme.textColor || undefined }}>{`Email: ${supportEmail}`}</p>}
          </div>

          {/* Column 4: Payment Methods (Synced Dynamically from Admin -> Payments & Gateways) */}
          {showPayments && activePaymentBadges.length > 0 ? (
            <div className="space-y-2">
              <h4 style={{ color: fTheme.headingColor || undefined }} className="text-white font-bold">
                Payment Methods
              </h4>
              <div
                className={`grid ${paymentColumns === 2
                  ? "grid-cols-2"
                  : paymentColumns === 3
                    ? "grid-cols-3"
                    : "grid-cols-4"
                  } gap-2 pt-1`}
              >
                {activePaymentBadges.map((badge) => (
                  <div
                    key={badge.id}
                    className="bg-white rounded-lg px-2 py-1 border border-neutral-700/80 shadow-xs flex items-center justify-center h-8 w-full"
                  >
                    {badge.type === "img" ? (
                      <img src={badge.src} alt={badge.alt} className="h-5 sm:h-6 w-auto object-contain" />
                    ) : (
                      <span className="text-[9px] font-black text-blue-900 tracking-tight truncate">
                        SSLCommerz
                      </span>
                    )}
                  </div>
                ))}
              </div>
            </div>
          ) : (
            <div className="hidden sm:block" />
          )}
        </div>

        {/* Grayish Horizontal Line & Centered Copyright */}
        <div
          style={{ borderTopColor: fTheme.dividerColor || undefined }}
          className="border-t border-neutral-800 mt-8 pt-6 text-center"
        >
          <p
            style={{ color: fTheme.copyrightTextColor || fTheme.textColor || undefined }}
            className="text-[11px] text-neutral-400 tracking-wide"
          >
            {copyrightText} | Powered by{" "}
            <a
              href="https://theskzlab.com/"
              target="_blank"
              rel="noopener noreferrer"
              style={{ color: fTheme.linkColor || undefined }}
              className="text-neutral-300 hover:text-emerald-400 font-medium transition-colors underline underline-offset-2 decoration-neutral-600"
            >
              SKzLAB
            </a>
          </p>
        </div>
      </div>
    </footer>
  );
};

export default Footer;
