import { X, Printer } from "lucide-react";
import { formatBDT, formatBDTDateTime } from "../../utils/bangladesh";
import { useLanguage } from "../../Context/LanguageContext";
import { useThemeConfig } from "../frontPanel/FrontPanelContext";

const InvoiceModal = ({ order, onClose }) => {
  const { isEnglish } = useLanguage();
  const { themeConfig } = useThemeConfig();
  const shopName = themeConfig?.shop?.name || "AmarDokan";
  const shopHotline = themeConfig?.shop?.hotline || "09612-345678";
  const shopEmail = themeConfig?.shop?.supportEmail || "support@amardokan.com";
  const shopAddress = themeConfig?.shop?.address || ("Level 4, Gulshan Avenue, Dhaka 1212");
  const shopLogo = themeConfig?.shop?.logoUrl;
  if (!order) return null;

  const handlePrint = () => {
    window.print();
  };

  return (
    <div className="fixed inset-0 z-50 overflow-y-auto bg-black/60 backdrop-blur-xs flex items-center justify-center p-3 sm:p-6 print:p-0 print:bg-white">
      <div className="relative bg-white rounded-3xl max-w-3xl w-full overflow-hidden shadow-2xl p-6 sm:p-8 my-4 print:shadow-none print:border-none print:m-0 print:p-6">
        {/* Top Control Bar (Hidden when printing) */}
        <div className="flex justify-between items-center mb-6 pb-4 border-b border-neutral-200 print:hidden">
          <span className="text-xs font-bold text-neutral-500 uppercase tracking-wider">
            {"Official Cash Memo / Invoice"}
          </span>
          <div className="flex items-center gap-2">
            <button
              onClick={handlePrint}
              className="py-1.5 px-3.5 rounded-xl bg-neutral-900 hover:bg-neutral-800 text-white text-xs font-bold flex items-center gap-1.5 transition-colors shadow-xs cursor-pointer"
            >
              <Printer className="w-3.5 h-3.5" />
              <span>{"Print"}</span>
            </button>
            <button
              onClick={onClose}
              className="p-1.5 rounded-full hover:bg-neutral-100 text-neutral-500 transition-colors cursor-pointer"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Printable Invoice Sheet */}
        <div className="space-y-6 text-neutral-900 font-sans">
          {/* Company & Invoice Header */}
          <div className="flex justify-between items-start">
            <div>
              <div className="flex items-center gap-2.5">
                {shopLogo ? (
                  <img src={shopLogo} alt={shopName} className="h-10 w-auto max-w-[160px] object-contain" />
                ) : (
                  <div className="w-9 h-9 rounded-xl bg-emerald-600 flex items-center justify-center text-white font-extrabold text-lg">
                    {shopName ? shopName.charAt(0) : "A"}
                  </div>
                )}
                <div>
                  <h1 className="text-xl font-black text-neutral-900 tracking-tight">
                    {shopName}
                  </h1>
                  <p className="text-[10px] text-neutral-500">{themeConfig?.shop?.tagline || "Verified E-Commerce Merchant"}</p>
                </div>
              </div>
              <p className="text-xs text-neutral-500 mt-2">
                {shopAddress}
                <br />
                {`Hotline: ${shopHotline} | Email: ${shopEmail}`}
              </p>
            </div>

            <div className="text-right">
              <span className="text-2xl font-black text-neutral-900 tracking-tight block">
                INVOICE
              </span>
              <span className="font-mono text-sm font-bold text-emerald-800 block">
                #{order.id}
              </span>
              <span className="text-xs text-neutral-400 block mt-1">
                {"Date:"} {formatBDTDateTime(order.createdAt, isEnglish)}
              </span>
            </div>
          </div>

          {/* Bill To & Courier Info Box */}
          <div className="grid grid-cols-2 gap-4 p-4 rounded-2xl bg-neutral-50 border border-neutral-200 text-xs">
            <div>
              <span className="text-[10px] font-bold uppercase tracking-wider text-neutral-400 block mb-1">
                {"Customer Details:"}
              </span>
              <p className="font-bold text-sm text-neutral-900">{order.address?.customerName}</p>
              <p className="font-mono font-medium text-neutral-700">{order.address?.phone}</p>
              <p className="text-neutral-600 mt-0.5 leading-snug">
                {order.address?.fullAddress}, {order.address?.thana}, {order.address?.district}
              </p>
              {order.address?.orderNote && (
                <p className="text-[11px] text-amber-800 italic mt-1">
                  {"Note:"} {order.address.orderNote}
                </p>
              )}
            </div>

            <div className="border-l border-neutral-200 pl-4">
              <span className="text-[10px] font-bold uppercase tracking-wider text-neutral-400 block mb-1">
                {"Shipping & Payment Details:"}
              </span>
              <p className="text-neutral-700">
                {"Payment Method:"}{" "}
                <strong>
                  {order.paymentMethod === "COD"
                    ? "Cash on Delivery (COD)"
                    : order.paymentMethod}
                </strong>
              </p>
              <p className="text-neutral-700">
                {"Payment Status:"}{" "}
                <span
                  className={`font-bold ${order.paymentStatus === "PAID" ? "text-emerald-700" : "text-amber-700"
                    }`}
                >
                  {order.paymentStatus}
                </span>
              </p>
              {order.address?.paymentTrxId && (
                <p className="text-neutral-700">
                  TrxID:{" "}
                  <span className="font-mono font-semibold text-emerald-800 bg-emerald-50 px-1 py-0.5 rounded">
                    {order.address.paymentTrxId}
                  </span>
                </p>
              )}
              {order.courier ? (
                <div className="mt-1 text-neutral-700">
                  <p>
                    {"Courier:"}{" "}
                    <strong className="capitalize">{order.courier.provider}</strong>
                  </p>
                  <p className="font-mono text-[11px]">
                    {"Tracking:"} {order.courier.trackingId}
                  </p>
                </div>
              ) : (
                <p className="text-neutral-500 italic mt-1">
                  {"Courier assignment pending"}
                </p>
              )}
            </div>
          </div>

          {/* Items Table */}
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="bg-neutral-100 text-neutral-700 font-bold border-y border-neutral-300">
                <tr>
                  <th className="py-2.5 px-3">{"SL"}</th>
                  <th className="py-2.5 px-3">{"Item & Description"}</th>
                  <th className="py-2.5 px-3">SKU</th>
                  <th className="py-2.5 px-3 text-right">{"Unit Price"}</th>
                  <th className="py-2.5 px-3 text-center">{"Qty"}</th>
                  <th className="py-2.5 px-3 text-right">{"Total"}</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-neutral-200">
                {order.items?.map((item, idx) => (
                  <tr key={item.id || idx}>
                    <td className="py-3 px-3 text-neutral-400">{idx + 1}</td>
                    <td className="py-3 px-3">
                      <span className="font-semibold text-neutral-900 block">{item.name}</span>
                      {item.variant && <span className="text-[11px] text-neutral-500">{item.variant}</span>}
                    </td>
                    <td className="py-3 px-3 font-mono text-neutral-500">{item.sku}</td>
                    <td className="py-3 px-3 text-right">{formatBDT(item.price)}</td>
                    <td className="py-3 px-3 text-center font-bold">{item.quantity}</td>
                    <td className="py-3 px-3 text-right font-bold text-neutral-900">
                      {formatBDT(item.price * item.quantity)}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {/* Financial Calculation */}
          <div className="flex justify-end pt-2">
            <div className="w-64 space-y-2 text-xs">
              <div className="flex justify-between text-neutral-600">
                <span>{"Subtotal"}</span>
                <span className="font-semibold text-neutral-900">{formatBDT(order.subtotal)}</span>
              </div>
              <div className="flex justify-between text-neutral-600">
                <span>
                  {"Delivery Fee"} ({order.address?.district})
                </span>
                <span className="font-semibold text-neutral-900">{formatBDT(order.deliveryFee)}</span>
              </div>
              {order.discount > 0 && (
                <div className="flex justify-between text-emerald-700">
                  <span>{"Discount"}</span>
                  <span>-{formatBDT(order.discount)}</span>
                </div>
              )}
              <div className="pt-2 border-t-2 border-neutral-900 flex justify-between text-sm font-black text-neutral-900">
                <span>{"Total Payable"}</span>
                <span className="text-base text-emerald-800">{formatBDT(order.total)}</span>
              </div>

              {order.paymentMethod === "COD" && (
                <div className="p-2 rounded bg-amber-50 border border-amber-200 text-[11px] text-amber-900 font-bold text-center">
                  {"Collection Amount:"} {formatBDT(order.total)}
                </div>
              )}
            </div>
          </div>

          {/* Footer & Signature */}
          <div className="pt-8 border-t border-neutral-200 grid grid-cols-2 items-end text-xs text-neutral-500">
            <div>
              <p className="font-bold text-neutral-700">{"Terms & Conditions:"}</p>
              <p className="text-[11px] leading-relaxed">
                {"Please inspect parcel upon delivery before paying the rider. Contact hotline within 24h for any issues."}
              </p>
            </div>
            <div className="text-right">
              <div className="w-36 border-b border-neutral-400 ml-auto mb-1" />
              <p className="text-[11px] font-semibold text-neutral-600">
                {"Authorized Signature"}
              </p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export { InvoiceModal };
