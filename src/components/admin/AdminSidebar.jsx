import { useState } from "react";
import {
  LayoutDashboard,
  ShoppingBag,
  Package,
  Truck,
  CreditCard,
  BarChart3,
  BellRing,
  ShieldAlert,
  Users,
  Store,
  LogOut,
  Zap,
  MessageSquareHeart,
  PanelLeftClose,
  PanelLeftOpen,
  X,
  Palette,
  GalleryHorizontal,
  Images,
  Trash2,
  FileText,
  Layers,
  ChevronDown,
  Megaphone,
  Briefcase,
  ShieldCheck,
  TrendingUp,
  UserCheck
} from "lucide-react";
import { useThemeConfig } from "../frontPanel/FrontPanelContext";

export const ROLE_PERMISSIONS = {
  ADMIN: [
    "overview",
    "orders",
    "analytics",
    "leads",
    "shopDetails",
    "themesColors",
    "sliders",
    "media",
    "reviews",
    "products",
    "campaignProducts",
    "productEditorial",
    "couriers",
    "payments",
    "marketing",
    "adCampaigns",
    "notifications",
    "audit",
    "staff",
    "recycleBin"
  ],
  MANAGER: [
    "overview",
    "orders",
    "analytics",
    "leads",
    "reviews",
    "products",
    "campaignProducts",
    "couriers",
    "notifications",
    "recycleBin"
  ],
  DISPATCHER: [
    "orders",
    "couriers"
  ]
};

