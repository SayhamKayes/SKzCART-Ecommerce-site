import {
  CheckCircle2,
  Truck,
  Mail,
  ArrowRight,
  Sparkles
} from "lucide-react";
import { formatBDT } from "../../utils/bangladesh";
import { useLanguage } from "../../Context/LanguageContext";

const OrderConfirmationModal = ({
  order,
  accountCredentials,
  onClose,
  onTrackOrder
}) => {
  const { isEnglish } = useLanguage();
  if (!order) return null;

  return (
    <div className="fixed inset-0 z-50 overflow-y-auto bg-black/60 backdrop-blur-xs flex items-center justify-center p-4">
      <div className="relative bg-white rounded-3xl max-w-lg w-full overflow-hidden shadow-2xl p-6 sm:p-8 animate-in fade-in zoom-in-95 duration-200">
        {/* Success Icon */}
        <div className="text-center">
          <div className="w-16 h-16 rounded-full bg-emerald-100 text-emerald-600 flex items-center justify-center mx-auto mb-3 animate-bounce">
            <CheckCircle2 className="w-10 h-10" />
          </div>

          <span className="text-xs font-bold tracking-wider uppercase text-emerald-700 bg-emerald-50 px-3 py-1 rounded-full">
            {"Order Placed Successfully!"}
          </span>

          <h2 className="text-2xl font-black text-neutral-900 mt-2">
            {"Thank you, "}{order.address?.customerName}!
          </h2>
          <p className="text-xs text-neutral-500 mt-1">
            {"Your order has been recorded into our operations system."}
          </p>
        </div>

        {/* Order Details Card */}
        <div className="mt-6 p-4 rounded-2xl bg-neutral-50 border border-neutral-200 space-y-3 text-xs">
          <div className="flex justify-between items-center pb-2 border-b border-neutral-200">
            <span className="text-neutral-500">{"Order ID"}</span>
            <span className="font-mono font-bold text-sm text-neutral-900 bg-white px-2 py-0.5 rounded border border-neutral-200">
              #{order.id}
            </span>
          </div>

          <div className="flex justify-between">
            <span className="text-neutral-500">{"Mobile Number"}</span>
            <span className="font-medium text-neutral-900">{order.address?.phone}</span>
          </div>

          <div className="flex justify-between">
            <span className="text-neutral-500">{"Delivery Address"}</span>
            <span className="font-medium text-neutral-900 text-right max-w-xs">
              {order.address?.fullAddress}, {order.address?.district}
            </span>
          </div>

          <div className="flex justify-between items-center">
            <span className="text-neutral-500">{"Payment Method"}</span>
            <div className="flex items-center gap-1.5">
              <span className={`font-bold px-2 py-0.5 rounded text-[11px] ${
                order.paymentMethod === 'SSLCOMMERZ'
                  ? 'bg-blue-100 text-blue-900 border border-blue-200'
                  : 'bg-emerald-50 text-emerald-800'
              }`}>
                {order.paymentMethod === "COD"
                  ? "Cash on Delivery (COD)"
                  : order.paymentMethod === "SSLCOMMERZ"
                    ? "SSLCOMMERZ Online"
                    : order.paymentMethod}
              </span>
              <span className={`px-1.5 py-0.5 rounded text-[10px] font-extrabold ${
                order.paymentStatus === 'PAID'
                  ? 'bg-emerald-600 text-white'
                  : 'bg-amber-100 text-amber-900'
              }`}>
                {order.paymentStatus === 'PAID' ? 'PAID ✓' : order.paymentStatus}
              </span>
            </div>
          </div>

          {order.address?.paymentTrxId && (
            <div className="flex justify-between items-center">
              <span className="text-neutral-500">{"Transaction ID"}</span>
              <span className="font-mono font-bold text-neutral-800 bg-neutral-200/60 px-2 py-0.5 rounded text-[11px]">
                {order.address.paymentTrxId}
              </span>
            </div>
          )}

          <div className="flex justify-between items-baseline pt-2 border-t border-neutral-200 text-sm font-bold text-neutral-900">
            <span>{"Total Payable"}</span>
            <span className="text-base text-emerald-700 font-black">
              {formatBDT(order.total)}
            </span>
          </div>
        </div>

        {/* Auto Generated Account Info */}
        {accountCredentials && (
          <div className="mt-4 p-4 bg-emerald-950 text-white rounded-2xl border border-emerald-800 space-y-2 text-xs">
            <div className="flex items-center gap-2 font-bold text-emerald-300">
              <Sparkles className="w-4 h-4 text-amber-400" />
              <span>{"Your account has been created automatically!"}</span>
            </div>
            <p className="text-[11px] text-emerald-200 leading-relaxed">
              {`Account credentials sent to (${accountCredentials.email}). You can sign in anytime using:`}
            </p>
            <div className="bg-white/10 rounded-xl p-3 flex flex-wrap items-center justify-between gap-2 font-mono text-xs">
              <div>
                <span className="text-emerald-300">{"Username: "}</span>
                <span className="font-bold text-white bg-black/40 px-2 py-0.5 rounded">
                  {accountCredentials.username}
                </span>
              </div>
              {accountCredentials.tempPassword && (
                <div>
                  <span className="text-emerald-300">{"Password: "}</span>
                  <span className="font-bold text-amber-300 bg-black/40 px-2 py-0.5 rounded">
                    {accountCredentials.tempPassword}
                  </span>
                </div>
              )}
            </div>
          </div>
        )}

        {/* Automated Email Notification Notice */}
        <div className="mt-4 p-3.5 bg-emerald-50/80 rounded-2xl border border-emerald-200/80 space-y-2 text-xs">
          <div className="flex items-center gap-2 font-bold text-emerald-900">
            <Mail className="w-4 h-4 text-emerald-700" />
            <span>{"Automated Email Notifications"}</span>
          </div>
          <div className="text-[11px] text-emerald-800 space-y-1 pl-6">
            <p>
              {"• Order confirmation email is dispatched to your email address."}
            </p>
            <p>
              {"• Live status updates & tracking links will arrive in your inbox."}
            </p>
          </div>
        </div>

        {/* Actions */}
        <div className="mt-6 space-y-2.5">
          <button
            onClick={() => onTrackOrder(order.id, order.address?.phone)}
            className="w-full py-3.5 px-4 rounded-xl bg-neutral-900 hover:bg-neutral-800 text-white font-bold text-xs flex items-center justify-center gap-2 transition-colors shadow-md cursor-pointer"
          >
            <Truck className="w-4 h-4 text-emerald-400" />
            <span>{"Track Live Order Status"}</span>
            <ArrowRight className="w-4 h-4" />
          </button>

          <button
            onClick={onClose}
            className="w-full py-2.5 px-4 rounded-xl border border-neutral-300 hover:bg-neutral-50 text-neutral-700 font-semibold text-xs transition-colors cursor-pointer"
          >
            {"Return to Store"}
          </button>
        </div>
      </div>
    </div>
  );
};

export { OrderConfirmationModal };
