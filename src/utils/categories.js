// Unified Category helper to normalize categories to clean English

const CANONICAL_MAP = {
  'smart gadgets': 'Smart Gadgets',
  'smart_gadgets': 'Smart Gadgets',
  'audio & music': 'Audio & Music',
  'audio_music': 'Audio & Music',
  'electronics': 'Electronics',
  'lifestyle': 'Lifestyle',
  "men's fashion": "Men's Fashion",
  'mens_fashion': "Men's Fashion",
  'personal care': 'Personal Care',
  'personal_care': 'Personal Care',
  'home & living': 'Home & Living',
  'home_living': 'Home & Living',
  'home & security': 'Home & Security',
  'home_security': 'Home & Security',
  'saree': 'Saree',
  'watch': 'Watch',
  'smartwatch': 'Smartwatch',
  'earbuds': 'Earbuds',
  'accessories': 'Accessories',
};

export function getCanonicalCategoryKey(cat) {
  if (!cat) return '';
  const clean = cat.trim().toLowerCase();
  return (CANONICAL_MAP[clean] || cat).toLowerCase();
}

export function getCanonicalCategoryName(cat) {
  if (!cat) return '';
  const clean = cat.trim().toLowerCase();
  return CANONICAL_MAP[clean] || cat;
}

/**
 * Returns a clean, deduplicated list of unique categories from products in English.
 */
export function getUniqueCategories(products = []) {
  const seenCanonical = new Set();
  const categories = [];

  for (const p of products) {
    const cat = p.category && p.category.trim();
    if (!cat) continue;

    const canonicalName = getCanonicalCategoryName(cat);
    const canonicalKey = canonicalName.toLowerCase();
    if (!seenCanonical.has(canonicalKey)) {
      seenCanonical.add(canonicalKey);
      categories.push(canonicalName);
    }
  }

  return ['ALL', ...categories];
}

/**
 * Checks if a product's category matches the selected category filter.
 */
export function matchesCategory(prodCategory, selectedCategory) {
  if (!selectedCategory || selectedCategory === 'ALL' || selectedCategory === 'All') return true;
  if (!prodCategory) return false;
  
  const cleanProd = getCanonicalCategoryKey(prodCategory);
  const cleanSelected = getCanonicalCategoryKey(selectedCategory);
  
  return cleanProd === cleanSelected;
}
