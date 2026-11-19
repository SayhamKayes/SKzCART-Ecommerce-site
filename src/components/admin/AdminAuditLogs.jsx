import { useState, useEffect } from "react";
import {
  ChevronLeft,
  ChevronRight,
  Trash2,
  Check,
  AlertTriangle,
  ShieldCheck,
  KeyRound,
  Mail,
  Smartphone,
  Copy,
  RefreshCw,
  CheckCircle2,
  Lock
} from "lucide-react";
import { useLanguage } from "../../Context/LanguageContext";
import { apiClient } from "../../services/api";
import { realtimeService } from "../../services/realtime";

const AdminAuditLogs = ({ logs = [], onRefresh }) => {
  const { isEnglish } = useLanguage();
  const [currentPage, setCurrentPage] = useState(1);
  const [selectedIds, setSelectedIds] = useState([]);
  const [deleteConfirm, setDeleteConfirm] = useState(null); // { mode: 'single' | 'bulk', log?: object }
  const [isDeleting, setIsDeleting] = useState(false);

  // Two-Step Verification (2FA) State
  const [secConfig, setSecConfig] = useState(null);
  const [secLoading, setSecLoading] = useState(true);
  const [secSaving, setSecSaving] = useState(false);
  const [secFeedback, setSecFeedback] = useState(null);
  const [methodDraft, setMethodDraft] = useState("TOTP");
  const [scopeDraft, setScopeDraft] = useState("ALL_STAFF");
  const [verifyCodeInput, setVerifyCodeInput] = useState("");
  const [recoveryPinInput, setRecoveryPinInput] = useState("");
  const [copiedSecret, setCopiedSecret] = useState(false);

  const loadSecurityConfig = async () => {
    setSecLoading(true);
    try {
      const res = await apiClient.getSecurity2FA();
      if (res?.success && res?.security) {
        setSecConfig(res.security);
        setMethodDraft(res.security.twoFactorMethod || "TOTP");
        setScopeDraft(res.security.twoFactorScope || "ALL_STAFF");
      }
    } catch { } finally {
      setSecLoading(false);
    }
  };

  useEffect(() => {
    loadSecurityConfig();
  }, []);

  const handleSave2FA = async (nextEnabled) => {
    setSecSaving(true);
    setSecFeedback(null);
    try {
      const res = await apiClient.updateSecurity2FA({
        action: "update",
        twoFactorEnabled: nextEnabled,
        twoFactorMethod: methodDraft,
        twoFactorScope: scopeDraft,
        verificationCode: verifyCodeInput.trim(),
        recoveryPin: recoveryPinInput.trim(),
      });
      if (res?.success && res?.security) {
        setSecConfig(res.security);
        setVerifyCodeInput("");
        setRecoveryPinInput("");
        setSecFeedback({ type: "success", text: res.message || "Two-Step Verification updated." });
        if (typeof onRefresh === "function") await onRefresh();
      } else {
        setSecFeedback({ type: "error", text: res?.message || "Failed to update Two-Step Verification." });
      }
    } catch {
      setSecFeedback({ type: "error", text: "Server error while saving 2FA settings." });
    } finally {
      setSecSaving(false);
    }
  };

  const handleRegenerateSecret = async () => {
    setSecSaving(true);
    setSecFeedback(null);
    try {
      const res = await apiClient.updateSecurity2FA({ action: "regenerate_secret" });
      if (res?.success && res?.security) {
        setSecConfig(res.security);
        setSecFeedback({ type: "success", text: res.message });
        if (typeof onRefresh === "function") await onRefresh();
      }
    } finally {
      setSecSaving(false);
    }
  };

  const handleCopySecret = () => {
    if (!secConfig?.setupSecret) return;
    navigator.clipboard?.writeText(secConfig.setupSecret);
    setCopiedSecret(true);
    setTimeout(() => setCopiedSecret(false), 2000);
  };
  const itemsPerPage = 10;

  const totalLogs = logs.length;
  const totalPages = Math.ceil(totalLogs / itemsPerPage) || 1;
  const startIndex = (currentPage - 1) * itemsPerPage;
  const endIndex = Math.min(startIndex + itemsPerPage, totalLogs);
  const paginatedLogs = logs.slice(startIndex, endIndex);

  const toggleSelect = (id) => {
    setSelectedIds((prev) =>
      prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id]
    );
  };

  const allVisibleSelected =
    paginatedLogs.length > 0 && paginatedLogs.every((l) => selectedIds.includes(l.id));

  const toggleSelectAllVisible = () => {
    if (allVisibleSelected) {
      const visible = new Set(paginatedLogs.map((l) => l.id));
      setSelectedIds((prev) => prev.filter((id) => !visible.has(id)));
    } else {
      setSelectedIds(Array.from(new Set([...selectedIds, ...paginatedLogs.map((l) => l.id)])));
    }
  };

  const handleExecuteDelete = async () => {
    if (!deleteConfirm) return;
    const target = deleteConfirm;
    setDeleteConfirm(null);
    setIsDeleting(true);
    try {
      if (target.mode === "single" && target.log) {
        const res = await apiClient.deleteAuditLog(target.log.id);
        if (res && res.success) {
          setSelectedIds((prev) => prev.filter((id) => id !== target.log.id));
        }
      } else if (target.mode === "bulk" && selectedIds.length > 0) {
        const res = await apiClient.bulkDeleteAuditLogs(selectedIds);
        if (res && res.success) {
          setSelectedIds([]);
        }
      }
      if (typeof onRefresh === "function") await onRefresh();
      try {
        realtimeService.broadcast("AUDIT_LOG_UPDATED", {});
        realtimeService.broadcast("RECYCLE_BIN_UPDATED", { itemType: "AUDIT_LOG" });
      } catch {}
    } finally {
      setIsDeleting(false);
    }
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="bg-white rounded-3xl p-6 border border-neutral-200 shadow-xs flex flex-wrap items-center justify-between gap-4">
        <div>
          <span className="text-xs font-bold uppercase tracking-wider text-rose-700 bg-rose-50 px-2.5 py-1 rounded-full">
            {"Security & Compliance"}
          </span>
          <h1 className="text-2xl font-black text-neutral-900 mt-2">
            {"Security & Immutable Audit Logs"}
          </h1>
          <p className="text-xs text-neutral-500">
            {"Tracking all actions, order status mutations and IP addresses across admins, operators and buyers."}
          </p>
        </div>

        {/* Top Header Pagination (matching user-marked red box) */}
        {totalPages > 1 && (
          <div className="flex items-center gap-1 self-end sm:self-center">
            <button
              type="button"
              disabled={currentPage === 1}
              onClick={() => setCurrentPage((p) => Math.max(1, p - 1))}
              className="p-1.5 rounded-lg border border-neutral-200 hover:bg-neutral-100 disabled:opacity-40 disabled:hover:bg-transparent text-neutral-700 font-semibold transition-colors flex items-center cursor-pointer text-xs"
              title={"Previous page"}
            >
              <ChevronLeft className="w-3.5 h-3.5" />
            </button>

            {Array.from({ length: totalPages }, (_, i) => i + 1)
              .filter(
                (num) =>
                  num === 1 ||
                  num === totalPages ||
                  (num >= currentPage - 1 && num <= currentPage + 1)
              )
              .reduce((acc, num, idx, arr) => {
                if (idx > 0 && num - arr[idx - 1] > 1) {
                  acc.push("...");
                }
                acc.push(num);
                return acc;
              }, [])
              .map((item, idx) =>
                item === "..." ? (
                  <span key={`top-dots-${idx}`} className="px-1 text-neutral-400 font-bold text-xs">
                    ...
                  </span>
                ) : (
                  <button
                    key={`top-page-${item}`}
                    type="button"
                    onClick={() => setCurrentPage(item)}
                    className={`w-7 h-7 rounded-lg font-bold text-xs transition-colors cursor-pointer ${
                      currentPage === item
                        ? "bg-neutral-900 text-white shadow-xs"
                        : "hover:bg-neutral-100 text-neutral-700 border border-neutral-200 bg-white"
                    }`}
                  >
                    {item}
                  </button>
                )
              )}

            <button
              type="button"
              disabled={currentPage === totalPages}
              onClick={() => setCurrentPage((p) => Math.min(totalPages, p + 1))}
              className="p-1.5 rounded-lg border border-neutral-200 hover:bg-neutral-100 disabled:opacity-40 disabled:hover:bg-transparent text-neutral-700 font-semibold transition-colors flex items-center cursor-pointer text-xs"
              title={"Next page"}
            >
              <ChevronRight className="w-3.5 h-3.5" />
            </button>
          </div>
        )}
      </div>

      {/* Two-Step Verification (2FA) Security Panel */}
      <div className="bg-white rounded-3xl p-6 border border-neutral-200 shadow-xs space-y-5">
        <div className="flex flex-wrap items-center justify-between gap-3 pb-4 border-b border-neutral-100">
          <div className="flex items-start gap-3">
            <div className={`w-11 h-11 rounded-2xl flex items-center justify-center shrink-0 border ${secConfig?.twoFactorEnabled ? "bg-emerald-50 border-emerald-200 text-emerald-700" : "bg-amber-50 border-amber-200 text-amber-700"}`}>
              <ShieldCheck className="w-5 h-5" />
            </div>
            <div>
              <div className="flex items-center gap-2 flex-wrap">
                <h2 className="text-base font-black text-neutral-900">
                  {"Two-Step Verification (2FA)"}
                </h2>
                <span className={`text-[10px] font-extrabold px-2.5 py-0.5 rounded-full border ${secConfig?.twoFactorEnabled ? "bg-emerald-100 text-emerald-800 border-emerald-200" : "bg-amber-100 text-amber-800 border-amber-200"}`}>
                  {secLoading ? "Loading..." : secConfig?.twoFactorEnabled ? "2FA Active (Protected)" : "2FA Disabled"}
                </span>
              </div>
              <p className="text-xs text-neutral-500 mt-0.5">
                {"Protect Admin & Staff logins with an extra 6-digit verification code via Authenticator App or Email OTP."}
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            {secConfig?.twoFactorEnabled ? (
              <button
                type="button"
                disabled={secSaving || secLoading}
                onClick={() => handleSave2FA(false)}
                className="px-4 py-2 rounded-xl bg-rose-50 hover:bg-rose-100 text-rose-700 border border-rose-200 font-bold text-xs transition-colors cursor-pointer disabled:opacity-50"
              >
                {secSaving ? "Updating..." : "Disable 2FA"}
              </button>
            ) : (
              <button
                type="button"
                disabled={secSaving || secLoading}
                onClick={() => handleSave2FA(true)}
                className="px-4 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs shadow-sm transition-colors cursor-pointer disabled:opacity-50"
              >
                {secSaving ? "Activating..." : "Enable 2FA Protection"}
              </button>
            )}
          </div>
        </div>

        {secFeedback && (
          <div className={`p-3 rounded-xl text-xs font-semibold flex items-center gap-2 border ${secFeedback.type === "success" ? "bg-emerald-50 border-emerald-200 text-emerald-800" : "bg-rose-50 border-rose-200 text-rose-700"}`}>
            {secFeedback.type === "success" ? <CheckCircle2 className="w-4 h-4 shrink-0" /> : <AlertTriangle className="w-4 h-4 shrink-0" />}
            <span>{secFeedback.text}</span>
          </div>
        )}

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-5 text-xs">
          {/* Method & Scope */}
          <div className="space-y-4 p-4 rounded-2xl bg-neutral-50 border border-neutral-200">
            <div>
              <label className="block font-bold text-neutral-800 mb-2">{"Verification Method"}</label>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                <button
                  type="button"
                  onClick={() => setMethodDraft("TOTP")}
                  className={`p-3 rounded-xl border text-left transition-all cursor-pointer flex items-start gap-2.5 ${methodDraft === "TOTP" ? "bg-emerald-50 border-emerald-500 text-emerald-950 ring-1 ring-emerald-500" : "bg-white border-neutral-200 text-neutral-700 hover:border-neutral-300"}`}
                >
                  <Smartphone className="w-4 h-4 text-emerald-600 shrink-0 mt-0.5" />
                  <div>
                    <span className="font-bold block">Authenticator App</span>
                    <span className="text-[10px] text-neutral-500">Google Authenticator / Authy (Offline Ready)</span>
                  </div>
                </button>

                <button
                  type="button"
                  onClick={() => setMethodDraft("EMAIL_OTP")}
                  className={`p-3 rounded-xl border text-left transition-all cursor-pointer flex items-start gap-2.5 ${methodDraft === "EMAIL_OTP" ? "bg-emerald-50 border-emerald-500 text-emerald-950 ring-1 ring-emerald-500" : "bg-white border-neutral-200 text-neutral-700 hover:border-neutral-300"}`}
                >
                  <Mail className="w-4 h-4 text-emerald-600 shrink-0 mt-0.5" />
                  <div>
                    <span className="font-bold block">Email 6-Digit OTP</span>
                    <span className="text-[10px] text-neutral-500">
                      {secConfig?.smtpConfigured ? "SMTP Ready (Sends to staff email)" : "Configure SMTP in Notifications"}
                    </span>
                  </div>
                </button>
              </div>
            </div>

            <div>
              <label className="block font-bold text-neutral-800 mb-1.5">{"Required Role Scope"}</label>
              <select
                value={scopeDraft}
                onChange={(e) => setScopeDraft(e.target.value)}
                className="w-full px-3.5 py-2.5 rounded-xl bg-white border border-neutral-300 text-xs font-semibold text-neutral-900 focus:border-emerald-500"
              >
                <option value="ALL_STAFF">All Portal Logins (Super Admin, Manager & Dispatcher)</option>
                <option value="ADMIN_ONLY">Super Admin Logins Only</option>
              </select>
            </div>

            {secConfig?.twoFactorEnabled && (
              <div className="pt-1">
                <button
                  type="button"
                  disabled={secSaving}
                  onClick={() => handleSave2FA(true)}
                  className="px-4 py-2 rounded-xl bg-neutral-900 hover:bg-neutral-800 text-white font-bold text-xs cursor-pointer disabled:opacity-50"
                >
                  Save Updated 2FA Policy
                </button>
              </div>
            )}
          </div>

          {/* Setup Key, Test Code & Backup PIN */}
          <div className="space-y-3.5 p-4 rounded-2xl bg-neutral-50 border border-neutral-200">
            {methodDraft === "TOTP" && secConfig?.setupSecret && (
              <div className="space-y-2">
                <div className="flex items-center justify-between gap-2">
                  <span className="font-bold text-neutral-800 flex items-center gap-1.5">
                    <KeyRound className="w-3.5 h-3.5 text-emerald-600" />
                    {"Authenticator Setup Key (Manual Entry)"}
                  </span>
                  <button
                    type="button"
                    onClick={handleRegenerateSecret}
                    disabled={secSaving}
                    className="text-[11px] font-bold text-neutral-600 hover:text-neutral-900 flex items-center gap-1 cursor-pointer"
                  >
                    <RefreshCw className="w-3 h-3" />
                    <span>New Key</span>
                  </button>
                </div>
                <div className="flex items-center gap-2">
                  <code className="flex-1 px-3 py-2 rounded-xl bg-white border border-neutral-300 font-mono text-[11px] font-bold text-neutral-900 tracking-wider overflow-x-auto">
                    {secConfig.setupSecret}
                  </code>
                  <button
                    type="button"
                    onClick={handleCopySecret}
                    className="px-3 py-2 rounded-xl bg-neutral-900 hover:bg-neutral-800 text-white font-bold text-[11px] flex items-center gap-1 cursor-pointer shrink-0"
                  >
                    {copiedSecret ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5" />}
                    <span>{copiedSecret ? "Copied" : "Copy"}</span>
                  </button>
                </div>
              </div>
            )}

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              {methodDraft === "TOTP" && !secConfig?.twoFactorEnabled && (
                <div>
                  <label className="block font-bold text-neutral-700 mb-1">
                    {"Verify 6-Digit App Code"}
                  </label>
                  <input
                    type="text"
                    inputMode="numeric"
                    maxLength={6}
                    value={verifyCodeInput}
                    onChange={(e) => setVerifyCodeInput(e.target.value.replace(/\D/g, ""))}
                    placeholder="e.g. 123456"
                    className="w-full px-3 py-2 rounded-xl bg-white border border-neutral-300 font-mono text-xs font-bold text-neutral-900"
                  />
                </div>
              )}

              <div className={methodDraft === "TOTP" && !secConfig?.twoFactorEnabled ? "" : "sm:col-span-2"}>
                <label className="block font-bold text-neutral-700 mb-1 flex items-center gap-1">
                  <Lock className="w-3 h-3 text-emerald-600" />
                  <span>{secConfig?.hasRecoveryPin ? "Update Emergency 6-Digit Backup PIN" : "Set Emergency 6-Digit Backup PIN (Recommended)"}</span>
                </label>
                <input
                  type="password"
                  inputMode="numeric"
                  maxLength={6}
                  value={recoveryPinInput}
                  onChange={(e) => setRecoveryPinInput(e.target.value.replace(/\D/g, ""))}
                  placeholder={secConfig?.hasRecoveryPin ? "Backup PIN set (enter new to change)" : "Enter 6-digit backup PIN"}
                  className="w-full px-3 py-2 rounded-xl bg-white border border-neutral-300 font-mono text-xs font-bold text-neutral-900"
                />
              </div>
            </div>
            <p className="text-[11px] text-neutral-500">
              {"Setting a 6-digit Backup PIN prevents accidental lockout if you switch phones or email SMTP is temporarily offline."}
            </p>
          </div>
        </div>
      </div>

      {/* Logs Table */}
      <div className="bg-white rounded-3xl border border-neutral-200 shadow-xs overflow-hidden">
        {selectedIds.length > 0 && (
          <div className="px-5 py-3 bg-rose-50/60 border-b border-rose-200 flex items-center justify-between gap-3 text-xs">
            <span className="font-bold text-neutral-800">
              {selectedIds.length} audit log(s) selected
            </span>
            <button
              type="button"
              disabled={isDeleting}
              onClick={() => setDeleteConfirm({ mode: "bulk" })}
              className="px-3.5 py-1.5 rounded-xl bg-rose-600 hover:bg-rose-700 text-white font-bold text-xs flex items-center gap-1.5 cursor-pointer disabled:opacity-50"
            >
              <Trash2 className="w-3.5 h-3.5" />
              <span>{"Delete Selected"}</span>
            </button>
          </div>
        )}
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead className="bg-neutral-50 text-neutral-500 font-bold border-b border-neutral-200">
              <tr>
                <th className="py-3 px-4 w-10">
                  <button
                    type="button"
                    onClick={toggleSelectAllVisible}
                    className={`w-4 h-4 rounded border flex items-center justify-center transition-colors cursor-pointer ${
                      allVisibleSelected
                        ? "bg-emerald-600 border-emerald-600 text-white"
                        : "border-neutral-300 bg-white"
                    }`}
                    title="Select All on Page"
                  >
                    {allVisibleSelected && <Check className="w-3 h-3" />}
                  </button>
                </th>
                <th className="py-3 px-4">{"Date & Time"}</th>
                <th className="py-3 px-4">{"Operator & Role"}</th>
                <th className="py-3 px-4">{"Action"}</th>
                <th className="py-3 px-4">{"Resource / Order"}</th>
                <th className="py-3 px-4">{"Details / Change"}</th>
                <th className="py-3 px-4 text-right">{"IP Address"}</th>
                <th className="py-3 px-4 text-right">{"Actions"}</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-neutral-100">
              {totalLogs === 0 ? (
                <tr>
                  <td colSpan={8} className="py-8 text-center text-neutral-400">
                    {"No audit logs recorded yet."}
                  </td>
                </tr>
              ) : (
                paginatedLogs.map((log) => (
                  <tr
                    key={log.id}
                    className={`transition-colors ${
                      selectedIds.includes(log.id) ? "bg-rose-50/30" : "hover:bg-neutral-50/80"
                    }`}
                  >
                    <td className="py-3.5 px-4">
                      <button
                        type="button"
                        onClick={() => toggleSelect(log.id)}
                        className={`w-4 h-4 rounded border flex items-center justify-center transition-colors cursor-pointer ${
                          selectedIds.includes(log.id)
                            ? "bg-emerald-600 border-emerald-600 text-white"
                            : "border-neutral-300 bg-white"
                        }`}
                      >
                        {selectedIds.includes(log.id) && <Check className="w-3 h-3" />}
                      </button>
                    </td>
                    <td className="py-3.5 px-4 font-mono text-neutral-500 text-[11px]">
                      {log.timestamp}
                    </td>
                    <td className="py-3.5 px-4">
                      <span className="font-bold text-neutral-900 block">{log.actor}</span>
                      <span className="text-[10px] text-emerald-700 font-semibold uppercase">
                        {log.role}
                      </span>
                    </td>
                    <td className="py-3.5 px-4">
                      <span className="font-mono font-bold bg-neutral-100 text-neutral-800 px-2 py-0.5 rounded text-[11px]">
                        {log.action}
                      </span>
                    </td>
                    <td className="py-3.5 px-4 font-mono font-semibold text-neutral-900">
                      {log.targetType} #{log.targetId}
                    </td>
                    <td className="py-3.5 px-4 text-neutral-700">{log.details}</td>
                    <td className="py-3.5 px-4 text-right font-mono text-neutral-400 text-[11px]">
                      {log.ipAddress}
                    </td>
                    <td className="py-3.5 px-4 text-right">
                      <button
                        type="button"
                        disabled={isDeleting}
                        onClick={() => setDeleteConfirm({ mode: "single", log })}
                        className="p-1.5 rounded-lg border border-rose-200 bg-rose-50 hover:bg-rose-100 text-rose-600 transition-colors cursor-pointer disabled:opacity-50"
                        title={"Delete Audit Log (Move to Recycle Bin)"}
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>

        {/* Bottom Pagination Bar */}
        {totalPages > 1 && (
          <div className="p-4 border-t border-neutral-200 bg-white flex flex-wrap items-center justify-between gap-3 text-xs">
            <div className="text-neutral-500 font-medium">
              {`Showing ${totalLogs > 0 ? startIndex + 1 : 0}-${endIndex} of ${totalLogs} logs`}
            </div>

            <div className="flex items-center gap-1">
              <button
                type="button"
                disabled={currentPage === 1}
                onClick={() => setCurrentPage((p) => Math.max(1, p - 1))}
                className="px-2.5 py-1.5 rounded-lg border border-neutral-200 hover:bg-neutral-100 disabled:opacity-40 disabled:hover:bg-transparent text-neutral-700 font-semibold transition-colors flex items-center gap-1 cursor-pointer"
              >
                <ChevronLeft className="w-3.5 h-3.5" />
                <span className="hidden sm:inline">{"Previous"}</span>
              </button>

              {Array.from({ length: totalPages }, (_, i) => i + 1)
                .filter(
                  (num) =>
                    num === 1 ||
                    num === totalPages ||
                    (num >= currentPage - 1 && num <= currentPage + 1)
                )
                .reduce((acc, num, idx, arr) => {
                  if (idx > 0 && num - arr[idx - 1] > 1) {
                    acc.push("...");
                  }
                  acc.push(num);
                  return acc;
                }, [])
                .map((item, idx) =>
                  item === "..." ? (
                    <span key={`dots-${idx}`} className="px-2 text-neutral-400 font-bold">
                      ...
                    </span>
                  ) : (
                    <button
                      key={`page-${item}`}
                      type="button"
                      onClick={() => setCurrentPage(item)}
                      className={`w-8 h-8 rounded-lg font-bold text-xs transition-colors cursor-pointer ${
                        currentPage === item
                          ? "bg-neutral-900 text-white shadow-xs"
                          : "hover:bg-neutral-100 text-neutral-700 border border-neutral-200"
                      }`}
                    >
                      {item}
                    </button>
                  )
                )}

              <button
                type="button"
                disabled={currentPage === totalPages}
                onClick={() => setCurrentPage((p) => Math.min(totalPages, p + 1))}
                className="px-2.5 py-1.5 rounded-lg border border-neutral-200 hover:bg-neutral-100 disabled:opacity-40 disabled:hover:bg-transparent text-neutral-700 font-semibold transition-colors flex items-center gap-1 cursor-pointer"
              >
                <span className="hidden sm:inline">{"Next"}</span>
                <ChevronRight className="w-3.5 h-3.5" />
              </button>
            </div>
          </div>
        )}
      </div>

      {/* Delete Confirmation Modal */}
      {deleteConfirm && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-xs">
          <div className="bg-white rounded-3xl border border-neutral-200 shadow-2xl w-full max-w-md p-6 space-y-4">
            <div className="flex items-start gap-3">
              <div className="w-11 h-11 rounded-2xl bg-rose-100 text-rose-600 flex items-center justify-center shrink-0">
                <AlertTriangle className="w-6 h-6" />
              </div>
              <div>
                <h3 className="text-base font-black text-neutral-900">
                  {deleteConfirm.mode === "bulk"
                    ? `Move ${selectedIds.length} Audit Logs to Recycle Bin?`
                    : "Move Audit Log to Recycle Bin?"}
                </h3>
                <p className="text-xs text-neutral-600 mt-1">
                  {"Deleted audit logs are moved to the "}
                  <strong className="text-neutral-900">{"Recycle Bin"}</strong>
                  {". You can restore them or permanently erase them from the database later."}
                </p>
              </div>
            </div>
            <div className="flex items-center justify-end gap-2.5 pt-2">
              <button
                type="button"
                onClick={() => setDeleteConfirm(null)}
                className="px-4 py-2 rounded-xl border border-neutral-200 hover:bg-neutral-50 text-neutral-700 font-bold text-xs cursor-pointer"
              >
                {"Cancel"}
              </button>
              <button
                type="button"
                disabled={isDeleting}
                onClick={handleExecuteDelete}
                className="px-4 py-2 rounded-xl bg-rose-600 hover:bg-rose-700 text-white font-bold text-xs shadow-sm cursor-pointer flex items-center gap-1.5"
              >
                <Trash2 className="w-3.5 h-3.5" />
                <span>{"Move to Recycle Bin"}</span>
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export { AdminAuditLogs };
