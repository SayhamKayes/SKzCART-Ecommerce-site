import React from "react";
import {
  ArrowLeft,
  Sparkles,
  ExternalLink,
  RotateCcw,
  LogOut
} from "lucide-react";
import { useThemeConfig } from "../frontPanel/FrontPanelContext";

const FrontPanel_Header = ({
  onNavigateToView,
  handleReset,
  handleLogout
}) => {
  const { themeConfig } = useThemeConfig();
  const shopName = themeConfig?.shop?.name || "AmarDokan";

  return (
    <header className="sticky top-0 z-40 bg-neutral-900/95 backdrop-blur-md border-b border-neutral-800 px-4 sm:px-8 py-3.5 flex items-center justify-between gap-4">
      <div className="flex items-center gap-3">
        <button
          type="button"
          onClick={() => onNavigateToView && onNavigateToView("store")}
          className="p-2 rounded-xl bg-neutral-800 text-neutral-400 hover:text-white hover:bg-neutral-700 transition-colors cursor-pointer"
          title="Back to Store"
        >
          <ArrowLeft className="w-4 h-4" />
        </button>
        <div className="flex items-center gap-2.5">
          <div className="w-8 h-8 rounded-xl bg-gradient-to-tr from-emerald-600 to-teal-500 flex items-center justify-center text-white shadow-md">
            <Sparkles className="w-4 h-4 text-white" />
          </div>
          <div>
            <h1 className="text-sm font-bold text-white tracking-tight flex items-center gap-2">
              <span>{shopName} Front Panel</span>
              <span className="hidden sm:inline-block px-2 py-0.5 rounded-full bg-emerald-500/20 text-emerald-400 text-[10px] font-semibold border border-emerald-500/30">
                ● Live Sync
              </span>
            </h1>
            <p className="text-[11px] text-neutral-400 hidden sm:block">
              Design, Product Details & Campaign Customizer
            </p>
          </div>
        </div>
      </div>

      {/* Header Actions */}
      <div className="flex items-center gap-2 sm:gap-3">
        <button
          type="button"
          onClick={() => onNavigateToView && onNavigateToView("landing")}
          className="hidden md:inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-neutral-800 hover:bg-neutral-700 text-neutral-300 text-xs font-semibold transition-colors cursor-pointer"
        >
          <span>Campaign Page</span>
          <ExternalLink className="w-3.5 h-3.5 text-neutral-400" />
        </button>

        <button
          type="button"
          onClick={() => onNavigateToView && onNavigateToView("store")}
          className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-neutral-800 hover:bg-neutral-700 text-neutral-300 text-xs font-semibold transition-colors cursor-pointer"
        >
          <span>Live Store</span>
          <ExternalLink className="w-3.5 h-3.5 text-neutral-400" />
        </button>

        {handleReset && (
          <button
            type="button"
            onClick={handleReset}
            className="p-2 rounded-xl text-neutral-400 hover:text-amber-400 hover:bg-neutral-800 transition-colors cursor-pointer"
            title="Reset All Settings to Default"
          >
            <RotateCcw className="w-4 h-4" />
          </button>
        )}

        {handleLogout && (
          <button
            type="button"
            onClick={handleLogout}
            className="p-2 rounded-xl text-neutral-400 hover:text-rose-400 hover:bg-neutral-800 transition-colors cursor-pointer"
            title="Logout from Front Panel"
          >
            <LogOut className="w-4 h-4" />
          </button>
        )}
      </div>
    </header>
  );
};

export { FrontPanel_Header };
export default FrontPanel_Header;
