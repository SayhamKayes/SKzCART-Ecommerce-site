import React from "react";
import {
  ArrowLeft,
  Truck,
  UserCheck,
  RefreshCw,
  LogOut
} from "lucide-react";
import { useThemeConfig } from "../frontPanel/FrontPanelContext";

const Courier_Header = ({
  onBackToStore,
  riderName,
  setRiderName,
  riders = [],
  canSwitchRider = false,
  onRefresh,
  handleRiderLogout
}) => {
  const { themeConfig } = useThemeConfig();
  const shopName = themeConfig?.shop?.name || "AmarDokan";

  return (
    <header className="bg-neutral-950 border-b border-neutral-800 sticky top-0 z-30 shadow-md">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-3 flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-3">
          <button
            onClick={onBackToStore}
            className="p-2 rounded-xl bg-neutral-900 hover:bg-neutral-800 text-neutral-300 hover:text-white transition-colors cursor-pointer"
            title="Back to Store"
          >
            <ArrowLeft className="w-4 h-4" />
          </button>
          <div className="flex items-center gap-2.5">
            <div className="w-9 h-9 rounded-xl bg-gradient-to-tr from-emerald-600 to-teal-500 flex items-center justify-center text-white font-black text-lg shadow-xs shadow-emerald-500/30">
              <Truck className="w-5 h-5 text-white" />
            </div>
            <div>
              <h1 className="text-base font-black text-white tracking-tight flex items-center gap-1.5">
                <span>{shopName}</span>
                <span className="text-emerald-400">Rider Portal</span>
                <span className="text-[10px] px-1.5 py-0.5 rounded bg-emerald-500/20 text-emerald-300 border border-emerald-500/30 uppercase font-mono">
                  Live Hub
                </span>
              </h1>
              <p className="text-[11px] text-neutral-400">
                Delivery Rider & Logistics Executive Control Hub
              </p>
            </div>
          </div>
        </div>

        {/* Dynamic Authenticated Rider Display / Switcher */}
        <div className="flex items-center gap-2">
          <div className="flex items-center gap-1.5 bg-neutral-900 border border-neutral-800 px-3 py-1.5 rounded-xl text-xs">
            <UserCheck className="w-3.5 h-3.5 text-emerald-400 shrink-0" />
            {canSwitchRider && Array.isArray(riders) && riders.length > 0 ? (
              <select
                value={riderName}
                onChange={(e) => setRiderName && setRiderName(e.target.value)}
                className="bg-transparent text-white font-semibold focus:outline-hidden text-xs cursor-pointer"
              >
                {riders.map((r) => {
                  const displayLabel = r.notes ? `${r.name} (${r.notes})` : r.name;
                  return (
                    <option key={r.id} value={displayLabel} className="bg-neutral-900">
                      {displayLabel}
                    </option>
                  );
                })}
                {!riders.some((r) => (r.notes ? `${r.name} (${r.notes})` : r.name) === riderName) && riderName && (
                  <option value={riderName} className="bg-neutral-900">
                    {riderName}
                  </option>
                )}
              </select>
            ) : (
              <span className="text-white font-semibold truncate max-w-[200px]">
                {riderName || "Authenticated Rider"}
              </span>
            )}
          </div>

          {onRefresh && (
            <button
              onClick={onRefresh}
              className="p-2 rounded-xl bg-neutral-800 hover:bg-neutral-700 text-neutral-300 transition-colors cursor-pointer"
              title="Refresh"
            >
              <RefreshCw className="w-4 h-4" />
            </button>
          )}

          {handleRiderLogout && (
            <button
              onClick={handleRiderLogout}
              className="px-3 py-1.5 rounded-xl bg-neutral-800 hover:bg-rose-900/40 text-neutral-300 hover:text-rose-200 transition-colors text-xs font-semibold flex items-center gap-1.5 cursor-pointer"
              title="End Rider Session"
            >
              <LogOut className="w-3.5 h-3.5" />
              <span>Exit</span>
            </button>
          )}
        </div>
      </div>
    </header>
  );
};

export { Courier_Header };
export default Courier_Header;
