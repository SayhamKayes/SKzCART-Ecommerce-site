// Centralized Payment Configuration & Sync Utility
// Handles SSLCommerz, Cash on Delivery, and Manual MFS (bKash, Nagad, Rocket)
// Phone numbers intentionally start blank so Storefront strictly uses Admin Panel DB numbers.

export const DEFAULT_PAYMENT_METHODS = [
  {
    method_id: 'sslcommerz',
    name: 'Pay Online (Cards / bKash / Nagad via SSLCommerz)',
    is_active: true,
    account_type: 'GATEWAY',
    number: '',
    counter: '',
    instructions: 'Complete instant payment with Visa, MasterCard, bKash, Nagad, Rocket, or internet banking.',
    display_order: 1,
  },
  {
    method_id: 'cod',
    name: 'Cash on Delivery',
    is_active: true,
    account_type: 'COD',
    number: '',
    counter: '',
    instructions: 'Inspect parcel upon delivery and pay cash directly to the delivery agent.',
    display_order: 2,
  },
  {
    method_id: 'bkash',
    name: 'bKash Manual',
    is_active: true,
    account_type: 'MERCHANT',
    number: '',
    counter: '1',
    instructions: "Select 'Payment' in your bKash app, pay to the merchant number, and enter the TrxID below.",
    display_order: 3,
  },
  {
    method_id: 'nagad',
    name: 'Nagad Manual',
    is_active: true,
    account_type: 'MERCHANT',
    number: '',
    counter: '1',
    instructions: "Select 'Payment' in your Nagad app, pay to the merchant number, and enter the TrxID below.",
    display_order: 4,
  },
  {
    method_id: 'rocket',
    name: 'Rocket Manual',
    is_active: true,
    account_type: 'MERCHANT',
    number: '',
    counter: '1',
    instructions: "Select 'Merchant Pay' in your Rocket app, pay to the merchant number, and enter the TrxID below.",
    display_order: 5,
  },
];

/**
 * Normalizes payment method keys for comparison
 */
export const normalizeMethodKey = (key) => {
  if (!key) return '';
  return key.toLowerCase().trim();
};

/**
 * Formats account type label in English
 */
export const formatAccountTypeLabel = (type) => {
  const t = (type || 'MERCHANT').toUpperCase();
  if (t === 'MERCHANT') {
    return 'Merchant Payment';
  }
  if (t === 'PERSONAL') {
    return 'Personal (Send Money)';
  }
  if (t === 'AGENT') {
    return 'Agent (Cash Out)';
  }
  return t;
};
