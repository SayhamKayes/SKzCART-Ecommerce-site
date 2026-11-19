import { useState, useEffect, useMemo } from "react";
import {
  Send,
  CheckCircle2,
  RefreshCw,
  Save,
  AlertCircle,
  Sparkles,
  Mail,
  Eye,
  EyeOff
} from "lucide-react";
import { notificationEngine } from "../../services/notifications";
import { realtimeService } from "../../services/realtime";
import { useThemeConfig } from "../frontPanel/FrontPanelContext";
import { apiClient } from "../../services/api";

const buildEmailTemplates = (shopName) => [
  {
    id: "ORDER_CREATED",
    name: "Order Placed (Confirmation)",
    subject: `Order Confirmation: #{order_id} - ${shopName}`,
    text: `Dear {name},\n\nThank you for shopping with ${shopName}! Your order #{order_id} (Total: ৳{total}) has been placed successfully.\n\nTrack your order live: {tracking_url}\n\nThank you!`,
  },
  {
    id: "ORDER_CONFIRMED",
    name: "Order Confirmed",
    subject: `Order Confirmed: #{order_id} - ${shopName}`,
    text: `Dear {name},\n\nYour order #{order_id} has been confirmed and packaging is underway.\n\nLive tracking: {tracking_url}\n\nBest regards,\n${shopName}`,
  },
  {
    id: "SHIPMENT_CREATED",
    name: "Courier Booked / Dispatched",
    subject: `Parcel Dispatched with Courier: #{order_id} - ${shopName}`,
    text: `Dear {name},\n\nYour parcel #{order_id} has been handed over to {courier}. Tracking ID: {tracking_id}.\n\nLive tracking: {tracking_url}\n\nBest regards,\n${shopName}`,
  },
  {
    id: "PICKED_UP",
    name: "Picked Up by Courier",
    subject: `Parcel Picked Up: #{order_id} - ${shopName}`,
    text: `Dear {name},\n\nOur courier partner has picked up your parcel #{order_id} from our hub.\n\nLive tracking: {tracking_url}`,
  },
  {
    id: "IN_TRANSIT",
    name: "In Transit",
    subject: `Parcel In Transit: #{order_id} - ${shopName}`,
    text: `Dear {name},\n\nYour parcel #{order_id} is currently in transit to your delivery hub.\n\nLive tracking: {tracking_url}`,
  },
  {
    id: "OUT_FOR_DELIVERY",
    name: "Out for Delivery Today",
    subject: `Parcel Out for Delivery Today: #{order_id} - ${shopName}`,
    text: `Dear {name},\n\nYour order #{order_id} is out for delivery today! Please keep ৳{total} cash ready if COD and keep your phone reachable.\n\nLive tracking: {tracking_url}`,
  },
  {
    id: "DELIVERED",
    name: "Delivered",
    subject: `Parcel Delivered Successfully: #{order_id} - ${shopName}`,
    text: `Dear {name},\n\nYour order #{order_id} has been delivered successfully! Thank you for shopping with ${shopName}.\n\nShare your review: {tracking_url}#reviews`,
  },
  {
    id: "ON_HOLD",
    name: "Order On Hold",
    subject: `Order On Hold: #{order_id} - ${shopName}`,
    text: `Dear {name},\n\nYour order #{order_id} is temporarily on hold. Please reply to this email or contact our support team so we can assist you promptly.`,
  },
  {
    id: "CANCELLED",
    name: "Order Cancelled",
    subject: `Order Cancelled: #{order_id} - ${shopName}`,
    text: `Dear {name},\n\nYour order #{order_id} has been cancelled. If you have any questions, please reply directly to this email.\n\nRegards,\n${shopName}`,
  },
  {
    id: "CUSTOM",
    name: "Custom Email Message",
    subject: `Important Update Regarding Order #{order_id} - ${shopName}`,
    text: `Dear {name},\n\nWe wanted to share an important update regarding your order #{order_id}.\n\nLive tracking: {tracking_url}\n\nThank you,\n${shopName}`,
  },
];

