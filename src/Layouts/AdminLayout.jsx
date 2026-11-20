import React, { useState } from 'react';
import { AdminSidebar } from '../components/admin/AdminSidebar';
import { Admin_Header } from '../components/Header';
import { useLanguage } from '../Context/LanguageContext';

const TAB_TITLES = {
  overview: 'Dashboard Overview',
  shopDetails: 'Shop Details & Business Hub',
  themesColors: 'Themes & Colors Studio',
  sliders: 'Hero Sliders Manager',
  media: 'Media Library',
  reviews: 'Customer Reviews & Feedback',
  orders: 'Order Management',
  products: 'Products & Inventory',
  analytics: 'Analytics & Performance',
  leads: 'Lead Generation & CRM',
  campaignProducts: 'Special Campaign Products',
  productEditorial: 'Product Editorial',
  couriers: 'Courier Integration Hub',
  payments: 'Payments & Gateways',
  marketing: 'Meta Pixel & CAPI Tracking',
  adCampaigns: 'Ads Campaigns & ROAS',
  notifications: 'Notifications & Email Gateway',
  blueprint: 'System Architecture Blueprint',
  audit: 'Security Audit Logs',
  staff: 'Staff & Role-Based Access Control',
  recycleBin: 'Recycle Bin & Recovery Vault',
};

export const AdminLayout = ({
  children,
  currentTab,
  setCurrentTab,
  currentRole,
  setCurrentRole,
  onExitToStore,
  onOpenRiderPortal,
  onOpenFrontPanel,
  onLogout,
  pendingOrdersCount,
}) => {
  const titles = TAB_TITLES;

  const [isCollapsed, setIsCollapsed] = useState(() => {
    try {
      return localStorage.getItem("amardokan_admin_sidebar_collapsed") === "true";
    } catch {
      return false;
    }
  });

  const handleToggleCollapse = (valOrFn) => {
    setIsCollapsed((prev) => {
      const nextVal = typeof valOrFn === 'function' ? valOrFn(prev) : valOrFn;
      try {
        localStorage.setItem("amardokan_admin_sidebar_collapsed", String(nextVal));
      } catch (err) {}
      return nextVal;
    });
  };

  const [isMobileOpen, setIsMobileOpen] = useState(false);

  return (
    <div className="flex h-screen overflow-hidden bg-neutral-100 font-sans relative">
      {/* Mobile Drawer Backdrop Overlay */}
      {isMobileOpen && (
        <div
          onClick={() => setIsMobileOpen(false)}
          className="fixed inset-0 bg-black/60 z-40 backdrop-blur-xs md:hidden animate-in fade-in duration-200"
        />
      )}

      {/* Admin Sidebar (Collapsible on Desktop, Off-canvas Drawer on Mobile) */}
      <AdminSidebar
        currentTab={currentTab}
        setCurrentTab={setCurrentTab}
        currentRole={currentRole}
        setCurrentRole={setCurrentRole}
        onExitToStore={onExitToStore}
        onOpenRiderPortal={onOpenRiderPortal}
        onOpenFrontPanel={onOpenFrontPanel}
        onLogout={onLogout}
        pendingOrdersCount={pendingOrdersCount}
        isCollapsed={isCollapsed}
        setIsCollapsed={handleToggleCollapse}
        isMobileOpen={isMobileOpen}
        setIsMobileOpen={setIsMobileOpen}
      />

      <div className="flex-1 flex flex-col min-w-0 overflow-hidden">
        {/* Admin Top Header Component */}
        <Admin_Header
          currentTab={currentTab}
          titles={titles}
          currentRole={currentRole}
          onToggleMobileMenu={() => setIsMobileOpen((prev) => !prev)}
        />

        <main className="flex-1 overflow-y-auto p-4 sm:p-6 lg:p-8">
          {children}
        </main>
      </div>
    </div>
  );
};
