import React from "react";
import { Shield, Briefcase, Truck, Menu } from "lucide-react";

const Admin_Header = ({
  currentTab,
  titles = {},
  extraActions,
  currentRole = "ADMIN",
  onToggleMobileMenu
}) => {
  const currentTitle = titles[currentTab] || "Admin Panel";

  const roleBadge = (() => {
    switch (currentRole) {
      case "ADMIN":
        return {
          icon: Shield,
          text: "Super Admin",
          className: "bg-purple-50 text-purple-700 border-purple-200"
        };
      case "MANAGER":
        return {
          icon: Briefcase,
          text: "Operations Manager",
          className: "bg-blue-50 text-blue-700 border-blue-200"
        };
      case "DISPATCHER":
        return {
          icon: Truck,
          text: "Delivery Dispatcher",
          className: "bg-amber-50 text-amber-700 border-amber-200"
        };
      default:
        return null;
    }
  })();

  const RoleIcon = roleBadge?.icon;

  return (
    <header className="bg-white border-b border-neutral-200 px-3.5 sm:px-6 py-2.5 sm:py-3 flex items-center justify-between gap-3 sm:gap-4 shrink-0 shadow-2xs z-30">
      <div className="flex items-center gap-2 sm:gap-3 min-w-0">
        {/* Mobile Hamburger Drawer Trigger */}
        <button
          type="button"
          onClick={onToggleMobileMenu}
          className="md:hidden p-1.5 -ml-1 rounded-lg text-neutral-600 hover:text-neutral-900 hover:bg-neutral-100 transition-colors cursor-pointer"
          title="Open menu"
          aria-label="Open Navigation"
        >
          <Menu className="w-5 h-5" />
        </button>

        <span className="w-2.5 h-2.5 rounded-full bg-emerald-500 animate-pulse hidden sm:inline-block shrink-0"></span>
        <h1 className="text-xs sm:text-sm font-bold text-neutral-800 tracking-tight truncate">
          {currentTitle}
        </h1>
        {roleBadge && RoleIcon && (
          <div
            className={`hidden sm:inline-flex items-center gap-1.5 px-2 py-0.5 rounded-full text-[10px] font-bold border tracking-wider uppercase shrink-0 ${roleBadge.className}`}
          >
            <RoleIcon className="w-3 h-3" />
            <span>{roleBadge.text}</span>
          </div>
        )}
      </div>

      <div className="flex items-center gap-3">
        {extraActions}
      </div>
    </header>
  );
};

export { Admin_Header };
export default Admin_Header;
