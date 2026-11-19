import React from "react";
import { Tag, PhoneCall, MapPin, Truck } from "lucide-react";

export const HeaderCustomizer = ({ config, onChange }) => {
  const header = config.header || {};

  const handleUpdate = (field, value) => {
    if (field === "announcementText") {
      onChange("header", { announcementText: value, announcementTextEn: value });
    } else if (field === "trackButtonText") {
      onChange("header", { trackButtonText: value, trackButtonTextEn: value });
    } else {
      onChange("header", { [field]: value });
    }
  };

  return (
    <div className="space-y-6">
      {/* Header Info */}
      <div className="bg-gradient-to-r from-emerald-950/40 via-neutral-900 to-neutral-950 p-5 rounded-2xl border border-emerald-800/30">
        <h3 className="text-sm font-bold text-white flex items-center gap-2">
          <Truck className="w-4 h-4 text-emerald-400" />
          <span>Header & Top Notice Bar Customizer</span>
        </h3>
        <p className="text-xs text-neutral-400 mt-1">
          Manage top announcement text, hotline number, and order tracking button.
        </p>
      </div>

      {/* Top Announcement Bar */}
      <div className="bg-neutral-900 p-5 rounded-2xl border border-neutral-800 space-y-4 text-xs">
        <div className="flex items-center justify-between">
          <div>
            <h4 className="text-xs font-bold text-white uppercase tracking-wider flex items-center gap-1.5">
              <Truck className="w-3.5 h-3.5 text-amber-400" />
              <span>Top Announcement Notice Bar</span>
            </h4>
            <p className="text-[11px] text-neutral-400 mt-0.5">
              Running announcement, special promotion, or trust notice above the header
            </p>
          </div>
          <input
            type="checkbox"
            checked={header.showAnnouncement ?? true}
            onChange={(e) => handleUpdate("showAnnouncement", e.target.checked)}
            className="w-5 h-5 accent-emerald-500 cursor-pointer"
          />
        </div>

        {header.showAnnouncement && (
          <div className="pt-2 border-t border-neutral-800/60">
            <label className="block text-neutral-300 font-semibold mb-1">
              Notice Bar Text
            </label>
            <input
              type="text"
              value={header.announcementText || ""}
              onChange={(e) => handleUpdate("announcementText", e.target.value)}
              placeholder="Check product upon delivery before payment"
              className="w-full bg-neutral-950 border border-neutral-800 rounded-xl px-3 py-2 text-white text-xs focus:outline-none focus:border-emerald-500"
            />
          </div>
        )}
      </div>

      {/* Hotline & Track */}
      <div className="bg-neutral-900 p-5 rounded-2xl border border-neutral-800 space-y-4 text-xs">
        <h4 className="text-xs font-bold text-neutral-200 uppercase tracking-wider">
          Hotline & Order Tracking
        </h4>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div className="p-4 rounded-xl bg-neutral-950 border border-neutral-800 space-y-3">
            <div className="flex items-center justify-between">
              <span className="font-bold text-white flex items-center gap-1.5">
                <PhoneCall className="w-3.5 h-3.5 text-amber-400" />
                <span>Show Hotline Number</span>
              </span>
              <input
                type="checkbox"
                checked={header.showHotline ?? true}
                onChange={(e) => handleUpdate("showHotline", e.target.checked)}
                className="w-4 h-4 accent-emerald-500 cursor-pointer"
              />
            </div>
            {header.showHotline && (
              <input
                type="text"
                value={header.hotline || ""}
                onChange={(e) => handleUpdate("hotline", e.target.value)}
                placeholder="09612345678"
                className="w-full bg-neutral-900 border border-neutral-700 rounded-xl px-3 py-2 text-white text-xs focus:outline-none focus:border-emerald-500"
              />
            )}
          </div>

          <div className="p-4 rounded-xl bg-neutral-950 border border-neutral-800 space-y-3">
            <div className="flex items-center justify-between">
              <span className="font-bold text-white flex items-center gap-1.5">
                <MapPin className="w-3.5 h-3.5 text-emerald-400" />
                <span>Order Tracking Button</span>
              </span>
              <input
                type="checkbox"
                checked={header.showTrackOrder ?? true}
                onChange={(e) => handleUpdate("showTrackOrder", e.target.checked)}
                className="w-4 h-4 accent-emerald-500 cursor-pointer"
              />
            </div>
            {header.showTrackOrder && (
              <input
                type="text"
                value={header.trackButtonText || ""}
                onChange={(e) => handleUpdate("trackButtonText", e.target.value)}
                placeholder="Track Order"
                className="w-full bg-neutral-900 border border-neutral-700 rounded-xl px-3 py-2 text-white text-xs focus:outline-none focus:border-emerald-500"
              />
            )}
          </div>
        </div>
      </div>
    </div>
  );
};
