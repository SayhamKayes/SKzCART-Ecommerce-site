import React, { useState, useEffect, useCallback } from "react";
import {
  Trash2,
  RotateCcw,
  RefreshCw,
  Search,
  ShoppingBag,
  Package,
  MessageSquareHeart,
  Images,
  Tag,
  Users,
  GalleryHorizontal,
  AlertTriangle,
  Loader2,
  CheckCircle2,
  Clock,
  Check,
  X,
  ShieldAlert,
  CreditCard
} from "lucide-react";
import { apiClient } from "../../services/api";
import { realtimeService } from "../../services/realtime";
import { useThemeConfig } from "../frontPanel/FrontPanelContext";
import { formatBDTDateTime } from "../../utils/bangladesh";
import { handleProductImageError } from "../../utils/productImage";

const TYPE_META = {
  ALL: { label: "All Trashed", icon: Trash2, badgeBg: "bg-neutral-900 text-white" },
  ORDER: { label: "Orders", icon: ShoppingBag, badgeBg: "bg-emerald-50 text-emerald-700 border border-emerald-200" },
  PRODUCT: { label: "Products", icon: Package, badgeBg: "bg-indigo-50 text-indigo-700 border border-indigo-200" },
  REVIEW: { label: "Customer Reviews", icon: MessageSquareHeart, badgeBg: "bg-amber-50 text-amber-700 border border-amber-200" },
  MEDIA: { label: "Media Library", icon: Images, badgeBg: "bg-sky-50 text-sky-700 border border-sky-200" },
  SLIDER: { label: "Hero Sliders", icon: GalleryHorizontal, badgeBg: "bg-purple-50 text-purple-700 border border-purple-200" },
  COUPON: { label: "Coupons", icon: Tag, badgeBg: "bg-rose-50 text-rose-700 border border-rose-200" },
  STAFF: { label: "Staff Accounts", icon: Users, badgeBg: "bg-slate-100 text-slate-700 border border-slate-200" },
  AUDIT_LOG: { label: "Security Audit Logs", icon: ShieldAlert, badgeBg: "bg-orange-50 text-orange-700 border border-orange-200" },
  PAYMENT_TRANSACTION: { label: "Gateway Transactions", icon: CreditCard, badgeBg: "bg-blue-50 text-blue-700 border border-blue-200" },
};