const AdminSidebar = ({
  currentTab,
  setCurrentTab,
  currentRole,
  setCurrentRole,
  onExitToStore,
  onOpenRiderPortal,
  onOpenFrontPanel,
  onLogout,
  pendingOrdersCount,
  isCollapsed = false,
  setIsCollapsed,
  isMobileOpen = false,
  setIsMobileOpen
}) => {
  const { themeConfig } = useThemeConfig();

  // Retrieve logged-in staff info if available
  const loggedInStaff = (() => {
    try {
      const stored = sessionStorage.getItem("amardokan_admin_user");
      return stored ? JSON.parse(stored) : null;
    } catch {
      return null;
    }
  })();

  const navSections = [
    {
      type: "item",
      id: "overview",
      label: "Dashboard Overview",
      icon: LayoutDashboard
    },
    {
      type: "item",
      id: "orders",
      label: "Order Management",
      icon: ShoppingBag,
      badge: pendingOrdersCount > 0 ? pendingOrdersCount : undefined
    },
    {
      type: "item",
      id: "products",
      label: "Products & Inventory",
      icon: Package
    },
    {
      type: "item",
      id: "analytics",
      label: "Analytics",
      icon: TrendingUp
    },
    {
      type: "group",
      id: "appearances",
      label: "Appearances",
      icon: Layers,
      items: [
        { id: "shopDetails", label: "Shop Details & Hub", icon: Store },
        { id: "themesColors", label: "Themes & Colors", icon: Palette },
        { id: "sliders", label: "Sliders", icon: GalleryHorizontal },
        { id: "productEditorial", label: "Product Editorial", icon: FileText },
        { id: "reviews", label: "Customer Reviews", icon: MessageSquareHeart }
      ]
    },
    {
      type: "item",
      id: "media",
      label: "Media Library",
      icon: Images
    },
    {
      type: "group",
      id: "marketingCampaigns",
      label: "Marketing & Campaigns",
      icon: Megaphone,
      items: [
        { id: "campaignProducts", label: "Special Campaign Products", icon: Zap },
        { id: "marketing", label: "Marketing & CAPI", icon: BarChart3 },
        { id: "adCampaigns", label: "Ads Campaigns", icon: Megaphone },
        { id: "leads", label: "Lead Generation", icon: UserCheck }
      ]
    },
    {
      type: "group",
      id: "operationsFinance",
      label: "Operations & Finance",
      icon: Briefcase,
      items: [
        { id: "couriers", label: "Courier Hub", icon: Truck },
        { id: "payments", label: "Payments & Gateways", icon: CreditCard },
        { id: "notifications", label: "Notifications", icon: BellRing }
      ]
    },
    {
      type: "group",
      id: "securitySystem",
      label: "Security & System",
      icon: ShieldCheck,
      items: [
        { id: "recycleBin", label: "Recycle Bin", icon: Trash2 },
        { id: "audit", label: "Security Audit Logs", icon: ShieldAlert },
        { id: "staff", label: "Staff & Access Control", icon: Users }
      ]
    }
  ];

  // Strictly filter visible items and groups based on role permissions
  const allowedTabs = ROLE_PERMISSIONS[currentRole] || ROLE_PERMISSIONS.ADMIN;
  const visibleSections = navSections
    .map((section) => {
      if (section.type === "group") {
        const allowedItems = section.items.filter((item) => allowedTabs.includes(item.id));
        if (allowedItems.length === 0) return null;
        return { ...section, items: allowedItems };
      }
      return allowedTabs.includes(section.id) ? section : null;
    })
    .filter(Boolean);

  // All collapsible groups start collapsed by default
  const [openGroups, setOpenGroups] = useState({});
  const toggleGroup = (groupId) => {
    setOpenGroups((prev) => ({ ...prev, [groupId]: !prev[groupId] }));
  };

  return (
    <aside
      className={`bg-neutral-900 text-neutral-300 flex flex-col justify-between shrink-0 h-screen border-r border-neutral-800 transition-all duration-300 ease-in-out z-50 ${isMobileOpen
          ? "fixed inset-y-0 left-0 w-64 shadow-2xl translate-x-0"
          : "fixed inset-y-0 left-0 w-64 -translate-x-full md:translate-x-0 md:static md:sticky md:top-0"
        } ${isCollapsed ? "md:w-20" : "md:w-64"
        }`}
    >
      <div className="overflow-y-auto no-scrollbar">
        {/* Brand & Collapse Header */}
        <div
          className={`p-3.5 sm:p-4 border-b border-neutral-800 flex items-center ${isCollapsed ? "justify-center flex-col gap-2" : "justify-between"
            }`}
        >
          <div className={`flex items-center gap-2.5 min-w-0 ${isCollapsed ? "justify-center" : ""}`}>
            {themeConfig?.shop?.logoUrl ? (
              <img
                src={themeConfig.shop.logoUrl}
                alt={themeConfig?.shop?.name || "Shop Logo"}
                className="w-8 h-8 rounded-lg object-contain bg-white/10 p-0.5 border border-neutral-700 shadow-xs shrink-0"
              />
            ) : isCollapsed ? (
              <span className="text-base font-black text-white tracking-tight">
                {themeConfig?.shop?.name ? themeConfig.shop.name.charAt(0).toUpperCase() : "A"}
              </span>
            ) : null}
            {!isCollapsed && (
              <div className="min-w-0">
                <span className="text-sm font-bold text-white tracking-tight truncate block max-w-[155px]">
                  {themeConfig?.shop?.name || "AmarDokan"}
                </span>
                <p className="text-[10px] text-neutral-400 truncate">
                  Operations Control Panel
                </p>
              </div>
            )}
          </div>

          <div className="flex items-center gap-1">
            {/* Desktop Collapse / Expand Toggle Button */}
            <button
              type="button"
              onClick={() => setIsCollapsed && setIsCollapsed((prev) => !prev)}
              className="hidden md:flex items-center justify-center w-7 h-7 rounded-lg text-neutral-400 hover:text-white hover:bg-neutral-800 transition-colors cursor-pointer"
              title={isCollapsed ? "Expand sidebar" : "Collapse sidebar"}
              aria-label="Toggle Sidebar"
            >
              {isCollapsed ? <PanelLeftOpen className="w-4 h-4" /> : <PanelLeftClose className="w-4 h-4" />}
            </button>

            {/* Mobile Drawer Close Button */}
            <button
              type="button"
              onClick={() => setIsMobileOpen && setIsMobileOpen(false)}
              className="md:hidden flex items-center justify-center w-7 h-7 rounded-lg text-neutral-400 hover:text-white hover:bg-neutral-800 transition-colors cursor-pointer"
              title="Close menu"
              aria-label="Close Navigation"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        </div>

        {/* Navigation Items */}
        <nav className={`p-2.5 sm:p-3 space-y-1 ${isCollapsed ? "px-2" : ""}`}>
          {visibleSections.map((section) => {
            if (section.type === "group") {
              const GroupIcon = section.icon;
              const isOpen = Boolean(openGroups[section.id]);
              const isChildActive = section.items.some((item) => item.id === currentTab);
              const submenuId = `admin-submenu-${section.id}`;

              return (
                <div key={section.id} className="space-y-1">
                  <button
                    type="button"
                    onClick={() => toggleGroup(section.id)}
                    aria-expanded={isOpen}
                    aria-controls={submenuId}
                    title={section.label}
                    className={`w-full flex items-center rounded-xl text-xs font-semibold transition-all cursor-pointer relative group ${
                      isCollapsed ? "justify-center p-2.5" : "justify-between px-3 py-2.5"
                    } ${
                      isChildActive
                        ? "bg-neutral-800/90 text-white border border-emerald-500/40"
                        : "hover:bg-neutral-800 text-neutral-300 hover:text-white"
                    }`}
                  >
                    <div className={`flex items-center gap-2.5 min-w-0 ${isCollapsed ? "justify-center" : ""}`}>
                      <GroupIcon
                        className={`w-4 h-4 shrink-0 ${
                          isChildActive ? "text-emerald-400" : "text-neutral-400 group-hover:text-white"
                        }`}
                      />
                      {!isCollapsed && <span className="truncate">{section.label}</span>}
                    </div>
                    {!isCollapsed && (
                      <ChevronDown
                        className={`w-3.5 h-3.5 shrink-0 text-neutral-400 transition-transform duration-200 ${
                          isOpen ? "rotate-180 text-white" : ""
                        }`}
                      />
                    )}
                  </button>

                  {isOpen && (
                    <div
                      id={submenuId}
                      className={
                        isCollapsed
                          ? "space-y-1 p-1 rounded-xl bg-neutral-950/60 border border-neutral-800/80"
                          : "ml-3 pl-2.5 border-l border-neutral-800 space-y-1"
                      }
                    >
                      {section.items.map((item) => {
                        const ChildIcon = item.icon;
                        const isActive = currentTab === item.id;
                        return (
                          <button
                            key={item.id}
                            type="button"
                            onClick={() => {
                              setCurrentTab(item.id);
                              if (setIsMobileOpen) setIsMobileOpen(false);
                            }}
                            title={item.label}
                            className={`w-full flex items-center rounded-xl text-xs font-semibold transition-all cursor-pointer relative group ${
                              isCollapsed ? "justify-center p-2" : "gap-2.5 px-3 py-2"
                            } ${
                              isActive
                                ? "bg-emerald-600 text-white shadow-xs shadow-emerald-950/40"
                                : "hover:bg-neutral-800 text-neutral-400 hover:text-white"
                            }`}
                          >
                            <ChildIcon
                              className={`w-3.5 h-3.5 shrink-0 ${
                                isActive ? "text-white" : "text-neutral-400 group-hover:text-white"
                              }`}
                            />
                            {!isCollapsed && <span className="truncate">{item.label}</span>}
                          </button>
                        );
                      })}
                    </div>
                  )}
                </div>
              );
            }

            const Icon = section.icon;
            const isActive = currentTab === section.id;
            return (
              <button
                key={section.id}
                type="button"
                onClick={() => {
                  setCurrentTab(section.id);
                  if (setIsMobileOpen) setIsMobileOpen(false);
                }}
                title={section.label}
                className={`w-full flex items-center rounded-xl text-xs font-semibold transition-all cursor-pointer relative group ${
                  isCollapsed ? "justify-center p-2.5" : "justify-between px-3 py-2.5"
                } ${
                  isActive
                    ? "bg-emerald-600 text-white shadow-xs shadow-emerald-950/40"
                    : "hover:bg-neutral-800 text-neutral-400 hover:text-white"
                }`}
              >
                <div className={`flex items-center gap-2.5 min-w-0 ${isCollapsed ? "justify-center" : ""}`}>
                  <Icon
                    className={`w-4 h-4 shrink-0 ${
                      isActive ? "text-white" : "text-neutral-400 group-hover:text-white"
                    }`}
                  />
                  {!isCollapsed && <span className="truncate">{section.label}</span>}
                </div>

                {/* Badge when expanded */}
                {!isCollapsed && section.badge !== undefined && (
                  <span className="px-1.5 py-0.5 rounded-full text-[10px] font-bold bg-amber-500 text-neutral-950 shrink-0">
                    {section.badge}
                  </span>
                )}

                {/* Compact indicator when collapsed */}
                {isCollapsed && section.badge !== undefined && (
                  <span className="absolute top-1.5 right-1.5 w-2 h-2 rounded-full bg-amber-500" />
                )}
              </button>
            );
          })}
        </nav>
      </div>

      {/* Footer Actions */}
      <div className={`p-3 border-t border-neutral-800 space-y-2 bg-neutral-900 shrink-0 ${isCollapsed ? "px-2" : ""}`}>
        {/* User Card if available */}
        {loggedInStaff && (
          <div
            title={`@${loggedInStaff.username}`}
            className={`bg-neutral-950/50 rounded-xl border border-neutral-800/80 flex items-center ${isCollapsed ? "justify-center p-2" : "px-3 py-2 gap-2.5"
              }`}
          >
            <div className="w-7 h-7 rounded-lg bg-emerald-600/20 text-emerald-400 font-bold text-xs flex items-center justify-center border border-emerald-500/30 shrink-0">
              {loggedInStaff.name ? loggedInStaff.name.charAt(0).toUpperCase() : "U"}
            </div>
            {!isCollapsed && (
              <div className="min-w-0 flex-1">
                <p className="text-xs font-bold text-white truncate">{loggedInStaff.name}</p>
                <p className="text-[10px] text-neutral-400 truncate">@{loggedInStaff.username}</p>
              </div>
            )}
          </div>
        )}

        <button
          onClick={onExitToStore}
          title="Back to Shop"
          className={`w-full flex items-center rounded-xl text-xs font-semibold text-neutral-400 hover:bg-neutral-800 hover:text-white transition-colors cursor-pointer ${isCollapsed ? "justify-center p-2.5" : "gap-2 px-3 py-2"
            }`}
        >
          <Store className="w-4 h-4 shrink-0" />
          {!isCollapsed && <span>Back to Shop</span>}
        </button>

        <button
          onClick={onLogout}
          title="Logout"
          className={`w-full flex items-center rounded-xl text-xs font-semibold text-rose-400 hover:bg-rose-950/30 hover:text-rose-300 transition-colors cursor-pointer ${isCollapsed ? "justify-center p-2.5" : "gap-2 px-3 py-2"
            }`}
        >
          <LogOut className="w-4 h-4 shrink-0" />
          {!isCollapsed && <span>Logout</span>}
        </button>
      </div>
    </aside>
  );
};

export { AdminSidebar };
