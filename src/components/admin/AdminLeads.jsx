import { useState, useMemo, useEffect } from "react";
import {
  Users,
  Mail,
  Phone,
  MapPin,
  Home,
  Search,
  Send,
  X,
  ShoppingBag,
  CreditCard,
  CheckCircle2,
  AlertCircle,
  Loader2,
  Eye
} from "lucide-react";
import { formatBDT, formatBDTDateTime } from "../../utils/bangladesh";
import { apiClient } from "../../services/api";
import { realtimeService } from "../../services/realtime";
import { useThemeConfig } from "../frontPanel/FrontPanelContext";

const isPlaceholderEmail = (email) =>
  !email || !email.includes("@") || email.toLowerCase().endsWith("@customer.amardokan.com");

const formatLocationLabel = (thana, district) => {
  const parts = [String(thana || "").trim(), String(district || "").trim()].filter(Boolean);
  return parts.join(", ");
};

const AdminLeads = ({ orders = [] }) => {
  const { themeConfig } = useThemeConfig();
  const shopCfg = themeConfig?.shop || {};
  const storeName = String(shopCfg.name || "").trim() || "AmarDokan";
  const smtpUser = String(shopCfg.emailHostUser || "").trim();
  const smtpPass = String(shopCfg.emailHostPassword || "").trim();
  const smtpHost = String(shopCfg.emailHost || "smtp.gmail.com").trim();
  const emailEnabled = shopCfg.emailEnabled !== false;
  const isSmtpReady = Boolean(emailEnabled && smtpUser && smtpPass);

  const [searchQuery, setSearchQuery] = useState("");
  const [channelFilter, setChannelFilter] = useState("ALL"); // ALL | HAS_EMAIL | SSLCOMMERZ | MFS | COD
  const [selectedLead, setSelectedLead] = useState(null);

  // Email Composer state inside Lead Details Popup
  const [emailRecipient, setEmailRecipient] = useState("");
  const [emailSubject, setEmailSubject] = useState("");
  const [emailBody, setEmailBody] = useState("");
  const [isSendingEmail, setIsSendingEmail] = useState(false);
  const [emailStatus, setEmailStatus] = useState(null); // { success, message }

  useEffect(() => {
    if (!selectedLead) return;
    const onKey = (e) => {
      if (e.key === "Escape") setSelectedLead(null);
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [selectedLead]);

  const leads = useMemo(() => {
    const grouped = new Map();
    const safeOrders = [...(Array.isArray(orders) ? orders : [])].sort((a, b) =>
      String(b?.createdAt || "").localeCompare(String(a?.createdAt || ""))
    );

    for (const o of safeOrders) {
      if (!o || typeof o !== "object") continue;
      const addr = o.address && typeof o.address === "object" ? o.address : {};
      const phone = String(addr.phone ?? "").trim();
      const rawEmail = String(o.customerEmail ?? addr.email ?? "").trim();
      const realEmail = !isPlaceholderEmail(rawEmail) ? rawEmail : "";
      const key = phone || realEmail || String(o.id ?? grouped.size);

      const safeName = String(addr.customerName || "").trim();
      const safeDistrict = String(addr.district || "").trim();
      const safeThana = String(addr.thana || "").trim();
      const safeFullAddress = String(addr.fullAddress || addr.address || "").trim();

      if (!grouped.has(key)) {
        grouped.set(key, {
          id: key,
          name: safeName || "Customer",
          phone: phone || "N/A",
          email: realEmail,
          district: safeDistrict,
          thana: safeThana,
          fullAddress: safeFullAddress,
          totalSpent: 0,
          ordersCount: 0,
          paymentMethods: new Set(),
          purchasedProducts: [],
          orderHistory: [],
          lastOrderAt: String(o.createdAt || ""),
        });
      }

      const lead = grouped.get(key);
      // Keep most recent non-empty profile fields (safeOrders is newest-first)
      if (safeName && safeName !== "Customer" && lead.name === "Customer") lead.name = safeName;
      if (realEmail && !lead.email) lead.email = realEmail;
      if (safeDistrict && !lead.district) lead.district = safeDistrict;
      if (safeThana && !lead.thana) lead.thana = safeThana;
      if (safeFullAddress && !lead.fullAddress) lead.fullAddress = safeFullAddress;

      lead.ordersCount += 1;
      lead.totalSpent += Number(o.total || 0);
      if (o.paymentMethod) lead.paymentMethods.add(String(o.paymentMethod).toUpperCase());
      const createdStr = String(o.createdAt || "");
      if (createdStr && (!lead.lastOrderAt || createdStr > lead.lastOrderAt)) {
        lead.lastOrderAt = createdStr;
      }

      for (const item of Array.isArray(o.items) ? o.items : []) {
        if (!item || typeof item !== "object") continue;
        lead.purchasedProducts.push({
          orderId: o.id,
          name: String(item.name || "Product"),
          variant: String(item.variant || ""),
          quantity: Number(item.quantity || 1),
          price: Number(item.price || 0),
          image: String(item.image || ""),
        });
      }

      lead.orderHistory.push({
        id: o.id,
        createdAt: o.createdAt,
        total: Number(o.total || 0),
        paymentMethod: String(o.paymentMethod || "COD"),
        paymentStatus: String(o.paymentStatus || "UNPAID"),
        status: String(o.status || "PENDING"),
        trxId: String(addr.paymentTrxId || ""),
      });
    }

    return Array.from(grouped.values()).map((l) => ({
      ...l,
      locationText: formatLocationLabel(l.thana, l.district),
      paymentMethods: Array.from(l.paymentMethods),
      hasRealEmail: Boolean(l.email && !isPlaceholderEmail(l.email)),
    }));
  }, [orders]);

  const filteredLeads = useMemo(() => {
    const q = searchQuery.trim().toLowerCase();
    return leads.filter((l) => {
      if (channelFilter === "HAS_EMAIL" && !l.hasRealEmail) return false;
      if (channelFilter === "SSLCOMMERZ" && !l.paymentMethods.includes("SSLCOMMERZ")) return false;
      if (
        channelFilter === "MFS" &&
        !l.paymentMethods.some((m) => m === "BKASH" || m === "NAGAD" || m === "ROCKET")
      ) {
        return false;
      }
      if (channelFilter === "COD" && !l.paymentMethods.includes("COD")) return false;

      if (!q) return true;
      return (
        String(l.name || "").toLowerCase().includes(q) ||
        String(l.email || "").toLowerCase().includes(q) ||
        String(l.phone || "").toLowerCase().includes(q) ||
        String(l.locationText || "").toLowerCase().includes(q) ||
        String(l.fullAddress || "").toLowerCase().includes(q) ||
        l.purchasedProducts.some((p) => String(p.name || "").toLowerCase().includes(q))
      );
    });
  }, [leads, searchQuery, channelFilter]);

  const openLeadModal = (lead) => {
    setSelectedLead(lead);
    setEmailStatus(null);
    setEmailRecipient(lead.hasRealEmail ? lead.email : "");
    const firstProd = lead.purchasedProducts[0]?.name || "our products";
    setEmailSubject(`Thank you for shopping with ${storeName}, ${lead.name}!`);
    setEmailBody(
      `Hi ${lead.name},\n\nThank you for your recent purchase (${firstProd}) from ${storeName}. We hope you are enjoying it! Let us know if you need any assistance or would like to explore our newest arrivals.\n\nBest regards,\n${storeName} Team`
    );
  };

  const handleSendLeadEmail = async (e) => {
    e.preventDefault();
    const targetEmail = emailRecipient.trim();
    if (!targetEmail || !targetEmail.includes("@") || !targetEmail.split("@")[1]?.includes(".")) {
      setEmailStatus({ success: false, message: "Please enter a valid recipient email address." });
      return;
    }
    if (!emailSubject.trim() || !emailBody.trim()) {
      setEmailStatus({ success: false, message: "Subject and message body are required." });
      return;
    }
    setIsSendingEmail(true);
    setEmailStatus(null);
    try {
      const res = await apiClient.sendNotification({
        recipient: targetEmail,
        subject: emailSubject.trim(),
        messageText: emailBody.trim(),
        templateName: "LEAD_AUTOMATED_FOLLOWUP",
        orderId: selectedLead?.orderHistory[0]?.id || "LEAD-EMAIL",
      });
      const ok = Boolean(res?.success);
      if (ok) {
        realtimeService.publish({ type: "NOTIFICATION_DISPATCHED", recipient: targetEmail });
      }
      setEmailStatus({
        success: ok,
        message: res?.message || (ok ? `Email sent to ${targetEmail}` : "Failed to send email."),
      });
    } catch (err) {
      setEmailStatus({ success: false, message: err?.message || "Failed to dispatch email." });
    } finally {
      setIsSendingEmail(false);
    }
  };

  const totalLeadValue = leads.reduce((acc, l) => acc + l.totalSpent, 0);
  const emailableLeadsCount = leads.filter((l) => l.hasRealEmail).length;
  const repeatLeadsCount = leads.filter((l) => l.ordersCount > 1).length;

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="bg-white rounded-3xl p-5 sm:p-6 border border-neutral-200 shadow-xs flex flex-wrap items-center justify-between gap-4">
        <div>
          <span className="text-[11px] font-bold uppercase tracking-wider text-emerald-700 bg-emerald-50 px-2.5 py-1 rounded-full">
            {"Customer Intelligence & CRM"}
          </span>
          <h1 className="text-2xl font-black text-neutral-900 mt-1.5 flex items-center gap-2">
            <Users className="w-6 h-6 text-emerald-600" />
            <span>{"Lead Generation & Customer Directory"}</span>
          </h1>
          <p className="text-xs text-neutral-500 mt-0.5">
            {"Every buyer's contact info, address, payment gateway history, purchased products, and automated follow-up email actions."}
          </p>
        </div>

        <div
          className={`px-3 py-1.5 rounded-full border text-[11px] font-bold flex items-center gap-1.5 ${
            isSmtpReady
              ? "bg-emerald-50 border-emerald-200 text-emerald-800"
              : "bg-amber-50 border-amber-200 text-amber-800"
          }`}
        >
          <Mail className="w-3.5 h-3.5" />
          <span>
            {isSmtpReady
              ? `SMTP Ready (${smtpHost})`
              : !emailEnabled
              ? "Email Disabled in Notifications"
              : "SMTP Not Configured"}
          </span>
        </div>
      </div>

      {/* Summary KPI Row */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        {[
          { label: "Total Captured Leads", val: leads.length, sub: "Unique buyers from orders" },
          { label: "With Email Contacts", val: emailableLeadsCount, sub: "Verified emails for follow-up" },
          { label: "Repeat Customers", val: repeatLeadsCount, sub: "2+ orders placed" },
          { label: "Total Lead Revenue", val: formatBDT(totalLeadValue), sub: "Combined order value" },
        ].map((item) => (
          <div key={item.label} className="bg-white rounded-2xl p-4 border border-neutral-200 shadow-xs space-y-1">
            <span className="text-[11px] font-bold text-neutral-500 uppercase tracking-wider">{item.label}</span>
            <div className="text-2xl font-black text-neutral-900">{item.val}</div>
            <p className="text-[11px] text-neutral-400">{item.sub}</p>
          </div>
        ))}
      </div>

      {/* Filter & Search Bar */}
      <div className="bg-white rounded-2xl p-4 border border-neutral-200 shadow-xs flex flex-wrap items-center justify-between gap-3">
        <div className="relative flex-1 min-w-[240px]">
          <Search className="w-4 h-4 text-neutral-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            placeholder="Search leads by name, email, phone, location, address, or product..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full pl-10 pr-4 py-2 bg-neutral-50 rounded-xl border border-neutral-200 text-xs focus:bg-white focus:border-emerald-600 focus:outline-hidden"
          />
        </div>

        <div className="flex flex-wrap items-center gap-1.5 text-xs">
          {[
            { id: "ALL", label: "All Leads" },
            { id: "HAS_EMAIL", label: "With Email" },
            { id: "SSLCOMMERZ", label: "SSLCommerz" },
            { id: "MFS", label: "MFS" },
            { id: "COD", label: "COD" },
          ].map((f) => (
            <button
              key={f.id}
              type="button"
              onClick={() => setChannelFilter(f.id)}
              className={`px-3 py-1.5 rounded-xl font-bold cursor-pointer transition-all ${
                channelFilter === f.id
                  ? "bg-neutral-900 text-white"
                  : "bg-neutral-100 text-neutral-600 hover:bg-neutral-200"
              }`}
            >
              {f.label}
            </button>
          ))}
        </div>
      </div>

      {/* Short Overview Leads Table (Click any row to open A-to-Z Popup) */}
      <div className="bg-white rounded-3xl border border-neutral-200 shadow-xs overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead className="bg-neutral-50 text-neutral-500 font-bold border-b border-neutral-200">
              <tr>
                <th className="py-3 px-4">{"Customer & Contact"}</th>
                <th className="py-3 px-4">{"Address"}</th>
                <th className="py-3 px-4">{"Payment Method"}</th>
                <th className="py-3 px-4">{"Products Purchased"}</th>
                <th className="py-3 px-4">{"Total Spent"}</th>
                <th className="py-3 px-4 text-right">{"Details"}</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-neutral-100">
              {filteredLeads.length === 0 ? (
                <tr>
                  <td colSpan={6} className="py-12 text-center text-neutral-400">
                    {"No matching leads found."}
                  </td>
                </tr>
              ) : (
                filteredLeads.map((lead) => (
                  <tr
                    key={lead.id}
                    onClick={() => openLeadModal(lead)}
                    className="hover:bg-emerald-50/40 cursor-pointer transition-colors"
                  >
                    <td className="py-3 px-4">
                      <span className="font-bold text-neutral-900 block">{lead.name}</span>
                      <span className="text-[11px] text-emerald-700 font-mono block">{lead.phone}</span>
                      {lead.hasRealEmail && (
                        <span className="text-[10px] text-neutral-500 flex items-center gap-1 mt-0.5">
                          <Mail className="w-3 h-3 text-neutral-400" />
                          {lead.email}
                        </span>
                      )}
                    </td>
                    <td className="py-3 px-4 max-w-xs">
                      <span className="font-semibold text-neutral-800 block">
                        {lead.locationText || "—"}
                      </span>
                      <span className="text-[11px] text-neutral-500 line-clamp-1">
                        {lead.fullAddress || "No address provided"}
                      </span>
                    </td>
                    <td className="py-3 px-4">
                      <div className="flex flex-wrap gap-1">
                        {lead.paymentMethods.map((m) => (
                          <span key={m} className="px-2 py-0.5 rounded bg-neutral-100 text-neutral-800 font-bold text-[10px]">
                            {m}
                          </span>
                        ))}
                      </div>
                    </td>
                    <td className="py-3 px-4 max-w-xs">
                      <span className="font-semibold text-neutral-800 line-clamp-1">
                        {lead.purchasedProducts.map((p) => `${p.name} (×${p.quantity})`).join(", ") || "—"}
                      </span>
                      <span className="text-[10px] text-neutral-400">{`${lead.ordersCount} Order(s)`}</span>
                    </td>
                    <td className="py-3 px-4 font-black text-neutral-950">{formatBDT(lead.totalSpent)}</td>
                    <td className="py-3 px-4 text-right">
                      <button
                        type="button"
                        onClick={(e) => {
                          e.stopPropagation();
                          openLeadModal(lead);
                        }}
                        className="px-2.5 py-1.5 rounded-lg bg-neutral-900 hover:bg-emerald-700 text-white font-bold text-[11px] inline-flex items-center gap-1 cursor-pointer"
                      >
                        <Eye className="w-3.5 h-3.5" />
                        <span>{"View A-Z"}</span>
                      </button>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Lead A-Z Popup Window Modal */}
      {selectedLead && (
        <div
          className="fixed inset-0 z-50 overflow-y-auto bg-black/60 backdrop-blur-xs flex items-center justify-center p-4"
          onClick={() => setSelectedLead(null)}
          role="dialog"
          aria-modal="true"
          aria-labelledby="lead-detail-modal-title"
        >
          <div
            className="bg-white rounded-3xl border border-neutral-200 shadow-2xl w-full max-w-3xl max-h-[90vh] overflow-y-auto p-6 space-y-5"
            onClick={(e) => e.stopPropagation()}
          >
            {/* Modal Header */}
            <div className="flex items-start justify-between gap-4 border-b border-neutral-100 pb-4">
              <div className="min-w-0 flex-1">
                <span className="text-[10px] font-bold uppercase tracking-wider text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded-full">
                  {"Customer Lead Profile (A-Z)"}
                </span>
                <h2 id="lead-detail-modal-title" className="text-xl font-black text-neutral-900 mt-1">
                  {selectedLead.name}
                </h2>
                <div className="flex flex-wrap gap-x-4 gap-y-1.5 text-xs text-neutral-600 mt-1.5">
                  <span className="flex items-center gap-1 font-mono">
                    <Phone className="w-3.5 h-3.5 text-emerald-600 shrink-0" />
                    {selectedLead.phone}
                  </span>
                  {selectedLead.hasRealEmail && (
                    <span className="flex items-center gap-1">
                      <Mail className="w-3.5 h-3.5 text-blue-600 shrink-0" />
                      {selectedLead.email}
                    </span>
                  )}
                  <span className="flex items-center gap-1">
                    <MapPin className="w-3.5 h-3.5 text-rose-500 shrink-0" />
                    {selectedLead.locationText || "Location not specified"}
                  </span>
                </div>
                <div className="mt-2 flex items-start gap-1.5 text-xs text-neutral-700 bg-neutral-50 border border-neutral-200/80 rounded-xl px-3 py-2">
                  <Home className="w-3.5 h-3.5 text-emerald-600 shrink-0 mt-0.5" />
                  <div>
                    <span className="font-bold text-neutral-900 mr-1.5">{"Full Address:"}</span>
                    <span className="text-neutral-700 break-words">
                      {selectedLead.fullAddress || "Not provided"}
                    </span>
                  </div>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setSelectedLead(null)}
                aria-label="Close lead details modal"
                className="p-1.5 rounded-full hover:bg-neutral-100 text-neutral-400 hover:text-neutral-700 cursor-pointer shrink-0"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Spend Summary */}
            <div className="grid grid-cols-3 gap-3 text-xs">
              <div className="p-3 rounded-2xl bg-emerald-50 border border-emerald-200">
                <span className="text-[10px] font-bold text-emerald-700 uppercase block">{"Total Spent"}</span>
                <span className="text-lg font-black text-emerald-950">{formatBDT(selectedLead.totalSpent)}</span>
              </div>
              <div className="p-3 rounded-2xl bg-blue-50 border border-blue-200">
                <span className="text-[10px] font-bold text-blue-700 uppercase block">{"Total Orders"}</span>
                <span className="text-lg font-black text-blue-950">{selectedLead.ordersCount}</span>
              </div>
              <div className="p-3 rounded-2xl bg-neutral-50 border border-neutral-200">
                <span className="text-[10px] font-bold text-neutral-500 uppercase block">{"Payment Channels"}</span>
                <span className="text-sm font-black text-neutral-900">
                  {selectedLead.paymentMethods.length > 0 ? selectedLead.paymentMethods.join(", ") : "N/A"}
                </span>
              </div>
            </div>

            {/* Purchased Products List */}
            <div className="space-y-2">
              <h3 className="text-xs font-black uppercase tracking-wider text-neutral-500 flex items-center gap-1.5">
                <ShoppingBag className="w-3.5 h-3.5 text-emerald-600" />
                <span>{"Purchased Products"}</span>
              </h3>
              <div className="divide-y divide-neutral-100 border border-neutral-200 rounded-2xl overflow-hidden text-xs">
                {selectedLead.purchasedProducts.length === 0 ? (
                  <div className="p-4 text-center text-neutral-400">{"No product items recorded."}</div>
                ) : (
                  selectedLead.purchasedProducts.map((p, idx) => (
                    <div key={`${p.orderId}-${idx}`} className="p-3 flex items-center justify-between gap-3 bg-white">
                      <div>
                        <span className="font-bold text-neutral-900 block">{p.name}</span>
                        <span className="text-[10px] text-neutral-500">
                          {`Order #${p.orderId} • Qty: ${p.quantity}${p.variant ? ` • Variant: ${p.variant}` : ""}`}
                        </span>
                      </div>
                      <span className="font-black text-neutral-900">{formatBDT(p.price * p.quantity)}</span>
                    </div>
                  ))
                )}
              </div>
            </div>

            {/* Order & Gateway History */}
            <div className="space-y-2">
              <h3 className="text-xs font-black uppercase tracking-wider text-neutral-500 flex items-center gap-1.5">
                <CreditCard className="w-3.5 h-3.5 text-blue-600" />
                <span>{"Order & Payment Timeline"}</span>
              </h3>
              <div className="overflow-x-auto border border-neutral-200 rounded-2xl">
                <table className="w-full text-left text-xs">
                  <thead className="bg-neutral-50 text-neutral-500 font-bold border-b border-neutral-200">
                    <tr>
                      <th className="py-2 px-3">Order ID</th>
                      <th className="py-2 px-3">Method & TrxID</th>
                      <th className="py-2 px-3">Status</th>
                      <th className="py-2 px-3">Amount</th>
                      <th className="py-2 px-3">Date</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-neutral-100">
                    {selectedLead.orderHistory.map((ord) => (
                      <tr key={ord.id}>
                        <td className="py-2 px-3 font-mono font-bold text-neutral-900">#{ord.id}</td>
                        <td className="py-2 px-3">
                          <span className="font-bold">{ord.paymentMethod}</span>
                          {ord.trxId && <span className="block font-mono text-[10px] text-neutral-500">{ord.trxId}</span>}
                        </td>
                        <td className="py-2 px-3">
                          <span className="font-bold text-neutral-700">{`${ord.status} (${ord.paymentStatus})`}</span>
                        </td>
                        <td className="py-2 px-3 font-bold">{formatBDT(ord.total)}</td>
                        <td className="py-2 px-3 text-[11px] font-mono text-neutral-500">
                          {formatBDTDateTime(ord.createdAt, true)}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>

            {/* Automated Email Follow-Up Composer */}
            <form onSubmit={handleSendLeadEmail} className="p-4 rounded-2xl bg-neutral-50 border border-neutral-200 space-y-3 text-xs">
              <div className="flex flex-wrap items-center justify-between gap-2">
                <h4 className="font-black text-neutral-900 flex items-center gap-1.5">
                  <Send className="w-3.5 h-3.5 text-emerald-600" />
                  <span>{"Send Follow-Up Email (via Configured SMTP Gateway)"}</span>
                </h4>
                <span
                  className={`px-2.5 py-0.5 rounded-full text-[10px] font-bold border ${
                    isSmtpReady
                      ? "bg-emerald-50 border-emerald-200 text-emerald-800"
                      : "bg-amber-50 border-amber-200 text-amber-800"
                  }`}
                >
                  {isSmtpReady
                    ? `Connected: ${smtpHost} (${smtpUser})`
                    : !emailEnabled
                    ? "Email disabled in Notifications"
                    : "SMTP not configured in Notifications"}
                </span>
              </div>

              <div>
                <label htmlFor="lead-email-recipient" className="block font-bold text-neutral-700 mb-1">
                  {"Recipient Email"}
                </label>
                <input
                  id="lead-email-recipient"
                  type="email"
                  required
                  placeholder="customer@example.com"
                  value={emailRecipient}
                  onChange={(e) => setEmailRecipient(e.target.value)}
                  className="w-full px-3 py-2 rounded-xl border border-neutral-300 bg-white text-xs outline-none focus:border-emerald-600 font-mono"
                />
              </div>

              <div>
                <label htmlFor="lead-email-subject" className="block font-bold text-neutral-700 mb-1">
                  {"Subject"}
                </label>
                <input
                  id="lead-email-subject"
                  type="text"
                  required
                  value={emailSubject}
                  onChange={(e) => setEmailSubject(e.target.value)}
                  className="w-full px-3 py-2 rounded-xl border border-neutral-300 bg-white text-xs outline-none focus:border-emerald-600"
                />
              </div>

              <div>
                <label htmlFor="lead-email-body" className="block font-bold text-neutral-700 mb-1">
                  {"Message"}
                </label>
                <textarea
                  id="lead-email-body"
                  rows={3}
                  required
                  value={emailBody}
                  onChange={(e) => setEmailBody(e.target.value)}
                  className="w-full px-3 py-2 rounded-xl border border-neutral-300 bg-white text-xs outline-none focus:border-emerald-600 resize-none"
                />
              </div>

              {emailStatus && (
                <div
                  className={`p-2.5 rounded-xl border font-bold flex items-center gap-2 ${
                    emailStatus.success
                      ? "bg-emerald-50 border-emerald-200 text-emerald-800"
                      : "bg-rose-50 border-rose-200 text-rose-800"
                  }`}
                >
                  {emailStatus.success ? (
                    <CheckCircle2 className="w-4 h-4 shrink-0" />
                  ) : (
                    <AlertCircle className="w-4 h-4 shrink-0" />
                  )}
                  <span>{emailStatus.message}</span>
                </div>
              )}

              <div className="flex justify-end">
                <button
                  type="submit"
                  disabled={isSendingEmail || !emailRecipient.trim()}
                  className="px-4 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-700 disabled:opacity-50 text-white font-bold flex items-center gap-1.5 cursor-pointer"
                >
                  {isSendingEmail ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Send className="w-3.5 h-3.5" />}
                  <span>{isSendingEmail ? "Sending..." : "Send Email to Lead"}</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

export { AdminLeads };
export default AdminLeads;
