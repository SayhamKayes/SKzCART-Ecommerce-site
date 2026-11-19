/**
 * Bengali to English text sanitizer utility for AmarDokan
 * Detects and automatically converts any lingering Bengali text into clean, modern English.
 */

export const BENGALI_REGEX = /[\u0980-\u09F2\u09F4-\u09FF]/;

export const isBengaliText = (str) => {
  if (typeof str !== 'string') return false;
  return BENGALI_REGEX.test(str);
};

export const BENGALI_TO_ENGLISH_MAP = {
  // Hero trust badges
  '১০০% অরিজিনাল পণ্য': '100% Original Products',
  '100% অরিজিনাল পণ্য': '100% Original Products',
  '৭ দিনের রিপ্লেসমেন্ট': '7 Days Replacement',
  '7 দিনের রিপ্লেসমেন্ট': '7 Days Replacement',
  'ক্যাশ অন ডেলিভারি': 'Cash on Delivery',
  '100% Genuine': '100% Genuine',

  // Product modal guarantee & delivery
  '১০০% অরিজিনাল ও অথেন্টিক প্রোডাক্ট': '100% Original & Authentic Product',
  '100% অরিজিনাল ও অথেন্টিক প্রোডাক্ট': '100% Original & Authentic Product',
  '৭ দিনের সহজ রিটার্ন ও রিপ্লেসমেন্ট গ্যারান্টি': '7-Day Easy Return & Replacement Guarantee',
  '7 দিনের সহজ রিটার্ন ও রিপ্লেসমেন্ট গ্যারান্টি': '7-Day Easy Return & Replacement Guarantee',
  '২৪ ঘণ্টা': '24 Hours',
  '২৪ ঘন্টা': '24 Hours',
  '24 ঘণ্টা': '24 Hours',
  '24 ঘন্টা': '24 Hours',
  '৪৮-৭২ ঘণ্টা': '48-72 Hours',
  '৪৮-৭২ ঘন্টা': '48-72 Hours',
  '48-72 ঘণ্টা': '48-72 Hours',
  '48-72 ঘন্টা': '48-72 Hours',

  // Buttons & CTAs
  'সরাসরি অর্ডার করুন': 'Order Now',
  'কার্টে যোগ করুন': 'Add to Cart',
  'অর্ডার করতে ক্লিক করুন': 'Order Now',
  'অর্ডার নাও': 'Order Now',

  // Reviews section
  'সম্মানিত গ্রাহকদের অভিজ্ঞতা ও সন্তুষ্টি': 'Customer Experiences & Testimonials',
  'সারা দেশে ক্যাশ অন ডেলিভারিতে পণ্য বুঝে পেয়ে শতভাগ ভেরিফাইড ক্রেতাদের বাস্তব মতামত।': 'Real verified feedback from satisfied customers across Bangladesh receiving parcels with Cash on Delivery.',

  // Header & Notices
  'পণ্য হাতে পেয়ে চেক করে মূল্য পরিশোধ': 'Inspect parcel upon delivery before payment',
  'চেক করে মূল্য পরিশোধ': 'Inspect parcel before payment',
  'অর্ডার ট্র্যাক': 'Track Order',
  'পণ্য বা মডেল সার্চ করুন (যেমন: স্মার্টওয়াচ, এয়ারবাডস)...': 'Search product or model (e.g. smartwatch, earbuds)...',

  // Campaign Page
  '🔥 বিশেষ ধামাকা ক্যাম্পেইন অফার - সীমিত সময়ের জন্য!': '🔥 Special Campaign Offer - Limited Time Only!',
  'অরিজিনাল প্রিমিয়াম কোয়ালিটি পণ্যে বিশেষ মূল্যছাড় ও ক্যাশ অন ডেলিভারি সুবিধা': 'Exclusive discount on original premium quality products with Cash on Delivery nationwide',
  'স্পেশাল ক্যাম্পেইন অফার': 'Special Campaign Offer',
  '⚡ স্টক দ্রুত শেষ হয়ে যাচ্ছে! আর অল্প কিছু পণ্য অবশিষ্ট আছে।': '⚡ Stock is running out fast! Only a few items left in stock.',
  '🔥 খুব সীমিত স্টক অবশিষ্ট আছে! দ্রুত আপনার অর্ডারটি সম্পন্ন করুন।': '🔥 Very limited stock remaining! Complete your order quickly.',

  // Footer & Couriers
  'বাংলাদেশের সকল জেলা ও উপজেলায় দ্রুততম ডেলিভারি ও সুরক্ষিত ক্যাশ অন ডেলিভারি সেবা।': 'Fastest nationwide delivery with secure cash on delivery across Bangladesh.',
  'সময়: সকাল ৯:০০ - রাত ১১:০০': 'Hours: 9:00 AM - 11:00 PM',
  'পাঠাও কুরিয়ার এক্সপ্রেস': 'Pathao Courier Express',
  'স্টিডফাস্ট কুরিয়ার সার্ভিস': 'Steadfast Courier Service',
  'রেডএক্স লজিস্টিকস': 'RedX Logistics',
};

/**
 * Sanitize a single text string: if it contains Bengali characters, convert it to English.
 */
export const sanitizeText = (text, fallback = '') => {
  if (text === null || text === undefined) return fallback;
  if (typeof text !== 'string') return text;

  const trimmed = text.trim();
  if (!isBengaliText(trimmed)) {
    return text;
  }

  if (BENGALI_TO_ENGLISH_MAP[trimmed]) {
    return BENGALI_TO_ENGLISH_MAP[trimmed];
  }

  // Check for partial substring replacements (e.g. "Delivery: Dhaka ২৪ ঘণ্টা, Nationwide ৪৮-৭২ ঘণ্টা")
  let result = text;
  for (const [bn, en] of Object.entries(BENGALI_TO_ENGLISH_MAP)) {
    if (result.includes(bn)) {
      result = result.split(bn).join(en);
    }
  }

  if (isBengaliText(result)) {
    return fallback || result;
  }

  return result;
};

/**
 * Deeply sanitize an entire themeConfig object against DEFAULT_THEME_CONFIG
 */
export const sanitizeThemeConfig = (config, defaultConfig = {}) => {
  if (!config || typeof config !== 'object') return defaultConfig;

  const sanitized = { ...config };

  for (const section of Object.keys(config)) {
    const sectionVal = config[section];
    const defaultSection = defaultConfig[section] || {};

    if (sectionVal && typeof sectionVal === 'object' && !Array.isArray(sectionVal)) {
      sanitized[section] = { ...sectionVal };
      for (const key of Object.keys(sectionVal)) {
        const val = sectionVal[key];
        const defVal = defaultSection[key];
        if (typeof val === 'string') {
          sanitized[section][key] = sanitizeText(val, defVal !== undefined ? defVal : val);
        }
      }
    } else if (typeof sectionVal === 'string') {
      sanitized[section] = sanitizeText(sectionVal, defaultSection || sectionVal);
    }
  }

  return sanitized;
};
