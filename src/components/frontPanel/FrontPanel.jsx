import React, { useState } from "react";
import {
  Sparkles,
  Zap,
  Home,
  Package,
  Truck,
  Store,
  ArrowLeft,
  ExternalLink,
  LogOut,
  RotateCcw,
  CheckCircle2,
  Building2,
} from "lucide-react";
import { FrontPanelAuth } from "./FrontPanelAuth";
import { useThemeConfig } from "./FrontPanelContext";
import { ShopCustomizer } from "./sections/ShopCustomizer";
import { CampaignCustomizer } from "./sections/CampaignCustomizer";
import { ProductPageCustomizer } from "./sections/ProductPageCustomizer";
import { FrontPageCustomizer } from "./sections/FrontPageCustomizer";
import { HeaderCustomizer } from "./sections/HeaderCustomizer";
import { StorePageCustomizer } from "./sections/StorePageCustomizer";
import { FrontPanel_Header } from "../Header";

export const FrontPanel = ({
  products = [],
  onNavigateToView,
}) => {
  const [isAuthenticated, setIsAuthenticated] = useState(() => {
    return sessionStorage.getItem("amardokan_front_auth") === "true";
  });
  const [activeTab, setActiveTab] = useState("campaign");
  const [saveToast, setSaveToast] = useState(false);

  const { themeConfig, updateThemeConfig, resetThemeConfig } = useThemeConfig();

  const handleLogout = () => {
    sessionStorage.removeItem("amardokan_front_auth");
    setIsAuthenticated(false);
  };

  const handleConfigChange = (section, values) => {
    updateThemeConfig(section, values);
    setSaveToast(true);
    setTimeout(() => setSaveToast(false), 2000);
  };

  const handleReset = () => {
    if (window.confirm("Are you sure you want to reset all customizations to default settings?")) {
      resetThemeConfig();
      setSaveToast(true);
      setTimeout(() => setSaveToast(false), 2000);
    }
  };

  if (!isAuthenticated) {
    return (
      <FrontPanelAuth
        onAuthenticated={() => setIsAuthenticated(true)}
        onCancel={() => onNavigateToView && onNavigateToView("store")}
      />
    );
  }

  const tabs = [
    { id: "shop", label: "Shop Profile & Branding", icon: Building2, badge: "NEW" },
    { id: "campaign", label: "Campaign Products & Deals", icon: Zap, badge: "HOT" },
    { id: "product", label: "Product Page & Details", icon: Package },
    { id: "home", label: "Home & Front Page", icon: Home },
    { id: "header", label: "Header & Trust Bar", icon: Truck },
    { id: "store", label: "Store Catalog Page", icon: Store },
  ];

  return (
    <div className="min-h-screen bg-neutral-950 text-neutral-100 flex flex-col font-sans selection:bg-emerald-500 selection:text-white">
      {/* Top Header Component */}
      <FrontPanel_Header
        onNavigateToView={onNavigateToView}
        handleReset={handleReset}
        handleLogout={handleLogout}
      />

      {/* Main Content Area */}
      <div className="flex-1 max-w-7xl w-full mx-auto p-4 sm:p-6 lg:p-8 flex flex-col md:flex-row gap-6">
        {/* Navigation Sidebar / Tabs */}
        <aside className="w-full md:w-64 shrink-0 space-y-1.5">
          <div className="text-[11px] font-bold text-neutral-500 uppercase tracking-wider px-3 mb-2">
            Customization Modules
          </div>
          {tabs.map((tab) => {
            const Icon = tab.icon;
            const isActive = activeTab === tab.id;
            return (
              <button
                key={tab.id}
                type="button"
                onClick={() => setActiveTab(tab.id)}
                className={`w-full text-left px-3.5 py-3 rounded-2xl flex items-center justify-between text-xs font-bold transition-all cursor-pointer ${
                  isActive
                    ? "bg-emerald-600 text-white shadow-lg shadow-emerald-950/50"
                    : "bg-neutral-900/60 text-neutral-400 hover:bg-neutral-900 hover:text-white border border-neutral-800/80"
                }`}
              >
                <div className="flex items-center gap-2.5">
                  <Icon className={`w-4 h-4 ${isActive ? "text-white" : "text-neutral-400"}`} />
                  <span>{tab.label}</span>
                </div>
                {tab.badge && (
                  <span
                    className={`text-[9px] px-1.5 py-0.5 rounded-full font-bold ${
                      isActive ? "bg-white text-emerald-700" : "bg-emerald-500/20 text-emerald-400"
                    }`}
                  >
                    {tab.badge}
                  </span>
                )}
              </button>
            );
          })}

          <div className="pt-4 mt-4 border-t border-neutral-800/80 px-3 text-[11px] text-neutral-500 space-y-1.5">
            <p>💡 <span className="text-neutral-400">Auto Save Enabled:</span> Changes are saved automatically and synchronized immediately.</p>
          </div>
        </aside>

        {/* Tab Panel Content */}
        <main className="flex-1 min-w-0 bg-neutral-900/50 border border-neutral-800/80 rounded-3xl p-5 sm:p-7 relative">
          {activeTab === "shop" && (
            <ShopCustomizer
              config={themeConfig}
              onChange={handleConfigChange}
            />
          )}

          {activeTab === "campaign" && (
            <CampaignCustomizer
              config={themeConfig}
              onChange={handleConfigChange}
              products={products}
              onNavigateToView={onNavigateToView}
            />
          )}

          {activeTab === "product" && (
            <ProductPageCustomizer
              config={themeConfig}
              onChange={handleConfigChange}
            />
          )}

          {activeTab === "home" && (
            <FrontPageCustomizer
              config={themeConfig}
              onChange={handleConfigChange}
              products={products}
            />
          )}

          {activeTab === "header" && (
            <HeaderCustomizer
              config={themeConfig}
              onChange={handleConfigChange}
            />
          )}

          {activeTab === "store" && (
            <StorePageCustomizer
              config={themeConfig}
              onChange={handleConfigChange}
            />
          )}
        </main>
      </div>

      {/* Floating Save Toast */}
      {saveToast && (
        <div className="fixed bottom-6 right-6 z-50 bg-emerald-600 text-white px-4 py-2.5 rounded-2xl shadow-2xl flex items-center gap-2 text-xs font-bold animate-in fade-in slide-in-from-bottom-2 duration-200">
          <CheckCircle2 className="w-4 h-4" />
          <span>Settings successfully saved and synced!</span>
        </div>
      )}
    </div>
  );
};
