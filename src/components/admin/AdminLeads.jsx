import { useState, useMemo, useEffect } from "react";
import {
  Users,
  Mail,
  Phone,
  MapPin,
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

const AdminLeads = ({ orders = [] }) => {
  const [searchQuery, setSearchQuery] = useState("");
  const [channelFilter, setChannelFilter] = useState("ALL"); // ALL | HAS_EMAIL | SSLCOMMERZ | MFS | COD
  const [selectedLead, setSelectedLead] = useState(null);

  // Email Composer state inside Lead Details Popup
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
    const safeOrders = Array.isArray(orders) ? orders : [];

    for (const o of safeOrders) {
      if (!o || typeof o !== "object") continue;
      const addr = o.address && typeof o.address === "object" ? o.address : {};
      const phone = String(addr.phone ?? "").trim();
      const rawEmail = String(o.customerEmail ?? addr.email ?? "").trim();
      const email = rawEmail;
      const key = phone || email || String(o.id ?? grouped.size);

      const safeName = String(addr.customerName || "Customer");
      const safeDistrict = String(addr.district || "");
      const safeThana = String(addr.thana || "");
      const safeFullAddress = String(addr.fullAddress || addr.address || "");

      if (!grouped.has(key)) {
        grouped.set(key, {
          id: key,
          name: safeName,
          phone: phone || "N/A",
          email: email || "",
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
      if (safeName && safeName !== "Customer" && lead.name === "Customer") lead.name = safeName;
      if (email && (!lead.email || lead.email.endsWith("@customer.amardokan.com"))) {
        lead.email = email;
      }
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
      paymentMethods: Array.from(l.paymentMethods),
      hasRealEmail: Boolean(
        l.email && l.email.includes("@") && !l.email.endsWith("@customer.amardokan.com")
      ),
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
        String(l.fullAddress || "").toLowerCase().includes(q) ||
        l.purchasedProducts.some((p) => String(p.name || "").toLowerCase().includes(q))
      );
    });
  }, [leads, searchQuery, channelFilter]);

  const openLeadModal = (lead) => {
    setSelectedLead(lead);
    setEmailStatus(null);
    const firstProd = lead.purchasedProducts[0]?.name || "our products";
    setEmailSubject(`Thank you for shopping with us, ${lead.name}!`);
    setEmailBody(
      `Hi ${lead.name},\n\nThank you for your recent purchase (${firstProd}). We hope you are enjoying it! Let us know if you need any assistance or would like to explore our newest arrivals.\n\nBest regards,\nCustomer Care Team`
    );
  };

  const handleSendLeadEmail = async (e) => {
    e.preventDefault();
    if (!selectedLead?.email || !selectedLead.email.includes("@")) {
      setEmailStatus({ success: false, message: "This lead does not have a valid email address." });
      return;
    }
    setIsSendingEmail(true);
    setEmailStatus(null);
    try {
      const res = await apiClient.sendNotification({
        recipient: selectedLead.email,
        subject: emailSubject.trim(),
        messageText: emailBody.trim(),
        templateName: "LEAD_AUTOMATED_FOLLOWUP",
        orderId: selectedLead.orderHistory[0]?.id || "LEAD-EMAIL",
      });
      setEmailStatus({
        success: Boolean(res?.success),
        message: res?.message || (res?.success ? "Email sent successfully!" : "Failed to send email."),
      });
    } catch (err) {
      setEmailStatus({ success: false, message: err?.message || "Failed to dispatch email." });
    } finally {
      setIsSendingEmail(false);
    }
  };

  const totalLeadValue = leads.reduce((acc, l) => acc + l.totalSpent, 0);
  const emailableLeadsCount = leads.filter((l) => l.email && l.email.includes("@")).length;
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
      </div>

      {/* Summary KPI Row */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        {[
          { label: "Total Captured Leads", val: leads.length, sub: "Unique buyers from orders" },
          { label: "With Email Contacts", val: emailableLeadsCount, sub: "Ready for automated email" },
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
            placeholder="Search leads by name, email, phone, address, or product..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full pl-10 pr-4 py-2 bg-neutral-50 rounded-xl border border-neutral-200 text-xs focus:bg-white focus:border-emerald-600 focus:outline-hidden"
          />
        </div>

        <div className="flex flex-wrap items-center gap-1.5 text-xs">
          {[
            { id: "ALL", label: "All Leads" },
            { id: "HAS_EMAIL", label: "Custom Email" },
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
                      {lead.email && (
                        <span className="text-[10px] text-neutral-500 flex items-center gap-1 mt-0.5">
                          <Mail className="w-3 h-3 text-neutral-400" />
                          {lead.email}
                        </span>
                      )}
                    </td>
                    <td className="py-3 px-4 max-w-xs">
                      <span className="font-semibold text-neutral-800 block">{lead.district || "—"}</span>
                      <span className="text-[11px] text-neutral-500 line-clamp-1">{lead.fullAddress}</span>
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
              <div>
                <span className="text-[10px] font-bold uppercase tracking-wider text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded-full">
                  {"Customer Lead Profile (A-Z)"}
                </span>
                <h2 id="lead-detail-modal-title" className="text-xl font-black text-neutral-900 mt-1">
                  {selectedLead.name}
                </h2>
                <div className="flex flex-wrap gap-3 text-xs text-neutral-600 mt-1">
                  <span className="flex items-center gap-1 font-mono">
                    <Phone className="w-3.5 h-3.5 text-emerald-600" />
                    {selectedLead.phone}
                  </span>
                  {selectedLead.email && (
                    <span className="flex items-center gap-1">
                      <Mail className="w-3.5 h-3.5 text-blue-600" />
                      {selectedLead.email}
                    </span>
                  )}
                  <span className="flex items-center gap-1">
                    <MapPin className="w-3.5 h-3.5 text-rose-500" />
                    {`${selectedLead.thana ? `${selectedLead.thana}, ` : ""}${selectedLead.district} — ${selectedLead.fullAddress}`}
                  </span>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setSelectedLead(null)}
                aria-label="Close lead details modal"
                className="p-1.5 rounded-full hover:bg-neutral-100 text-neutral-400 hover:text-neutral-700 cursor-pointer"
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
                <span className="text-sm font-black text-neutral-900">{selectedLead.paymentMethods.join(", ")}</span>
              </div>
            </div>

            {/* Purchased Products List */}
            <div className="space-y-2">
              <h3 className="text-xs font-black uppercase tracking-wider text-neutral-500 flex items-center gap-1.5">
                <ShoppingBag className="w-3.5 h-3.5 text-emerald-600" />
                <span>{"Purchased Products"}</span>
              </h3>
              <div className="divide-y divide-neutral-100 border border-neutral-200 rounded-2xl overflow-hidden text-xs">
                {selectedLead.purchasedProducts.map((p, idx) => (
                  <div key={`${p.orderId}-${idx}`} className="p-3 flex items-center justify-between gap-3 bg-white">
                    <div>
                      <span className="font-bold text-neutral-900 block">{p.name}</span>
                      <span className="text-[10px] text-neutral-500">
                        {`Order #${p.orderId} • Qty: ${p.quantity}${p.variant ? ` • Variant: ${p.variant}` : ""}`}
                      </span>
                    </div>
                    <span className="font-black text-neutral-900">{formatBDT(p.price * p.quantity)}</span>
                  </div>
                ))}
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
              <div className="flex items-center justify-between">
                <h4 className="font-black text-neutral-900 flex items-center gap-1.5">
                  <Send className="w-3.5 h-3.5 text-emerald-600" />
                  <span>{"Send Follow-Up Email (via Configured SMTP Gateway)"}</span>
                </h4>
                <span className="text-[10px] font-mono text-neutral-500">{selectedLead.email || "No email"}</span>
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
                  disabled={isSendingEmail || !selectedLead.email}
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

