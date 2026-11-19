export const INITIAL_PRODUCTS = [
  {
    id: 'prod-1',
    slug: '360-rotating-makeup-brush-organizer',
    name: '360° Rotating Makeup Brush Organizer',
    nameBn: '360° Rotating Makeup Brush Organizer',
    bengaliName: '360° Rotating Makeup Brush Organizer',
    category: 'Beauty & Organizer',
    image: 'https://images.unsplash.com/photo-1522337360788-8b13dee7a37e?auto=format&fit=crop&w=600&q=80',
    images: [
      'https://images.unsplash.com/photo-1522337360788-8b13dee7a37e?auto=format&fit=crop&w=600&q=80'
    ],
    thumbnail: 'https://images.unsplash.com/photo-1522337360788-8b13dee7a37e?auto=format&fit=crop&w=600&q=80',
    price: 790,
    regularPrice: 1250,
    originalPrice: 1250,
    discount: '36% OFF',
    discountPercent: 37,
    badge: 'Hot Selling',
    sku: 'ORG-360-BRUSH',
    stock: 35,
    rating: 4.9,
    reviewsCount: 148,
    isHotDeal: true,
    warranty: '7-Day Replacement Guarantee',
    deliveryDays: 'Delivery in 24-48 hours nationwide',
    description: 'Luxury crystal-clear makeup organizer with 360° smooth rotation and airtight dustproof cover.',
    features: [
      '360° silent ball-bearing rotation',
      'Airtight dustproof and waterproof transparent acrylic dome',
      '7 separate slots for all makeup brush sizes',
      'Premium shatterproof ABS and crystal dome finish'
    ],
    productType: 'standard',
    variants: [],
    slides: [],
    hero: {
      headline: 'Keep your favorite makeup brushes 100% dust-free & immaculate!',
      subheadline: 'Luxury crystal-clear organizer with smooth rotation and airtight cover.',
      highlights: [
        '360° silent rotation bearing',
        'Airtight dustproof cover',
        '7 neat compartments',
        'High-grade acrylic dome'
      ]
    },
    problems: [],
    solution: {
      title: 'AmarDokan 360° Rotating Dustproof Organizer',
      description: 'A smart solution to keep your brushes organized, accessible, and protected.'
    },
    benefits: []
  }
];

export const INITIAL_ORDERS = [];
export const INITIAL_COUPONS = [];
export const INITIAL_LANDING_PAGE = {
  id: 'landing-1',
  title: 'Special Promotion Landing Page',
  productId: 'prod-1',
  bulletPoints: [
    'Direct smartwatch call answering and dialing',
    'HD full-screen display & custom watch faces',
    'Heart rate, SpO2 and sleep monitoring sensors',
    'Free wireless charger & extra silicone strap',
    '6-Month official replacement warranty',
    'Inspect parcel before payment on delivery'
  ],
  urgencyText: 'Special offer valid for limited hours only!',
  timerMinutes: 45,
  discountBadge: '35% Discount',
  reviewsCount: 342,
  averageRating: 4.8,
  isActive: true
};
export const INITIAL_AUDIT_LOGS = [];
export const INITIAL_COURIER_CONFIGS = [];
export const INITIAL_NOTIFICATIONS = [];
export const INITIAL_MARKETING_EVENTS = [];

export const mockProducts = INITIAL_PRODUCTS;
export const mockOrders = INITIAL_ORDERS;
export const mockCoupons = INITIAL_COUPONS;
export const mockLandingPages = [INITIAL_LANDING_PAGE];
export const mockAuditLogs = INITIAL_AUDIT_LOGS;
export const mockCourierConfigs = INITIAL_COURIER_CONFIGS;
export const mockNotifications = INITIAL_NOTIFICATIONS;
export const mockMarketingEvents = INITIAL_MARKETING_EVENTS;
