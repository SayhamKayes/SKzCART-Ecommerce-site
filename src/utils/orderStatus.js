/**
 * Canonical order status display formatter.
 * Ensures Admin Portal, Order Management, Courier Hub, and Portals
 * display clean human-readable labels with zero underscores or hyphens.
 */
export const ORDER_STATUS_LABELS = {
  PENDING: "Pending",
  CONFIRMED: "Confirmed",
  COURIER_CREATED: "Courier Booked",
  PICKED_UP: "Picked Up",
  IN_TRANSIT: "In Transit",
  OUT_FOR_DELIVERY: "Out for Delivery",
  DELIVERED: "Delivered",
  CANCELLED: "Cancelled",
  RETURNED: "Returned",
  FAILED: "Failed",
};

export function formatOrderStatusLabel(status) {
  const key = String(status || "").trim().toUpperCase();
  if (!key) return "Pending";
  if (ORDER_STATUS_LABELS[key]) return ORDER_STATUS_LABELS[key];
  return key
    .replace(/[_-]+/g, " ")
    .toLowerCase()
    .replace(/\b\w/g, (ch) => ch.toUpperCase());
}

export const COURIER_PROVIDER_STATUS_OPTIONS = {
  steadfast: [
    { value: "in_review", label: "Courier Booked (In Review)" },
    { value: "picked_up", label: "Picked Up" },
    { value: "in_transit", label: "In Transit" },
    { value: "hold", label: "Held at Hub" },
    { value: "out_for_delivery", label: "Out for Delivery" },
    { value: "delivered", label: "Delivered" },
    { value: "partial_delivered", label: "Partially Delivered" },
    { value: "returned", label: "Returned" },
    { value: "cancelled", label: "Cancelled" },
  ],
  pathao: [
    { value: "order.pickup-requested", label: "Pickup Requested" },
    { value: "order.picked", label: "Picked Up" },
    { value: "order.at-the-sorting-hub", label: "At Sorting Hub" },
    { value: "order.in-transit", label: "In Transit" },
    { value: "order.assigned-for-delivery", label: "Out for Delivery" },
    { value: "order.delivered", label: "Delivered" },
    { value: "order.partial-delivery", label: "Partially Delivered" },
    { value: "order.return", label: "Returned" },
    { value: "order.pickup-cancelled", label: "Cancelled" },
  ],
  redx: [
    { value: "pickup-pending", label: "Pickup Pending" },
    { value: "picked-up", label: "Picked Up" },
    { value: "received-at-hub", label: "Received at Hub" },
    { value: "in-transit", label: "In Transit" },
    { value: "delivery-in-progress", label: "Out for Delivery" },
    { value: "delivered", label: "Delivered" },
    { value: "returned-to-merchant", label: "Returned" },
    { value: "cancelled", label: "Cancelled" },
  ],
  ecourier: [
    { value: "Pending", label: "Order Placed" },
    { value: "Picked up", label: "Picked Up" },
    { value: "In transit", label: "In Transit" },
    { value: "Out for delivery", label: "Out for Delivery" },
    { value: "Delivered", label: "Delivered" },
    { value: "Returned", label: "Returned" },
    { value: "Cancelled", label: "Cancelled" },
  ],
};

