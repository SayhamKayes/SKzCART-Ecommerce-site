import { useState } from "react";
import {
  X,
  Printer,
  Truck,
  User,
  Phone,
  MapPin,
  CheckCircle2
} from "lucide-react";
import { formatBDT, formatBDTDateTime } from "../../utils/bangladesh";
import { apiClient } from "../../services/api";
import { realtimeService } from "../../services/realtime";
import { useLanguage } from "../../Context/LanguageContext";
import { CustomModal } from "../common/CustomModal";

const AdminOrderDetailModal = ({
  order,
  onClose,
  onPrintInvoice,
  onOpenAssignCourier,
  onStatusUpdated,
  currentRole
}) => {
  const { isEnglish } = useLanguage();
  if (!order) return null;

  const [newStatus, setNewStatus] = useState(order.status);
  const [statusNote, setStatusNote] = useState("");
  const [isUpdating, setIsUpdating] = useState(false);
  const [errorModal, setErrorModal] = useState(null);

  const handleUpdateStatus = async () => {
    const needsCourierDispatch =
      (newStatus === "PICKED_UP" || newStatus === "COURIER_CREATED") &&
      !order.courier?.trackingId;

    if (needsCourierDispatch && typeof onOpenAssignCourier === "function") {
      onOpenAssignCourier(order, newStatus);
      return;
    }

    setIsUpdating(true);
    try {
      await apiClient.updateOrderStatus(
        order.id,
        newStatus,
        statusNote.trim() || `Status updated to ${newStatus}`,
        "Staff",
        currentRole
      );
      setStatusNote("");
      realtimeService.broadcast("ORDER_STATUS_CHANGED", { ...order, status: newStatus });
      onStatusUpdated();
      onClose();
    } catch (err) {
      console.error(err);
      setErrorModal({
        title: "Failed to Update Status",
        message: err.message || ("An error occurred while updating status. Please try again.")
      });
    } finally {
      setIsUpdating(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 overflow-y-auto bg-black/60 backdrop-blur-xs flex items-center justify-center p-3 sm:p-4">
      <div className="relative bg-white rounded-3xl max-w-3xl w-full overflow-hidden shadow-2xl p-6 sm:p-8 my-4 animate-in fade-in zoom-in-95 duration-200">
        {/* Top Header */}
        <div className="flex justify-between items-start pb-4 border-b border-neutral-200">
          <div>
            <div className="flex items-center gap-2">
              <span className="font-mono text-sm font-bold bg-neutral-100 text-neutral-800 px-2.5 py-1 rounded-md">
                #{order.id}
              </span>
              <span className="text-xs font-bold px-2 py-0.5 rounded-full bg-emerald-100 text-emerald-800 uppercase tracking-wider">
                {order.status}
              </span>
            </div>
            <p className="text-xs text-neutral-400 mt-1">
              {"Order Date:"} {formatBDTDateTime(order.createdAt, isEnglish)} |{" "}
              {"Source:"} {order.utm?.source || "Direct"}
            </p>
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={() => onPrintInvoice(order)}
              className="px-3 py-1.5 rounded-xl border border-neutral-200 hover:bg-neutral-50 text-neutral-700 text-xs font-semibold flex items-center gap-1.5 transition-colors shadow-xs cursor-pointer"
            >
              <Printer className="w-3.5 h-3.5" />
              <span>{"Print Invoice"}</span>
            </button>
            <button
              onClick={onClose}
              className="p-1.5 rounded-full hover:bg-neutral-100 text-neutral-400 hover:text-neutral-700 transition-colors cursor-pointer"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 pt-4 max-h-[75vh] overflow-y-auto">
          {/* Customer & Address Details */}
          <div className="space-y-4 text-xs">
            <div className="p-4 rounded-2xl bg-neutral-50 border border-neutral-200 space-y-2">
              <h3 className="font-bold text-neutral-900 flex items-center gap-1.5 text-sm">
                <User className="w-4 h-4 text-emerald-600" />
                <span>{"Customer Details"}</span>
              </h3>
              <p className="font-semibold text-neutral-900">{order.address?.customerName}</p>
              <p className="font-mono text-neutral-700 flex items-center gap-1.5">
                <Phone className="w-3.5 h-3.5 text-neutral-400" />
                <span>{order.address?.phone}</span>
              </p>
              <p className="text-neutral-600 flex items-start gap-1.5">
                <MapPin className="w-3.5 h-3.5 text-neutral-400 shrink-0 mt-0.5" />
                <span>
                  {order.address?.fullAddress}, {order.address?.thana}, {order.address?.district} (
                  {"Zone:"} {order.address?.deliveryZone})
                </span>
              </p>
              {order.address?.orderNote && (
                <div className="pt-2 border-t border-neutral-200 text-amber-800">
                  <strong>{"Special Note:"}</strong> {order.address.orderNote}
                </div>
              )}
              {Array.isArray(order.address?.customFields) && order.address.customFields.length > 0 && (
                <div className="pt-2 border-t border-neutral-200 space-y-1">
                  <div className="font-bold text-neutral-700 text-[11px] uppercase tracking-wider">
                    Additional Checkout Info
                  </div>
                  {order.address.customFields.map((cf, i) => (
                    <div key={cf.key || i} className="flex justify-between gap-2 text-neutral-700">
                      <span className="text-neutral-500">{cf.label}:</span>
                      <span className="font-semibold text-right">{String(cf.value)}</span>
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* Courier Info Card */}
            <div className="p-4 rounded-2xl bg-neutral-900 text-white space-y-2.5">
              <div className="flex justify-between items-center">
                <h3 className="font-bold flex items-center gap-1.5 text-xs text-emerald-400">
                  <Truck className="w-4 h-4" />
                  <span>{"Courier Logistics"}</span>
                </h3>
                {order.courier ? (
                  <span className="text-[10px] font-mono font-bold bg-neutral-800 text-emerald-300 px-2 py-0.5 rounded">
                    {order.courier.trackingId}
                  </span>
                ) : (
                  <button
                    onClick={() => {
                      onClose();
                      onOpenAssignCourier(order);
                    }}
                    className="text-[11px] font-bold text-emerald-400 hover:underline cursor-pointer"
                  >
                    + {"Assign Courier"}
                  </button>
                )}
              </div>

              {order.courier ? (
                <div className="space-y-1.5 text-[11px] text-neutral-300">
                  <p>
                    {"Provider:"}{" "}
                    <strong className="capitalize text-white">{order.courier.provider}</strong>
                  </p>
                  <p>
                    {"Consignment:"}{" "}
                    <span className="font-mono">{order.courier.consignmentId}</span>
                  </p>
                  <p>
                    {"Courier Status:"}{" "}
                    <strong className="text-emerald-400">{order.courier.courierStatus}</strong>
                  </p>
                  <p>
                    {"COD Amount:"}{" "}
                    <strong className="text-amber-400">{formatBDT(order.courier.codAmount)}</strong>
                  </p>
                </div>
              ) : (
                <div className="space-y-2 pt-1">
                  <p className="text-[11px] text-neutral-400">
                    {"Parcel has not been dispatched to a courier yet."}
                  </p>
                  <button
                    onClick={() => {
                      onClose();
                      onOpenAssignCourier(order);
                    }}
                    className="w-full py-2 px-3 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white font-bold text-xs flex items-center justify-center gap-1.5 transition-colors shadow-xs cursor-pointer"
                  >
                    <Truck className="w-3.5 h-3.5" />
                    <span>{"Assign Courier"}</span>
                  </button>
                </div>
              )}
            </div>
          </div>

          {/* Right Column: Items, Payment & Status Change */}
          <div className="space-y-4 text-xs">
            {/* Items Summary */}
            <div className="p-4 rounded-2xl bg-neutral-50 border border-neutral-200 space-y-2">
              <h3 className="font-bold text-neutral-900 text-sm">
                {"Order Items"}
              </h3>
              <div className="divide-y divide-neutral-200">
                {order.items?.map((it) => (
                  <div key={it.id} className="py-2 flex justify-between items-center">
                    <div>
                      <span className="font-semibold text-neutral-900 block">{it.name}</span>
                      <span className="text-[11px] text-neutral-500 font-mono">
                        {it.sku} {it.variant ? `(${it.variant})` : ""} × {it.quantity}
                      </span>
                    </div>
                    <span className="font-bold text-neutral-900">
                      {formatBDT(it.price * it.quantity)}
                    </span>
                  </div>
                ))}
              </div>

              <div className="pt-2 border-t border-neutral-200 space-y-1 text-[11px] text-neutral-600">
                <div className="flex justify-between">
                  <span>{"Subtotal:"}</span>
                  <span>{formatBDT(order.subtotal)}</span>
                </div>
                <div className="flex justify-between">
                  <span>{"Delivery Fee:"}</span>
                  <span>{formatBDT(order.deliveryFee)}</span>
                </div>
                {order.discount > 0 && (
                  <div className="flex justify-between text-emerald-700">
                    <span>{"Coupon Discount:"}</span>
                    <span>-{formatBDT(order.discount)}</span>
                  </div>
                )}
                <div className="flex justify-between text-xs font-bold text-neutral-900 pt-1 border-t border-neutral-200">
                  <span>{"Total Payable:"}</span>
                  <span className="text-emerald-700">{formatBDT(order.total)}</span>
                </div>
                <div className="flex justify-between text-[11px] text-neutral-600 pt-1">
                  <span>{"Payment Method:"}</span>
                  <span className="font-bold text-neutral-800">
                    {order.paymentMethod} ({order.paymentStatus})
                  </span>
                </div>
                {order.address?.paymentTrxId && (
                  <div className="flex justify-between text-[11px] text-emerald-800 bg-emerald-50 px-2 py-1 rounded font-mono">
                    <span>TrxID:</span>
                    <span className="font-bold">{order.address.paymentTrxId}</span>
                  </div>
                )}
              </div>
            </div>

            {/* Change Status Box */}
            <div className="p-4 rounded-2xl bg-white border-2 border-emerald-600/30 space-y-3">
              <h3 className="font-bold text-neutral-900 flex items-center gap-1.5 text-xs">
                <CheckCircle2 className="w-4 h-4 text-emerald-600" />
                <span>{"Update Order Status"}</span>
              </h3>

              <div>
                <select
                  value={newStatus}
                  onChange={(e) => setNewStatus(e.target.value)}
                  className="w-full px-3 py-2 bg-neutral-50 rounded-xl border border-neutral-300 font-bold text-xs focus:outline-hidden focus:border-emerald-600 cursor-pointer"
                >
                  <option value="PENDING">
                    {"PENDING - Awaiting Verification"}
                  </option>
                  <option value="CONFIRMED">
                    {"CONFIRMED - Customer Confirmed"}
                  </option>
                  <option value="COURIER_CREATED">
                    {"COURIER_CREATED - Parcel Booked"}
                  </option>
                  <option value="PICKED_UP">
                    {"PICKED_UP - Handed to Courier"}
                  </option>
                  <option value="IN_TRANSIT">
                    {"IN_TRANSIT - In Transit Hub"}
                  </option>
                  <option value="OUT_FOR_DELIVERY">
                    {"OUT_FOR_DELIVERY - Out For Delivery"}
                  </option>
                  <option value="DELIVERED">
                    {"DELIVERED - Delivered & Paid"}
                  </option>
                  <option value="CANCELLED">
                    {"CANCELLED - Order Cancelled"}
                  </option>
                  <option value="RETURNED">
                    {"RETURNED - Parcel Returned"}
                  </option>
                </select>
              </div>

              {(newStatus === "PICKED_UP" || newStatus === "COURIER_CREATED") && !order.courier?.trackingId && (
                <div className="p-2.5 rounded-xl bg-amber-50 border border-amber-200 text-[11px] font-semibold text-amber-900">
                  {"Clicking Continue will ask you to select a Courier (Pathao, Steadfast, RedX, or eCourier) and dispatch this order directly."}
                </div>
              )}

              <div>
                <input
                  type="text"
                  placeholder={"Update note or reason (optional)"}
                  value={statusNote}
                  onChange={(e) => setStatusNote(e.target.value)}
                  className="w-full px-3 py-2 bg-neutral-50 rounded-xl border border-neutral-300 text-xs focus:outline-hidden focus:border-emerald-600"
                />
              </div>

              <button
                onClick={handleUpdateStatus}
                disabled={isUpdating}
                className="w-full py-2 px-3 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs flex items-center justify-center gap-2 transition-colors disabled:opacity-50 cursor-pointer"
              >
                <span>
                  {isUpdating
                    ? "Updating..."
                    : (newStatus === "PICKED_UP" || newStatus === "COURIER_CREATED") && !order.courier?.trackingId
                      ? "Select Courier & Dispatch Order →"
                      : "Save Status"}
                </span>
              </button>
            </div>
          </div>
        </div>
      </div>

      <CustomModal
        isOpen={Boolean(errorModal)}
        type="error"
        title={errorModal?.title || ""}
        message={errorModal?.message || ""}
        confirmText={"OK"}
        onClose={() => setErrorModal(null)}
      />
    </div>
  );
};

export { AdminOrderDetailModal };