export const AdminRecycleBin = ({ onRefreshData }) => {
  const { syncShopSettingsFromBackend } = useThemeConfig();
  const [items, setItems] = useState([]);
  const [counts, setCounts] = useState({ ALL: 0 });
  const [activeType, setActiveType] = useState("ALL");
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedIds, setSelectedIds] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [busyId, setBusyId] = useState(null);
  const [feedback, setFeedback] = useState(null);
  const [confirmDialog, setConfirmDialog] = useState(null); // { mode: 'single' | 'bulk' | 'empty', item?: object }

  const showToast = (type, text) => {
    setFeedback({ type, text });
    setTimeout(() => {
      setFeedback((prev) => (prev && prev.text === text ? null : prev));
    }, 4500);
  };

  const loadTrash = useCallback(async (silent = false) => {
    if (!silent) setIsLoading(true);
    try {
      const res = await apiClient.getRecycleBin({
        item_type: activeType,
        search: searchQuery.trim(),
      });
      if (res && res.success) {
        setItems(Array.isArray(res.items) ? res.items : []);
        setCounts(res.counts || { ALL: 0 });
      }
    } catch (err) {
      console.warn("Failed to load recycle bin:", err);
    } finally {
      if (!silent) setIsLoading(false);
    }
  }, [activeType, searchQuery]);

  useEffect(() => {
    loadTrash();
  }, [loadTrash]);

  // Real-time sync across tabs / devices
  useEffect(() => {
    const unsub = realtimeService.subscribe((event) => {
      if (
        event.type === "RECYCLE_BIN_UPDATED" ||
        event.type === "ORDER_DELETED" ||
        event.type === "PRODUCT_DELETED" ||
        event.type === "REVIEW_UPDATED"
      ) {
        loadTrash(true);
      }
    });
    const onFocus = () => loadTrash(true);
    window.addEventListener("focus", onFocus);
    return () => {
      unsub();
      window.removeEventListener("focus", onFocus);
    };
  }, [loadTrash]);

  const syncAllConsumers = async (itemType) => {
    if (typeof onRefreshData === "function") {
      await onRefreshData();
    }
    if (itemType === "SLIDER" || itemType === "ALL") {
      if (typeof syncShopSettingsFromBackend === "function") {
        await syncShopSettingsFromBackend(true);
      }
    }
    try {
      realtimeService.broadcast("RECYCLE_BIN_UPDATED", { itemType });
      if (itemType === "REVIEW" || itemType === "ALL") {
        realtimeService.broadcast("REVIEW_UPDATED", {});
      }
    } catch {}
  };

  const handleRestore = async (item) => {
    setBusyId(item.id);
    try {
      const res = await apiClient.restoreRecycleBinItem(item.id);
      if (res && res.success) {
        setSelectedIds((prev) => prev.filter((id) => id !== item.id));
        await loadTrash(true);
        await syncAllConsumers(item.item_type);
        showToast("success", `"${item.title}" restored successfully and synced everywhere.`);
      } else {
        showToast("error", res?.message || "Failed to restore item.");
      }
    } catch (err) {
      showToast("error", err?.message || "Restore request failed.");
    } finally {
      setBusyId(null);
    }
  };

  const handleExecuteConfirmDelete = async () => {
    if (!confirmDialog) return;
    const dialog = confirmDialog;
    setConfirmDialog(null);

    if (dialog.mode === "single" && dialog.item) {
      setBusyId(dialog.item.id);
      try {
        const res = await apiClient.permanentDeleteRecycleBinItem(dialog.item.id);
        if (res && res.success) {
          setSelectedIds((prev) => prev.filter((id) => id !== dialog.item.id));
          await loadTrash(true);
          try {
            realtimeService.broadcast("RECYCLE_BIN_UPDATED", { id: dialog.item.id });
          } catch {}
          showToast("success", `"${dialog.item.title}" permanently deleted from database.`);
        } else {
          showToast("error", res?.message || "Failed to permanently delete item.");
        }
      } finally {
        setBusyId(null);
      }
    } else if (dialog.mode === "bulk") {
      setBusyId("BULK");
      try {
        const res = await apiClient.bulkPermanentDeleteRecycleBin({ ids: selectedIds });
        if (res && res.success) {
          setSelectedIds([]);
          await loadTrash(true);
          try {
            realtimeService.broadcast("RECYCLE_BIN_UPDATED", {});
          } catch {}
          showToast("success", `Permanently deleted ${res.deletedCount || 0} items from database.`);
        } else {
          showToast("error", res?.message || "Bulk permanent delete failed.");
        }
      } finally {
        setBusyId(null);
      }
    } else if (dialog.mode === "empty") {
      setBusyId("EMPTY");
      try {
        const res = await apiClient.bulkPermanentDeleteRecycleBin({
          empty_all: true,
          item_type: activeType,
        });
        if (res && res.success) {
          setSelectedIds([]);
          await loadTrash(true);
          try {
            realtimeService.broadcast("RECYCLE_BIN_UPDATED", {});
          } catch {}
          showToast("success", `Recycle Bin emptied (${res.deletedCount || 0} items removed permanently).`);
        } else {
          showToast("error", res?.message || "Failed to empty Recycle Bin.");
        }
      } finally {
        setBusyId(null);
      }
    }
  };

  const handleBulkRestore = async () => {
    if (selectedIds.length === 0) return;
    setBusyId("BULK");
    try {
      const res = await apiClient.bulkRestoreRecycleBin(selectedIds);
      if (res && res.success) {
        setSelectedIds([]);
        await loadTrash(true);
        await syncAllConsumers("ALL");
        showToast("success", `Restored ${res.restoredCount || 0} selected items.`);
      } else {
        showToast("error", res?.message || "Bulk restore failed.");
      }
    } finally {
      setBusyId(null);
    }
  };

  const toggleSelect = (id) => {
    setSelectedIds((prev) =>
      prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id]
    );
  };

  const allVisibleSelected =
    items.length > 0 && items.every((it) => selectedIds.includes(it.id));

  const toggleSelectAll = () => {
    if (allVisibleSelected) {
      setSelectedIds([]);
    } else {
      setSelectedIds(items.map((it) => it.id));
    }
  };

  const filterKeys = ["ALL", "ORDER", "PRODUCT", "REVIEW", "MEDIA", "PAYMENT_TRANSACTION", "AUDIT_LOG", "SLIDER", "COUPON", "STAFF"];

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="bg-white rounded-3xl p-6 border border-neutral-200 shadow-xs flex flex-wrap items-center justify-between gap-4">
        <div>
          <span className="text-xs font-bold uppercase tracking-wider text-rose-700 bg-rose-50 px-2.5 py-1 rounded-full">
            {"Trash & Recovery Vault"}
          </span>
          <h1 className="text-2xl font-black text-neutral-900 mt-2">
            {"Recycle Bin"}
          </h1>
          <p className="text-xs text-neutral-500">
            {"All deleted orders, products, customer reviews, media assets, sliders, coupons & staff are safely stored here. Restore anytime or delete permanently from database."}
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2.5">
          {items.length > 0 && (
            <button
              type="button"
              disabled={busyId !== null}
              onClick={() => setConfirmDialog({ mode: "empty" })}
              className="px-3.5 py-2.5 rounded-xl bg-rose-600 hover:bg-rose-700 disabled:opacity-50 text-white transition-colors flex items-center gap-1.5 text-xs font-bold shadow-xs cursor-pointer"
            >
              <Trash2 className="w-3.5 h-3.5" />
              <span>
                {activeType === "ALL"
                  ? `Empty Recycle Bin (${counts.ALL || items.length})`
                  : `Empty ${TYPE_META[activeType]?.label || activeType} (${items.length})`}
              </span>
            </button>
          )}

          <button
            type="button"
            onClick={() => loadTrash(false)}
            className="p-2.5 rounded-xl border border-neutral-200 hover:bg-neutral-50 text-neutral-600 transition-colors flex items-center gap-1.5 text-xs font-semibold cursor-pointer"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${isLoading ? "animate-spin" : ""}`} />
            <span>{"Refresh"}</span>
          </button>
        </div>
      </div>

      {/* Feedback Banner */}
      {feedback && (
        <div
          className={`p-4 rounded-2xl border text-xs font-bold flex items-center justify-between gap-3 ${
            feedback.type === "success"
              ? "bg-emerald-50 border-emerald-200 text-emerald-800"
              : "bg-rose-50 border-rose-200 text-rose-800"
          }`}
        >
          <div className="flex items-center gap-2">
            {feedback.type === "success" ? (
              <CheckCircle2 className="w-4 h-4 shrink-0 text-emerald-600" />
            ) : (
              <AlertTriangle className="w-4 h-4 shrink-0 text-rose-600" />
            )}
            <span>{feedback.text}</span>
          </div>
          <button
            type="button"
            onClick={() => setFeedback(null)}
            className="p-1 rounded-lg hover:bg-black/5 cursor-pointer"
          >
            <X className="w-3.5 h-3.5" />
          </button>
        </div>
      )}

      {/* Filter Tabs + Search + Bulk Actions */}
      <div className="bg-white rounded-2xl p-4 border border-neutral-200 shadow-xs space-y-3">
        <div className="flex items-center gap-2 overflow-x-auto pb-1 no-scrollbar text-xs">
          {filterKeys.map((key) => {
            const meta = TYPE_META[key] || TYPE_META.ALL;
            const Icon = meta.icon;
            const count = counts[key] ?? 0;
            const isSelected = activeType === key;
            return (
              <button
                key={key}
                type="button"
                onClick={() => {
                  setActiveType(key);
                  setSelectedIds([]);
                }}
                className={`px-3 py-1.5 rounded-xl font-semibold whitespace-nowrap transition-all flex items-center gap-1.5 cursor-pointer ${
                  isSelected
                    ? "bg-neutral-900 text-white shadow-xs"
                    : "bg-neutral-100 text-neutral-600 hover:bg-neutral-200"
                }`}
              >
                <Icon className="w-3.5 h-3.5" />
                <span>{meta.label}</span>
                <span
                  className={`text-[10px] px-1.5 py-0.2 rounded-full ${
                    isSelected ? "bg-neutral-800 text-emerald-300" : "bg-neutral-200 text-neutral-700"
                  }`}
                >
                  {count}
                </span>
              </button>
            );
          })}
        </div>

        <div className="flex flex-wrap items-center justify-between gap-3">
          <div className="relative flex-1 min-w-[220px]">
            <Search className="w-4 h-4 text-neutral-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              placeholder="Search trashed orders, products, reviews, media by title or ID..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-10 pr-4 py-2.5 bg-neutral-50 border border-neutral-200 rounded-xl text-xs focus:outline-none focus:border-emerald-600 focus:bg-white transition-all"
            />
          </div>

          {selectedIds.length > 0 && (
            <div className="flex items-center gap-2">
              <span className="text-xs font-bold text-neutral-700 bg-neutral-100 px-3 py-1.5 rounded-xl">
                {selectedIds.length} selected
              </span>
              <button
                type="button"
                disabled={busyId !== null}
                onClick={handleBulkRestore}
                className="px-3.5 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold flex items-center gap-1.5 cursor-pointer"
              >
                <RotateCcw className="w-3.5 h-3.5" />
                <span>Restore Selected</span>
              </button>
              <button
                type="button"
                disabled={busyId !== null}
                onClick={() => setConfirmDialog({ mode: "bulk" })}
                className="px-3.5 py-2 rounded-xl bg-rose-600 hover:bg-rose-700 text-white text-xs font-bold flex items-center gap-1.5 cursor-pointer"
              >
                <Trash2 className="w-3.5 h-3.5" />
                <span>Delete Permanently</span>
              </button>
            </div>
          )}
        </div>
      </div>

      {/* Trashed Items Table */}
      <div className="bg-white rounded-3xl border border-neutral-200 shadow-xs overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead className="bg-neutral-50 text-neutral-500 font-bold border-b border-neutral-200">
              <tr>
                <th className="py-3.5 px-4 w-10">
                  <button
                    type="button"
                    onClick={toggleSelectAll}
                    className={`w-4 h-4 rounded border flex items-center justify-center transition-colors cursor-pointer ${
                      allVisibleSelected
                        ? "bg-emerald-600 border-emerald-600 text-white"
                        : "border-neutral-300 bg-white"
                    }`}
                    title="Select All"
                  >
                    {allVisibleSelected && <Check className="w-3 h-3" />}
                  </button>
                </th>
                <th className="py-3.5 px-4">{"Item Details"}</th>
                <th className="py-3.5 px-4">{"Category"}</th>
                <th className="py-3.5 px-4">{"Original ID"}</th>
                <th className="py-3.5 px-4">{"Deleted At"}</th>
                <th className="py-3.5 px-4 text-right">{"Actions"}</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-neutral-100">
              {isLoading ? (
                <tr>
                  <td colSpan={6} className="py-12 text-center text-neutral-400">
                    <div className="flex items-center justify-center gap-2">
                      <Loader2 className="w-4 h-4 animate-spin text-emerald-600" />
                      <span>{"Loading Recycle Bin..."}</span>
                    </div>
                  </td>
                </tr>
              ) : items.length === 0 ? (
                <tr>
                  <td colSpan={6} className="py-12 text-center text-neutral-400">
                    <div className="flex flex-col items-center gap-2">
                      <div className="w-12 h-12 rounded-2xl bg-neutral-100 text-neutral-400 flex items-center justify-center">
                        <Trash2 className="w-6 h-6" />
                      </div>
                      <span className="font-bold text-neutral-700 text-sm">
                        {"Recycle Bin is empty"}
                      </span>
                      <span className="text-xs text-neutral-400 max-w-md">
                        {"Deleted orders, products, reviews, media files, sliders, and coupons will appear here so you can restore them or delete them permanently."}
                      </span>
                    </div>
                  </td>
                </tr>
              ) : (
                items.map((item) => {
                  const meta = TYPE_META[item.item_type] || TYPE_META.ALL;
                  const TypeIcon = meta.icon;
                  const isChecked = selectedIds.includes(item.id);
                  const isBusy = busyId === item.id;

                  return (
                    <tr
                      key={item.id}
                      className={`transition-colors ${
                        isChecked ? "bg-emerald-50/40" : "hover:bg-neutral-50/80"
                      }`}
                    >
                      <td className="py-3.5 px-4">
                        <button
                          type="button"
                          onClick={() => toggleSelect(item.id)}
                          className={`w-4 h-4 rounded border flex items-center justify-center transition-colors cursor-pointer ${
                            isChecked
                              ? "bg-emerald-600 border-emerald-600 text-white"
                              : "border-neutral-300 bg-white"
                          }`}
                        >
                          {isChecked && <Check className="w-3 h-3" />}
                        </button>
                      </td>

                      <td className="py-3.5 px-4">
                        <div className="flex items-center gap-3 min-w-[220px]">
                          {item.thumbnail_url ? (
                            <img
                              src={item.thumbnail_url}
                              alt={item.title}
                              onError={handleProductImageError}
                              className="w-11 h-11 rounded-xl object-cover border border-neutral-200 bg-neutral-100 shrink-0"
                            />
                          ) : (
                            <div className="w-11 h-11 rounded-xl bg-neutral-100 border border-neutral-200 flex items-center justify-center text-neutral-500 shrink-0">
                              <TypeIcon className="w-5 h-5" />
                            </div>
                          )}
                          <div className="min-w-0">
                            <span className="font-bold text-neutral-900 block truncate max-w-xs">
                              {item.title}
                            </span>
                            {item.subtitle && (
                              <span className="text-[11px] text-neutral-500 block truncate max-w-md">
                                {item.subtitle}
                              </span>
                            )}
                          </div>
                        </div>
                      </td>

                      <td className="py-3.5 px-4">
                        <span className={`inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-[10px] font-bold ${meta.badgeBg}`}>
                          <TypeIcon className="w-3 h-3" />
                          <span>{meta.label}</span>
                        </span>
                      </td>

                      <td className="py-3.5 px-4 font-mono text-[11px] text-neutral-600">
                        {item.original_id}
                      </td>

                      <td className="py-3.5 px-4 text-neutral-500">
                        <div className="flex items-center gap-1 text-[11px]">
                          <Clock className="w-3 h-3 text-neutral-400" />
                          <span>{formatBDTDateTime(item.deleted_at, true)}</span>
                        </div>
                        <span className="text-[10px] text-neutral-400 block">
                          by {item.deleted_by || "Admin"}
                        </span>
                      </td>

                      <td className="py-3.5 px-4 text-right">
                        <div className="flex items-center justify-end gap-2">
                          <button
                            type="button"
                            disabled={isBusy || busyId !== null}
                            onClick={() => handleRestore(item)}
                            className="px-3 py-1.5 rounded-xl bg-emerald-50 hover:bg-emerald-100 text-emerald-700 border border-emerald-200 font-bold text-[11px] transition-colors flex items-center gap-1.5 cursor-pointer disabled:opacity-50"
                          >
                            {isBusy ? (
                              <Loader2 className="w-3.5 h-3.5 animate-spin" />
                            ) : (
                              <RotateCcw className="w-3.5 h-3.5" />
                            )}
                            <span>{"Restore"}</span>
                          </button>

                          <button
                            type="button"
                            disabled={isBusy || busyId !== null}
                            onClick={() => setConfirmDialog({ mode: "single", item })}
                            className="px-3 py-1.5 rounded-xl bg-rose-50 hover:bg-rose-100 text-rose-700 border border-rose-200 font-bold text-[11px] transition-colors flex items-center gap-1.5 cursor-pointer disabled:opacity-50"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                            <span>{"Delete Forever"}</span>
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Permanent Delete Confirmation Modal */}
      {confirmDialog && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-xs">
          <div className="bg-white rounded-3xl border border-neutral-200 shadow-2xl w-full max-w-md p-6 space-y-4">
            <div className="flex items-start gap-3">
              <div className="w-11 h-11 rounded-2xl bg-rose-100 text-rose-600 flex items-center justify-center shrink-0">
                <AlertTriangle className="w-6 h-6" />
              </div>
              <div>
                <h3 className="text-base font-black text-neutral-900">
                  {confirmDialog.mode === "empty"
                    ? "Empty Recycle Bin Permanently?"
                    : confirmDialog.mode === "bulk"
                    ? `Delete ${selectedIds.length} Items Permanently?`
                    : "Delete Permanently from Database?"}
                </h3>
                <p className="text-xs text-neutral-600 mt-1">
                  {confirmDialog.mode === "single" && confirmDialog.item
                    ? `"${confirmDialog.item.title}" will be permanently removed from the central database and cannot be restored again.`
                    : "These items (and unreferenced uploaded media files) will be permanently erased from the central database across all devices. This action cannot be undone."}
                </p>
              </div>
            </div>

            <div className="flex items-center justify-end gap-2.5 pt-2">
              <button
                type="button"
                onClick={() => setConfirmDialog(null)}
                className="px-4 py-2 rounded-xl border border-neutral-200 hover:bg-neutral-50 text-neutral-700 font-bold text-xs cursor-pointer"
              >
                {"Cancel"}
              </button>
              <button
                type="button"
                onClick={handleExecuteConfirmDelete}
                className="px-4 py-2 rounded-xl bg-rose-600 hover:bg-rose-700 text-white font-bold text-xs shadow-sm cursor-pointer flex items-center gap-1.5"
              >
                <Trash2 className="w-3.5 h-3.5" />
                <span>{"Yes, Delete Permanently"}</span>
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default AdminRecycleBin;

