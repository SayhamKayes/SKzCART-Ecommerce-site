import React, { useRef, useState } from "react";
import {
  Building2,
  PhoneCall,
  Mail,
  MapPin,
  Image as ImageIcon,
  Globe,
  Sparkles,
  MessageCircle,
  ExternalLink,
  CheckCircle2,
  Upload,
  Trash2,
  Loader2
} from "lucide-react";
import { useLanguage } from "../../../Context/LanguageContext";
import { apiClient } from "../../../services/api";
import { MediaPickerModal } from "../../admin/MediaPickerModal";

export const ShopCustomizer = ({ config, onChange, onNavigateToAdminShopDetails }) => {
  const { isEnglish } = useLanguage();
  const shop = config.shop || {};
  const logoInputRef = useRef(null);
  const faviconInputRef = useRef(null);
  const [uploadingField, setUploadingField] = useState(null);
  const [mediaPickerField, setMediaPickerField] = useState(null);

  const handleUpdate = (field, value) => {
    onChange("shop", { [field]: value });
  };

  const handleFileUpload = async (e, field) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setUploadingField(field);
    try {
      const res = await apiClient.uploadProductImage(file);
      if (res?.url) {
        handleUpdate(field, res.url);
      }
    } catch (err) {
      console.error("Failed to upload brand asset:", err);
    } finally {
      setUploadingField(null);
      e.target.value = "";
    }
  };

  const handleRemoveAsset = async (field, currentUrl) => {
    setUploadingField(field);
    try {
      if (currentUrl && (currentUrl.includes("cloudinary.com") || currentUrl.includes("/media/products/"))) {
        try {
          await apiClient.deleteProductImage(currentUrl);
        } catch (err) {
          console.warn("Media asset cleanup warning:", err);
        }
      }
      handleUpdate(field, "");
    } finally {
      setUploadingField(null);
    }
  };

  return (
    <div className="space-y-6">
      {/* Header Info Banner */}
      <div className="bg-gradient-to-r from-emerald-950/60 via-neutral-900 to-neutral-950 p-5 rounded-2xl border border-emerald-800/40 shadow-md">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <h3 className="text-sm font-bold text-white flex items-center gap-2">
              <Building2 className="w-4 h-4 text-emerald-400" />
              <span>{"Store Identity & Global Branding"}</span>
            </h3>
            <p className="text-xs text-neutral-400 mt-1">
              {"Manage store name, contact hotlines, logos, and favicons. Changes synchronize across storefront, headers, footers, invoices, and tracking in real-time."}
            </p>
          </div>
          <div className="flex items-center gap-2">
            <span className="px-2.5 py-1 rounded-full bg-emerald-500/20 text-emerald-400 border border-emerald-500/30 text-[10px] font-bold flex items-center gap-1.5 shrink-0">
              <Sparkles className="w-3 h-3" />
              <span>{"0ms Live Sync"}</span>
            </span>
          </div>
        </div>
      </div>

      {/* Basic Identity: Name & Tagline */}
      <div className="bg-neutral-900 p-5 rounded-2xl border border-neutral-800 space-y-4 text-xs">
        <h4 className="text-xs font-bold text-white uppercase tracking-wider flex items-center gap-2">
          <Building2 className="w-3.5 h-3.5 text-emerald-400" />
          <span>{"Shop Name & Tagline"}</span>
        </h4>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <label className="block text-neutral-300 font-semibold mb-1.5">
              {"Shop Name (Replaces AmarDokan everywhere)"}
            </label>
            <input
              type="text"
              value={shop.name || ""}
              onChange={(e) => handleUpdate("name", e.target.value)}
              placeholder="AmarDokan"
              className="w-full bg-neutral-950 border border-neutral-800 rounded-xl px-3.5 py-2.5 text-white text-xs focus:outline-none focus:border-emerald-500 font-semibold"
            />
          </div>

          <div>
            <label className="block text-neutral-300 font-semibold mb-1.5">
              {"Store Tagline / Slogan"}
            </label>
            <input
              type="text"
              value={shop.tagline || ""}
              onChange={(e) => handleUpdate("tagline", e.target.value)}
              placeholder="Bangladesh Native E-Commerce"
              className="w-full bg-neutral-950 border border-neutral-800 rounded-xl px-3.5 py-2.5 text-white text-xs focus:outline-none focus:border-emerald-500"
            />
          </div>
        </div>
      </div>

      {/* Contact Channels: Hotline, WhatsApp, Email, Address */}
      <div className="bg-neutral-900 p-5 rounded-2xl border border-neutral-800 space-y-4 text-xs">
        <h4 className="text-xs font-bold text-white uppercase tracking-wider flex items-center gap-2">
          <PhoneCall className="w-3.5 h-3.5 text-amber-400" />
          <span>{"Helplines & Customer Support"}</span>
        </h4>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          <div>
            <label className="block text-neutral-300 font-semibold mb-1.5 flex items-center gap-1.5">
              <PhoneCall className="w-3.5 h-3.5 text-emerald-400" />
              <span>{"Primary Hotline"}</span>
            </label>
            <input
              type="text"
              value={shop.hotline || ""}
              onChange={(e) => handleUpdate("hotline", e.target.value)}
              placeholder="09612345678"
              className="w-full bg-neutral-950 border border-neutral-800 rounded-xl px-3.5 py-2.5 text-white text-xs font-mono focus:outline-none focus:border-emerald-500"
            />
          </div>

          <div>
            <label className="block text-neutral-300 font-semibold mb-1.5 flex items-center gap-1.5">
              <MessageCircle className="w-3.5 h-3.5 text-emerald-400" />
              <span>{"WhatsApp Support Number"}</span>
            </label>
            <input
              type="text"
              value={shop.whatsappNumber || ""}
              onChange={(e) => handleUpdate("whatsappNumber", e.target.value)}
              placeholder="01712345678"
              className="w-full bg-neutral-950 border border-neutral-800 rounded-xl px-3.5 py-2.5 text-white text-xs font-mono focus:outline-none focus:border-emerald-500"
            />
          </div>

          <div>
            <label className="block text-neutral-300 font-semibold mb-1.5 flex items-center gap-1.5">
              <Mail className="w-3.5 h-3.5 text-blue-400" />
              <span>{"Support Email"}</span>
            </label>
            <input
              type="email"
              value={shop.supportEmail || ""}
              onChange={(e) => handleUpdate("supportEmail", e.target.value)}
              placeholder="support@amardokan.com"
              className="w-full bg-neutral-950 border border-neutral-800 rounded-xl px-3.5 py-2.5 text-white text-xs focus:outline-none focus:border-emerald-500"
            />
          </div>
        </div>

        <div>
          <label className="block text-neutral-300 font-semibold mb-1.5 flex items-center gap-1.5">
            <MapPin className="w-3.5 h-3.5 text-rose-400" />
            <span>{"Showroom / Office Address"}</span>
          </label>
          <input
            type="text"
            value={shop.address || ""}
            onChange={(e) => handleUpdate("address", e.target.value)}
            placeholder="AmarDokan Head Office, Dhanmondi 27, Dhaka, Bangladesh"
            className="w-full bg-neutral-950 border border-neutral-800 rounded-xl px-3.5 py-2.5 text-white text-xs focus:outline-none focus:border-emerald-500"
          />
        </div>
      </div>

      {/* Visual Branding: Logo & Favicon with Live Previews */}
      <div className="bg-neutral-900 p-5 rounded-2xl border border-neutral-800 space-y-5 text-xs">
        <h4 className="text-xs font-bold text-white uppercase tracking-wider flex items-center gap-2">
          <ImageIcon className="w-3.5 h-3.5 text-purple-400" />
          <span>{"Logo & Favicon Visual Assets"}</span>
        </h4>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {/* Logo Card */}
          <div className="p-4 rounded-xl bg-neutral-950 border border-neutral-800 space-y-3">
            <div className="flex items-center justify-between gap-2">
              <span className="font-bold text-white flex items-center gap-1.5">
                <ImageIcon className="w-3.5 h-3.5 text-emerald-400" />
                <span>{"Store Brand Logo"}</span>
              </span>
              <div className="flex items-center gap-1.5">
                {shop.logoUrl && (
                  <button
                    type="button"
                    disabled={uploadingField === "logoUrl"}
                    onClick={() => handleRemoveAsset("logoUrl", shop.logoUrl)}
                    className="px-2.5 py-1 rounded-lg bg-red-500/15 hover:bg-red-500/25 text-red-300 border border-red-500/30 text-[11px] font-medium flex items-center gap-1 cursor-pointer transition-colors disabled:opacity-50"
                  >
                    {uploadingField === "logoUrl" ? <Loader2 className="w-3 h-3 animate-spin" /> : <Trash2 className="w-3 h-3" />}
                    <span>{"Remove"}</span>
                  </button>
                )}
                <button
                  type="button"
                  disabled={uploadingField === "logoUrl"}
                  onClick={() => setMediaPickerField("logoUrl")}
                  className="px-2.5 py-1 rounded-lg bg-emerald-500/15 hover:bg-emerald-500/25 text-emerald-300 border border-emerald-500/30 text-[11px] font-medium flex items-center gap-1 cursor-pointer transition-colors"
                >
                  <ImageIcon className="w-3 h-3" />
                  <span>{"Media"}</span>
                </button>
                <button
                  type="button"
                  disabled={uploadingField === "logoUrl"}
                  onClick={() => logoInputRef.current?.click()}
                  className="px-2.5 py-1 rounded-lg bg-neutral-800 hover:bg-neutral-700 text-neutral-200 text-[11px] font-medium flex items-center gap-1.5 cursor-pointer transition-colors disabled:opacity-50"
                >
                  {uploadingField === "logoUrl" ? <Loader2 className="w-3 h-3 animate-spin text-emerald-400" /> : <Upload className="w-3 h-3 text-emerald-400" />}
                  <span>{"Upload File"}</span>
                </button>
              </div>
            </div>

            <input
              type="file"
              ref={logoInputRef}
              accept="image/*"
              className="hidden"
              onChange={(e) => handleFileUpload(e, "logoUrl")}
            />

            <input
              type="text"
              value={shop.logoUrl || ""}
              onChange={(e) => handleUpdate("logoUrl", e.target.value)}
              placeholder="https://example.com/logo.png"
              className="w-full bg-neutral-900 border border-neutral-700 rounded-xl px-3 py-2 text-white text-xs focus:outline-none focus:border-emerald-500 font-mono"
            />

            {/* Logo Preview Box */}
            <div className="p-3 bg-neutral-900/80 rounded-xl border border-neutral-800/80 flex items-center justify-between gap-3">
              <span className="text-[11px] text-neutral-400">{"Live Preview:"}</span>
              <div className="h-10 px-4 bg-white/5 rounded-lg border border-white/10 flex items-center justify-center">
                {shop.logoUrl ? (
                  <img src={shop.logoUrl} alt="Logo Preview" className="h-7 w-auto object-contain max-w-[140px]" />
                ) : (
                  <span className="text-sm font-black tracking-tight text-white">
                    {shop.name || "AmarDokan"}
                  </span>
                )}
              </div>
            </div>
          </div>

          {/* Favicon Card & Mockup */}
          <div className="p-4 rounded-xl bg-neutral-950 border border-neutral-800 space-y-3">
            <div className="flex items-center justify-between gap-2">
              <span className="font-bold text-white flex items-center gap-1.5">
                <Globe className="w-3.5 h-3.5 text-blue-400" />
                <span>{"Browser Tab Favicon"}</span>
              </span>
              <div className="flex items-center gap-1.5">
                {shop.faviconUrl && (
                  <button
                    type="button"
                    disabled={uploadingField === "faviconUrl"}
                    onClick={() => handleRemoveAsset("faviconUrl", shop.faviconUrl)}
                    className="px-2.5 py-1 rounded-lg bg-red-500/15 hover:bg-red-500/25 text-red-300 border border-red-500/30 text-[11px] font-medium flex items-center gap-1 cursor-pointer transition-colors disabled:opacity-50"
                  >
                    {uploadingField === "faviconUrl" ? <Loader2 className="w-3 h-3 animate-spin" /> : <Trash2 className="w-3 h-3" />}
                    <span>{"Remove"}</span>
                  </button>
                )}
                <button
                  type="button"
                  disabled={uploadingField === "faviconUrl"}
                  onClick={() => setMediaPickerField("faviconUrl")}
                  className="px-2.5 py-1 rounded-lg bg-blue-500/15 hover:bg-blue-500/25 text-blue-300 border border-blue-500/30 text-[11px] font-medium flex items-center gap-1 cursor-pointer transition-colors"
                >
                  <ImageIcon className="w-3 h-3" />
                  <span>{"Media"}</span>
                </button>
                <button
                  type="button"
                  disabled={uploadingField === "faviconUrl"}
                  onClick={() => faviconInputRef.current?.click()}
                  className="px-2.5 py-1 rounded-lg bg-neutral-800 hover:bg-neutral-700 text-neutral-200 text-[11px] font-medium flex items-center gap-1.5 cursor-pointer transition-colors disabled:opacity-50"
                >
                  {uploadingField === "faviconUrl" ? <Loader2 className="w-3 h-3 animate-spin text-blue-400" /> : <Upload className="w-3 h-3 text-blue-400" />}
                  <span>{"Upload File"}</span>
                </button>
              </div>
            </div>

            <input
              type="file"
              ref={faviconInputRef}
              accept="image/*"
              className="hidden"
              onChange={(e) => handleFileUpload(e, "faviconUrl")}
            />

            <input
              type="text"
              value={shop.faviconUrl || ""}
              onChange={(e) => handleUpdate("faviconUrl", e.target.value)}
              placeholder="https://example.com/favicon.ico"
              className="w-full bg-neutral-900 border border-neutral-700 rounded-xl px-3 py-2 text-white text-xs focus:outline-none focus:border-emerald-500 font-mono"
            />

            {/* Browser Tab Simulation Mockup */}
            <div className="p-2.5 bg-neutral-900 rounded-xl border border-neutral-800">
              <div className="text-[10px] text-neutral-400 mb-1.5 font-medium">
                {"Browser Tab Live Preview:"}
              </div>
              <div className="flex items-center gap-2 bg-neutral-950 px-3 py-1.5 rounded-lg border border-neutral-800 text-[11px] text-neutral-300 w-fit max-w-full">
                {shop.faviconUrl ? (
                  <img src={shop.faviconUrl} alt="Favicon" className="w-3.5 h-3.5 rounded object-cover" />
                ) : (
                  <span className="w-3.5 h-3.5 rounded-full bg-emerald-500 inline-block shrink-0" />
                )}
                <span className="truncate max-w-[180px] font-medium text-white">
                  {shop.name || "AmarDokan"} • {shop.tagline || "Store"}
                </span>
                <span className="text-neutral-500 text-[10px] ml-1">✕</span>
              </div>
            </div>
          </div>
        </div>
      </div>

      <MediaPickerModal
        isOpen={Boolean(mediaPickerField)}
        onClose={() => setMediaPickerField(null)}
        defaultFolder="branding"
        uploadFolder="branding"
        title="Select Logo / Favicon from Media Library"
        onSelect={(url) => {
          if (url && typeof url === "string" && mediaPickerField) {
            handleUpdate(mediaPickerField, url);
          }
        }}
      />
    </div>
  );
};