const AdminNotifications = ({ orders = [] }) => {
  const { themeConfig, updateThemeConfig } = useThemeConfig();
  const shopName = themeConfig?.shop?.name || "AmarDokan";

  // Email SMTP Configuration State
  const [emailHost, setEmailHost] = useState(themeConfig?.shop?.emailHost || "smtp.gmail.com");
  const [emailPort, setEmailPort] = useState(themeConfig?.shop?.emailPort || 587);
  const [emailUseTls, setEmailUseTls] = useState(themeConfig?.shop?.emailUseTls !== false);
  const [emailUseSsl, setEmailUseSsl] = useState(Boolean(themeConfig?.shop?.emailUseSsl));
  const [emailHostUser, setEmailHostUser] = useState(themeConfig?.shop?.emailHostUser || "");
  const [emailHostPassword, setEmailHostPassword] = useState(themeConfig?.shop?.emailHostPassword || "");
  const [showSmtpPassword, setShowSmtpPassword] = useState(false);
  const [defaultFromEmail, setDefaultFromEmail] = useState(themeConfig?.shop?.defaultFromEmail || "");
  const [emailEnabled, setEmailEnabled] = useState(
    typeof themeConfig?.shop?.emailEnabled === "boolean" ? themeConfig.shop.emailEnabled : true
  );

  const [isSavingEmail, setIsSavingEmail] = useState(false);
  const [emailSaveMsg, setEmailSaveMsg] = useState(null);
  const [testEmailRecipient, setTestEmailRecipient] = useState(
    themeConfig?.shop?.supportEmail || ""
  );
  const [isTestingEmail, setIsTestingEmail] = useState(false);
  const [emailTestResult, setEmailTestResult] = useState(null);

  // Manual Email Dispatch & Template Preview State
  const templates = useMemo(() => buildEmailTemplates(shopName), [shopName]);
  const [selectedTemplate, setSelectedTemplate] = useState("ORDER_CONFIRMED");
  const [selectedOrderId, setSelectedOrderId] = useState("");
  const [manualOrderId, setManualOrderId] = useState("BD-849201");
  const [manualCustomerName, setManualCustomerName] = useState("Customer");
  const [manualRecipientEmail, setManualRecipientEmail] = useState("");
  const [manualSubject, setManualSubject] = useState("");
  const [manualMessage, setManualMessage] = useState("");
  const [isSending, setIsSending] = useState(false);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [sendResult, setSendResult] = useState(null);
  const [notificationLogs, setNotificationLogs] = useState(notificationEngine.getLogs());

  // Sync SMTP inputs when central ShopSetting loads or updates from another device
  useEffect(() => {
    const s = themeConfig?.shop;
    if (!s) return;
    if (s.emailHost !== undefined) setEmailHost(s.emailHost || "smtp.gmail.com");
    if (s.emailPort !== undefined) setEmailPort(s.emailPort || 587);
    if (typeof s.emailUseTls === "boolean") setEmailUseTls(s.emailUseTls);
    if (typeof s.emailUseSsl === "boolean") setEmailUseSsl(s.emailUseSsl);
    if (s.emailHostUser !== undefined) setEmailHostUser(s.emailHostUser || "");
    if (s.emailHostPassword !== undefined) setEmailHostPassword(s.emailHostPassword || "");
    if (s.defaultFromEmail !== undefined) setDefaultFromEmail(s.defaultFromEmail || "");
    if (typeof s.emailEnabled === "boolean") setEmailEnabled(s.emailEnabled);
    if (s.supportEmail && !testEmailRecipient) {
      setTestEmailRecipient(s.supportEmail);
    }
  }, [themeConfig?.shop]);

  // Helper to hydrate Subject & Body from selected template + order details
  const applyTemplatePreview = (tplId, orderObj = null) => {
    const tpl = templates.find((t) => t.id === tplId) || templates[0];
    const oid = orderObj?.id || manualOrderId || "BD-849201";
    const cname = orderObj?.address?.customerName || manualCustomerName || "Customer";
    const total = orderObj?.total ?? "1,490";
    const courier = orderObj?.courier?.provider?.toUpperCase() || "Steadfast";
    const trackingId = orderObj?.courier?.trackingId || "N/A";
    const baseUrl = typeof window !== "undefined" ? window.location.origin : "https://amardokan.com";
    const trackingUrl = `${baseUrl}/track-order?id=${oid}`;

    const replaceTokens = (str) =>
      String(str || "")
        .replace(/\{order_id\}/g, oid)
        .replace(/\{name\}/g, cname)
        .replace(/\{total\}/g, String(total))
        .replace(/\{courier\}/g, courier)
        .replace(/\{tracking_id\}/g, trackingId)
        .replace(/\{tracking_url\}/g, trackingUrl);

    setManualSubject(replaceTokens(tpl.subject));
    setManualMessage(replaceTokens(tpl.text));
  };

  useEffect(() => {
    const matchedOrder = orders.find((o) => o.id === selectedOrderId) || null;
    applyTemplatePreview(selectedTemplate, matchedOrder);
  }, [selectedTemplate, shopName]);

  const handleSelectExistingOrder = (oid) => {
    setSelectedOrderId(oid);
    const ord = orders.find((o) => o.id === oid);
    if (ord) {
      setManualOrderId(ord.id);
      setManualCustomerName(ord.address?.customerName || "Customer");
      const ordEmail = ord.customerEmail || ord.address?.email || "";
      if (ordEmail) setManualRecipientEmail(ordEmail);
      applyTemplatePreview(selectedTemplate, ord);
    }
  };

  const refreshLogs = async () => {
    setIsRefreshing(true);
    try {
      const logs = await notificationEngine.fetchLogs();
      if (logs) setNotificationLogs([...logs]);
    } finally {
      setIsRefreshing(false);
    }
  };

  useEffect(() => {
    refreshLogs();
    const unsubscribe = realtimeService.subscribe((msg) => {
      if (
        msg &&
        (msg.type === "ORDER_CREATED" ||
          msg.type === "COURIER_ASSIGNED" ||
          msg.type === "ORDER_STATUS_CHANGED" ||
          msg.type === "NOTIFICATION_DISPATCHED")
      ) {
        refreshLogs();
      }
    });
    const onFocus = () => refreshLogs();
    window.addEventListener("focus", onFocus);
    return () => {
      if (typeof unsubscribe === "function") unsubscribe();
      window.removeEventListener("focus", onFocus);
    };
  }, []);

  const buildSmtpPayload = () => {
    const cleanUser = emailHostUser.trim();
    const cleanFrom = defaultFromEmail.trim() || (cleanUser ? `${shopName} <${cleanUser}>` : "");
    return {
      emailHost: emailHost.trim() || "smtp.gmail.com",
      emailPort: Number(emailPort) || (emailUseSsl ? 465 : 587),
      emailUseTls: emailUseSsl ? false : Boolean(emailUseTls),
      emailUseSsl: Boolean(emailUseSsl),
      emailHostUser: cleanUser,
      emailHostPassword: emailHostPassword.trim(),
      defaultFromEmail: cleanFrom,
      emailEnabled: Boolean(emailEnabled),
    };
  };

  // Save SMTP Email Gateway Settings to Central Database & Context
  const handleSaveEmailConfig = async (e) => {
    if (e) e.preventDefault();
    setIsSavingEmail(true);
    setEmailSaveMsg(null);
    try {
      const payload = buildSmtpPayload();
      await updateThemeConfig("shop", payload);
      const res = await apiClient.updateShopSettings(payload);
      if (res && res.success) {
        setEmailSaveMsg({
          ok: true,
          text: "SMTP Email Gateway settings saved & synced across all devices!",
        });
        setTimeout(() => setEmailSaveMsg(null), 4500);
      } else {
        setEmailSaveMsg({
          ok: false,
          text: res?.message || "Failed to save SMTP settings.",
        });
      }
    } catch (err) {
      console.error("Save Email config error:", err);
      setEmailSaveMsg({ ok: false, text: err?.message || "Error saving SMTP settings." });
    } finally {
      setIsSavingEmail(false);
    }
  };

  // Save current SMTP config & Send Test Email
  const handleTestEmailGateway = async () => {
    if (!testEmailRecipient.trim()) return;
    setIsTestingEmail(true);
    setEmailTestResult(null);
    try {
      const payload = buildSmtpPayload();
      await updateThemeConfig("shop", payload);
      await apiClient.updateShopSettings(payload);

      const res = await apiClient.sendTestEmail({
        recipientEmail: testEmailRecipient.trim(),
      });
      setEmailTestResult(res);
      await refreshLogs();
      realtimeService.broadcast("NOTIFICATION_DISPATCHED", {
        channel: "EMAIL",
        recipient: testEmailRecipient.trim(),
      });
    } catch (err) {
      setEmailTestResult({ success: false, error: err.message });
    } finally {
      setIsTestingEmail(false);
    }
  };

  // Manual Email Dispatch
  const handleSendManualEmail = async (e) => {
    if (e) e.preventDefault();
    setSendResult(null);
    const recipient = manualRecipientEmail.trim();
    if (!recipient || !recipient.includes("@")) {
      setSendResult({ ok: false, text: "Please enter a valid recipient email address." });
      return;
    }
    if (!manualMessage.trim()) {
      setSendResult({ ok: false, text: "Please enter an email message body." });
      return;
    }

    setIsSending(true);
    try {
      const res = await notificationEngine.sendEmail({
        recipientEmail: recipient,
        subject: manualSubject.trim(),
        message: manualMessage.trim(),
        type: selectedTemplate,
        orderId: manualOrderId.trim() || "MANUAL-EMAIL",
      });

      if (res.success) {
        setSendResult({
          ok: true,
          text: `Email dispatched successfully to ${recipient}!`,
        });
      } else {
        setSendResult({
          ok: false,
          text: `Failed to send email to ${recipient}: ${res.error || "Check SMTP credentials."}`,
        });
      }
      await refreshLogs();
      realtimeService.broadcast("NOTIFICATION_DISPATCHED", {
        channel: "EMAIL",
        recipient,
      });
    } catch (err) {
      setSendResult({ ok: false, text: err?.message || "Email dispatch failed." });
    } finally {
      setIsSending(false);
    }
  };

  return (
    <div className="space-y-6">
      {/* Top Header */}
      <div className="bg-white rounded-3xl p-6 border border-neutral-200 shadow-xs flex flex-wrap items-center justify-between gap-4">
        <div>
          <span className="text-xs font-bold uppercase tracking-wider text-indigo-700 bg-indigo-50 px-2.5 py-1 rounded-full">
            {"Customer Email Automation"}
          </span>
          <h1 className="text-2xl font-black text-neutral-900 mt-2">
            {"Notifications & Email Gateway (SMTP)"}
          </h1>
          <p className="text-xs text-neutral-500 mt-1">
            {"Configure your store SMTP Email credentials. Customers automatically receive an email on every new order and every order status update."}
          </p>
        </div>

        <span
          className={`px-3 py-1.5 rounded-full text-xs font-bold border flex items-center gap-1.5 ${emailEnabled
              ? "bg-emerald-50 text-emerald-700 border-emerald-200"
              : "bg-neutral-100 text-neutral-500 border-neutral-200"
            }`}
        >
          <span
            className={`w-2 h-2 rounded-full ${emailEnabled ? "bg-emerald-500 animate-pulse" : "bg-neutral-400"
              }`}
          />
          <span>{emailEnabled ? "Email SMTP Active" : "Email Automation Paused"}</span>
        </span>
      </div>

      {/* Card 1: Email Gateway (SMTP) Configuration */}
      <form
        onSubmit={handleSaveEmailConfig}
        className="bg-white rounded-3xl border border-neutral-200 shadow-xs p-6 space-y-6"
      >
        <div className="flex items-center justify-between pb-4 border-b border-neutral-100 flex-wrap gap-3">
          <div>
            <h3 className="font-bold text-base text-neutral-900 flex items-center gap-2">
              <Mail className="w-5 h-5 text-indigo-600" />
              <span>{"SMTP Email Gateway Configuration"}</span>
            </h3>
            <p className="text-xs text-neutral-500 mt-0.5">
              {"Enter your store email, app password, SMTP host and port. Saved centrally in the database across all devices."}
            </p>
          </div>

          <div className="flex items-center gap-2.5">
            <span className="text-xs font-semibold text-neutral-600">
              {"Email Automation"}
            </span>
            <button
              type="button"
              onClick={() => setEmailEnabled(!emailEnabled)}
              className={`w-12 h-6 flex items-center rounded-full p-1 cursor-pointer transition-colors ${emailEnabled ? "bg-indigo-600" : "bg-neutral-300"
                }`}
              title="Toggle automated order emails"
            >
              <div
                className={`bg-white w-4 h-4 rounded-full shadow-md transform transition-transform ${emailEnabled ? "translate-x-6" : "translate-x-0"
                  }`}
              />
            </button>
          </div>
        </div>

        {/* Quick SMTP Presets */}
        <div className="p-4 rounded-2xl bg-neutral-50 border border-neutral-200 space-y-2">
          <label className="block text-xs font-bold text-neutral-700">
            {"Quick SMTP Presets:"}
          </label>
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
            <button
              type="button"
              onClick={() => {
                setEmailHost("smtp.gmail.com");
                setEmailPort(587);
                setEmailUseTls(true);
                setEmailUseSsl(false);
              }}
              className={`p-2.5 rounded-xl border text-xs font-semibold text-left transition-all cursor-pointer ${emailHost === "smtp.gmail.com"
                  ? "bg-white border-indigo-600 text-indigo-900 shadow-xs ring-1 ring-indigo-500/20"
                  : "bg-white/60 border-neutral-200 text-neutral-700 hover:bg-white"
                }`}
            >
              <div className="font-bold flex items-center justify-between">
                <span>Google Gmail</span>
                {emailHost === "smtp.gmail.com" && (
                  <span className="w-2 h-2 rounded-full bg-indigo-600" />
                )}
              </div>
              <span className="text-[10px] text-neutral-500 block mt-0.5">
                smtp.gmail.com (587 TLS)
              </span>
            </button>

            <button
              type="button"
              onClick={() => {
                setEmailHost("smtppro.zoho.com");
                setEmailPort(465);
                setEmailUseTls(false);
                setEmailUseSsl(true);
              }}
              className={`p-2.5 rounded-xl border text-xs font-semibold text-left transition-all cursor-pointer ${emailHost.includes("zoho")
                  ? "bg-white border-indigo-600 text-indigo-900 shadow-xs ring-1 ring-indigo-500/20"
                  : "bg-white/60 border-neutral-200 text-neutral-700 hover:bg-white"
                }`}
            >
              <div className="font-bold flex items-center justify-between">
                <span>Zoho Mail</span>
                {emailHost.includes("zoho") && (
                  <span className="w-2 h-2 rounded-full bg-indigo-600" />
                )}
              </div>
              <span className="text-[10px] text-neutral-500 block mt-0.5">
                smtppro.zoho.com (465 SSL)
              </span>
            </button>

            <button
              type="button"
              onClick={() => {
                setEmailHost("smtp.office365.com");
                setEmailPort(587);
                setEmailUseTls(true);
                setEmailUseSsl(false);
              }}
              className={`p-2.5 rounded-xl border text-xs font-semibold text-left transition-all cursor-pointer ${emailHost.includes("office365")
                  ? "bg-white border-indigo-600 text-indigo-900 shadow-xs ring-1 ring-indigo-500/20"
                  : "bg-white/60 border-neutral-200 text-neutral-700 hover:bg-white"
                }`}
            >
              <div className="font-bold flex items-center justify-between">
                <span>Microsoft 365</span>
                {emailHost.includes("office365") && (
                  <span className="w-2 h-2 rounded-full bg-indigo-600" />
                )}
              </div>
              <span className="text-[10px] text-neutral-500 block mt-0.5">
                smtp.office365.com (587)
              </span>
            </button>

            <button
              type="button"
              onClick={() => {
                setEmailHost("");
                setEmailPort(465);
                setEmailUseTls(false);
                setEmailUseSsl(true);
              }}
              className="p-2.5 rounded-xl border bg-white/60 border-neutral-200 text-neutral-700 hover:bg-white text-xs font-semibold text-left transition-all cursor-pointer"
            >
              <div className="font-bold">cPanel / Custom</div>
              <span className="text-[10px] text-neutral-500 block mt-0.5">
                mail.yourdomain.com (465 SSL)
              </span>
            </button>
          </div>
        </div>

        {/* SMTP Credentials Inputs */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          <div>
            <label className="block text-xs font-bold text-neutral-700 mb-1">
              {"SMTP Server / Host *"}
            </label>
            <input
              type="text"
              value={emailHost}
              onChange={(e) => setEmailHost(e.target.value)}
              placeholder="smtp.gmail.com"
              className="w-full px-4 py-2.5 rounded-xl bg-neutral-50 border border-neutral-300 text-xs font-mono text-neutral-900 focus:outline-none focus:border-indigo-600"
            />
            <span className="text-[11px] text-neutral-400 mt-1 block">
              {"e.g. smtp.gmail.com, mail.yourshop.com"}
            </span>
          </div>

          <div>
            <label className="block text-xs font-bold text-neutral-700 mb-1">
              {"SMTP Port *"}
            </label>
            <input
              type="number"
              value={emailPort}
              onChange={(e) => setEmailPort(e.target.value)}
              placeholder="587"
              className="w-full px-4 py-2.5 rounded-xl bg-neutral-50 border border-neutral-300 text-xs font-mono text-neutral-900 focus:outline-none focus:border-indigo-600"
            />
            <span className="text-[11px] text-neutral-400 mt-1 block">
              587 (STARTTLS) or 465 (SSL)
            </span>
          </div>

          <div>
            <label className="block text-xs font-bold text-neutral-700 mb-1">
              {"Encryption Protocol"}
            </label>
            <div className="flex gap-2 h-[42px] items-center">
              <button
                type="button"
                onClick={() => {
                  setEmailUseTls(true);
                  setEmailUseSsl(false);
                }}
                className={`flex-1 py-2 px-3 rounded-xl border text-xs font-bold transition-all cursor-pointer ${emailUseTls && !emailUseSsl
                    ? "bg-indigo-600 text-white border-indigo-600"
                    : "bg-neutral-50 text-neutral-700 border-neutral-300"
                  }`}
              >
                STARTTLS (587)
              </button>
              <button
                type="button"
                onClick={() => {
                  setEmailUseTls(false);
                  setEmailUseSsl(true);
                }}
                className={`flex-1 py-2 px-3 rounded-xl border text-xs font-bold transition-all cursor-pointer ${emailUseSsl
                    ? "bg-indigo-600 text-white border-indigo-600"
                    : "bg-neutral-50 text-neutral-700 border-neutral-300"
                  }`}
              >
                SSL / TLS (465)
              </button>
            </div>
          </div>

          <div>
            <label className="block text-xs font-bold text-neutral-700 mb-1">
              {"Store Email / SMTP Username *"}
            </label>
            <input
              type="text"
              value={emailHostUser}
              onChange={(e) => setEmailHostUser(e.target.value)}
              placeholder="yourstore@gmail.com"
              className="w-full px-4 py-2.5 rounded-xl bg-neutral-50 border border-neutral-300 text-xs font-mono text-neutral-900 focus:outline-none focus:border-indigo-600"
            />
            <span className="text-[11px] text-neutral-400 mt-1 block">
              {"Your sender email / SMTP login username"}
            </span>
          </div>

          <div>
            <label className="block text-xs font-bold text-neutral-700 mb-1">
              {"Email App Password / SMTP Password *"}
            </label>
            <div className="relative">
              <input
                type={showSmtpPassword ? "text" : "password"}
                value={emailHostPassword}
                onChange={(e) => setEmailHostPassword(e.target.value)}
                placeholder="••••••••••••••••"
                className="w-full pl-4 pr-10 py-2.5 rounded-xl bg-neutral-50 border border-neutral-300 text-xs font-mono text-neutral-900 focus:outline-none focus:border-indigo-600"
              />
              <button
                type="button"
                onClick={() => setShowSmtpPassword((v) => !v)}
                className="absolute right-2.5 top-1/2 -translate-y-1/2 p-1 text-neutral-400 hover:text-neutral-700 cursor-pointer"
                title={showSmtpPassword ? "Hide password" : "Show password"}
              >
                {showSmtpPassword ? (
                  <EyeOff className="w-4 h-4" />
                ) : (
                  <Eye className="w-4 h-4" />
                )}
              </button>
            </div>
            <span className="text-[11px] text-neutral-400 mt-1 block">
              {"For Gmail, generate and paste a 16-character Google App Password."}
            </span>
          </div>

          <div>
            <label className="block text-xs font-bold text-neutral-700 mb-1">
              {"Sender 'From' Display Address"}
            </label>
            <input
              type="text"
              value={defaultFromEmail}
              onChange={(e) => setDefaultFromEmail(e.target.value)}
              placeholder={
                emailHostUser
                  ? `${shopName} <${emailHostUser}>`
                  : `${shopName} <orders@yourshop.com>`
              }
              className="w-full px-4 py-2.5 rounded-xl bg-neutral-50 border border-neutral-300 text-xs font-mono text-neutral-900 focus:outline-none focus:border-indigo-600"
            />
            <span className="text-[11px] text-neutral-400 mt-1 block">
              {"Leave blank to auto-use your SMTP Email as sender."}
            </span>
          </div>
        </div>

        {/* Automatic Order Lifecycle Email Triggers */}
        <div className="p-4 rounded-2xl bg-indigo-50/60 border border-indigo-100 text-xs space-y-2">
          <span className="font-bold text-indigo-950 flex items-center gap-1.5">
            <Sparkles className="w-4 h-4 text-indigo-600" />
            <span>{"Automatic Order Status Email Triggers (Every Status Synced):"}</span>
          </span>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-2 pt-1 text-neutral-700">
            {[
              { title: "Order Placed:", desc: "Instant order invoice & receipt" },
              { title: "Order Confirmed:", desc: "Confirmation & packing started" },
              { title: "Courier Booked:", desc: "Courier name & tracking link" },
              { title: "Picked Up / In Transit:", desc: "Parcel transit progress update" },
              { title: "Out for Delivery:", desc: "Delivery day & COD reminder" },
              { title: "Delivered / Cancelled / Return:", desc: "Completion, review link or closure" },
            ].map((trig, i) => (
              <div
                key={i}
                className="flex items-center gap-1.5 bg-white p-2 rounded-xl border border-indigo-100/70"
              >
                <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600 shrink-0" />
                <span>
                  <strong>{trig.title}</strong> {trig.desc}
                </span>
              </div>
            ))}
          </div>
        </div>

        {/* Live Test SMTP Dispatcher */}
        <div className="p-4 rounded-2xl bg-neutral-950 text-white space-y-3">
          <div className="flex items-center justify-between flex-wrap gap-2">
            <span className="text-xs font-bold text-indigo-400 flex items-center gap-1.5">
              <Send className="w-3.5 h-3.5" />
              <span>{"Live Test SMTP Dispatcher"}</span>
            </span>
            <span className="text-[10px] text-neutral-400">
              {"Saves above settings & sends a verification email"}
            </span>
          </div>

          <div className="flex flex-wrap sm:flex-nowrap gap-2 items-center">
            <input
              type="email"
              value={testEmailRecipient}
              onChange={(e) => setTestEmailRecipient(e.target.value)}
              placeholder="recipient@gmail.com"
              className="flex-1 px-4 py-2.5 rounded-xl bg-neutral-900 border border-neutral-700 text-xs font-mono text-white placeholder-neutral-500 focus:border-indigo-500 focus:outline-hidden"
            />
            <button
              type="button"
              onClick={handleTestEmailGateway}
              disabled={isTestingEmail || !testEmailRecipient.trim()}
              className="px-5 py-2.5 bg-indigo-600 hover:bg-indigo-700 active:bg-indigo-800 text-white rounded-xl text-xs font-bold transition-colors flex items-center gap-1.5 cursor-pointer disabled:opacity-50 shrink-0"
            >
              {isTestingEmail ? (
                <RefreshCw className="w-3.5 h-3.5 animate-spin" />
              ) : (
                <Send className="w-3.5 h-3.5" />
              )}
              <span>{"Send Test Email"}</span>
            </button>
          </div>

          {emailTestResult && (
            <div
              className={`p-3 rounded-xl text-xs ${emailTestResult.success
                  ? "bg-emerald-950/80 border border-emerald-800 text-emerald-300"
                  : "bg-red-950/80 border border-red-800 text-red-300"
                }`}
            >
              <div className="font-bold flex items-center gap-1.5">
                {emailTestResult.success ? (
                  <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
                ) : (
                  <AlertCircle className="w-4 h-4 text-red-400 shrink-0" />
                )}
                <span>
                  {emailTestResult.success
                    ? `Test Email dispatched successfully to ${testEmailRecipient}!`
                    : `SMTP Error: ${emailTestResult.error || "Failed to connect"}`}
                </span>
              </div>
              {emailTestResult.message && (
                <p className="text-[11px] text-neutral-300 mt-1 font-mono">
                  {emailTestResult.message}
                </p>
              )}
            </div>
          )}
        </div>

        {/* Save Action Bar */}
        <div className="flex items-center justify-between flex-wrap gap-3 pt-2">
          <div>
            {emailSaveMsg && (
              <span
                className={`text-xs font-bold flex items-center gap-1.5 ${emailSaveMsg.ok ? "text-emerald-700" : "text-rose-600"
                  }`}
              >
                {emailSaveMsg.ok ? (
                  <CheckCircle2 className="w-4 h-4" />
                ) : (
                  <AlertCircle className="w-4 h-4" />
                )}
                <span>{emailSaveMsg.text}</span>
              </span>
            )}
          </div>
          <button
            type="submit"
            disabled={isSavingEmail}
            className="px-6 py-2.5 bg-indigo-600 hover:bg-indigo-700 active:bg-indigo-800 text-white rounded-xl text-xs font-extrabold transition-all shadow-md shadow-indigo-600/30 flex items-center gap-2 cursor-pointer disabled:opacity-50"
          >
            {isSavingEmail ? (
              <RefreshCw className="w-4 h-4 animate-spin" />
            ) : (
              <Save className="w-4 h-4" />
            )}
            <span>{"Save SMTP Settings"}</span>
          </button>
        </div>
      </form>

      {/* Card 2: Manual Email Dispatch & Template Preview + Email Dispatch Logs */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* Left Column: Manual Dispatch & Template Preview (Email-Only) */}
        <form
          onSubmit={handleSendManualEmail}
          className="lg:col-span-6 bg-white rounded-3xl p-6 border border-neutral-200 shadow-xs space-y-4 text-xs"
        >
          <div className="flex items-center justify-between gap-2">
            <div>
              <h3 className="font-bold text-base text-neutral-900 flex items-center gap-1.5">
                <Send className="w-4 h-4 text-emerald-600" />
                <span>{"Manual Dispatch & Template Preview"}</span>
              </h3>
              <p className="text-[11px] text-neutral-500 mt-0.5">
                {"Manually send an email to a customer (e.g. when a customer email was mistyped or missed)."}
              </p>
            </div>
            <span className="px-2.5 py-1 rounded-full bg-indigo-50 text-indigo-700 border border-indigo-200 font-bold text-[10px] shrink-0">
              Email Only
            </span>
          </div>

          {Array.isArray(orders) && orders.length > 0 && (
            <div>
              <label className="block font-semibold text-neutral-700 mb-1">
                {"Quick Fill from Existing Order (Optional)"}
              </label>
              <select
                value={selectedOrderId}
                onChange={(e) => handleSelectExistingOrder(e.target.value)}
                className="w-full px-3 py-2 bg-neutral-50 rounded-xl border border-neutral-300 font-medium cursor-pointer"
              >
                <option value="">-- Select an order to autofill customer & email --</option>
                {orders.slice(0, 50).map((o) => {
                  const em = o.customerEmail || o.address?.email || "No email";
                  return (
                    <option key={o.id} value={o.id}>
                      #{o.id} — {o.address?.customerName || "Customer"} ({em}) [{o.status}]
                    </option>
                  );
                })}
              </select>
            </div>
          )}

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label className="block font-semibold text-neutral-700 mb-1">
                {"Recipient Email Address *"}
              </label>
              <input
                type="email"
                value={manualRecipientEmail}
                onChange={(e) => setManualRecipientEmail(e.target.value)}
                placeholder="customer@gmail.com"
                required
                className="w-full px-3 py-2 bg-neutral-50 rounded-xl border border-neutral-300 font-mono text-xs focus:bg-white focus:border-indigo-600 focus:outline-hidden"
              />
            </div>

            <div>
              <label className="block font-semibold text-neutral-700 mb-1">
                {"Order ID Reference"}
              </label>
              <input
                type="text"
                value={manualOrderId}
                onChange={(e) => setManualOrderId(e.target.value)}
                placeholder="BD-849201"
                className="w-full px-3 py-2 bg-neutral-50 rounded-xl border border-neutral-300 font-mono text-xs focus:bg-white focus:border-indigo-600 focus:outline-hidden"
              />
            </div>
          </div>

          <div>
            <label className="block font-semibold text-neutral-700 mb-1">
              {"Select Email Template"}
            </label>
            <select
              value={selectedTemplate}
              onChange={(e) => setSelectedTemplate(e.target.value)}
              className="w-full px-3 py-2 bg-neutral-50 rounded-xl border border-neutral-300 font-medium cursor-pointer"
            >
              {templates.map((t) => (
                <option key={t.id} value={t.id}>
                  {t.name}
                </option>
              ))}
            </select>
          </div>

          <div>
            <label className="block font-semibold text-neutral-700 mb-1">
              {"Email Subject Preview *"}
            </label>
            <input
              type="text"
              value={manualSubject}
              onChange={(e) => setManualSubject(e.target.value)}
              placeholder={`Order Update - ${shopName}`}
              required
              className="w-full px-3 py-2 bg-neutral-50 rounded-xl border border-neutral-300 text-xs font-semibold focus:bg-white focus:border-indigo-600 focus:outline-hidden"
            />
          </div>

          <div>
            <label className="block font-semibold text-neutral-700 mb-1">
              {"Email Message Draft Preview *"}
            </label>
            <textarea
              rows={5}
              value={manualMessage}
              onChange={(e) => setManualMessage(e.target.value)}
              required
              className="w-full p-3 bg-neutral-50 rounded-2xl border border-neutral-300 text-xs leading-relaxed text-neutral-800 focus:bg-white focus:border-indigo-600 focus:outline-hidden"
            />
          </div>

          {sendResult && (
            <div
              className={`p-3 rounded-xl text-xs flex items-center gap-2 border ${sendResult.ok
                  ? "bg-emerald-50 border-emerald-200 text-emerald-800"
                  : "bg-rose-50 border-rose-200 text-rose-800"
                }`}
            >
              {sendResult.ok ? (
                <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
              ) : (
                <AlertCircle className="w-4 h-4 text-rose-600 shrink-0" />
              )}
              <span>{sendResult.text}</span>
            </div>
          )}

          <button
            type="submit"
            disabled={isSending}
            className="w-full py-3 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white font-bold flex items-center justify-center gap-2 transition-colors shadow-xs disabled:opacity-50 cursor-pointer"
          >
            {isSending ? (
              <RefreshCw className="w-4 h-4 animate-spin" />
            ) : (
              <Send className="w-4 h-4" />
            )}
            <span>{isSending ? "Sending Email..." : "Send Email"}</span>
          </button>
        </form>

        {/* Right Column: Live Email Dispatch Logs */}
        <div className="lg:col-span-6 bg-white rounded-3xl p-6 border border-neutral-200 shadow-xs space-y-4">
          <div className="flex items-center justify-between">
            <div>
              <h3 className="text-sm font-bold text-neutral-900">
                {"Email Notification Logs"}
              </h3>
              <p className="text-[11px] text-neutral-400">
                {"Live log of automated & manual SMTP email notifications"}
              </p>
            </div>
            <button
              type="button"
              onClick={refreshLogs}
              disabled={isRefreshing}
              className="p-1.5 rounded-lg border border-neutral-200 hover:bg-neutral-50 text-neutral-600 transition-colors cursor-pointer"
              title={"Refresh logs from server"}
            >
              <RefreshCw
                className={`w-3.5 h-3.5 ${isRefreshing ? "animate-spin text-emerald-600" : ""}`}
              />
            </button>
          </div>

          <div className="space-y-2.5 max-h-[540px] overflow-y-auto pr-1">
            {notificationLogs.length === 0 ? (
              <div className="text-center py-12 text-neutral-400 text-xs">
                {"No email notifications dispatched yet."}
              </div>
            ) : (
              notificationLogs.map((log) => (
                <div
                  key={log.id}
                  className="p-3 bg-neutral-50 rounded-2xl border border-neutral-200 text-xs space-y-1.5 hover:border-neutral-300 transition-colors shadow-2xs"
                >
                  <div className="flex justify-between items-center flex-wrap gap-1">
                    <div className="flex items-center gap-1.5 font-bold">
                      <span className="px-2 py-0.5 rounded-md font-bold text-[10px] border bg-indigo-50 text-indigo-700 border-indigo-200">
                        EMAIL
                      </span>
                      <span className="font-mono text-neutral-900">{log.recipient}</span>
                      {log.orderId && (
                        <span className="text-[10px] font-mono text-neutral-500 bg-neutral-100 px-1.5 py-0.5 rounded">
                          #{log.orderId}
                        </span>
                      )}
                    </div>

                    <div className="flex items-center gap-1.5">
                      <span
                        className={`text-[10px] font-bold px-1.5 py-0.5 rounded ${log.status === "FAILED"
                            ? "text-rose-700 bg-rose-100/80"
                            : "text-emerald-700 bg-emerald-100/80"
                          }`}
                      >
                        {log.status || "SENT"}
                      </span>
                      <span className="text-[10px] text-neutral-400 font-mono">
                        {log.sentAt
                          ? log.sentAt.includes("T")
                            ? new Date(log.sentAt).toLocaleTimeString()
                            : log.sentAt
                          : ""}
                      </span>
                    </div>
                  </div>

                  <p className="text-neutral-700 line-clamp-2 leading-relaxed bg-white p-2 rounded-xl border border-neutral-200/80 font-sans text-[11px]">
                    {log.message}
                  </p>

                  <div className="flex items-center justify-between text-[10px] text-neutral-400 font-mono pt-0.5">
                    <span>Provider: {log.provider || "Django_SMTP_Email"}</span>
                    <span>ID: {log.id}</span>
                  </div>
                </div>
              ))
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

export { AdminNotifications };
export default AdminNotifications;
