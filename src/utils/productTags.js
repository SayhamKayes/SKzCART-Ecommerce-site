export const PRODUCT_TAGS = [
  { id: '', labelEn: 'None', labelBn: 'None', shortLabelEn: 'None', shortLabelBn: 'None', label: 'None', shortLabel: 'None' },
  { id: 'BESTSELLER', labelEn: '⚡ Best Seller', labelBn: '⚡ Best Seller', shortLabelEn: 'Best Seller', shortLabelBn: 'Best Seller', label: '⚡ Best Seller', shortLabel: 'Best Seller', icon: 'zap', color: 'bg-emerald-600 text-white', badgeColor: 'bg-emerald-100 text-emerald-800' },
  { id: 'NEW_ARRIVAL', labelEn: '✨ New Arrival', labelBn: '✨ New Arrival', shortLabelEn: 'New Arrival', shortLabelBn: 'New Arrival', label: '✨ New Arrival', shortLabel: 'New Arrival', icon: 'sparkles', color: 'bg-indigo-600 text-white', badgeColor: 'bg-indigo-100 text-indigo-800' },
  { id: 'ON_SALE', labelEn: '🏷️ On Sale', labelBn: '🏷️ On Sale', shortLabelEn: 'On Sale', shortLabelBn: 'On Sale', label: '🏷️ On Sale', shortLabel: 'On Sale', icon: 'tag', color: 'bg-rose-600 text-white', badgeColor: 'bg-rose-100 text-rose-800' },
  { id: 'HOT_DEAL', labelEn: '🔥 Hot Deal', labelBn: '🔥 Hot Deal', shortLabelEn: 'Hot Deal', shortLabelBn: 'Hot Deal', label: '🔥 Hot Deal', shortLabel: 'Hot Deal', icon: 'flame', color: 'bg-amber-600 text-white', badgeColor: 'bg-amber-100 text-amber-800' },
];

export function getProductTagInfo(product) {
  if (!product) return null;
  const rawTag = (product.badge || product.tag || (product.isHotDeal ? 'BESTSELLER' : '')).trim().toUpperCase();
  if (!rawTag) return null;

  if (rawTag === 'BESTSELLER') {
    return {
      id: 'BESTSELLER',
      label: 'Best Seller',
      labelEn: 'Best Seller',
      labelBn: 'Best Seller',
      icon: 'zap',
      color: 'bg-emerald-600 text-white',
      badgeColor: 'bg-emerald-100 text-emerald-800',
    };
  }
  if (rawTag === 'NEW_ARRIVAL' || rawTag === 'NEW' || rawTag === 'NEW ARRIVAL') {
    return {
      id: 'NEW_ARRIVAL',
      label: 'New Arrival',
      labelEn: 'New Arrival',
      labelBn: 'New Arrival',
      icon: 'sparkles',
      color: 'bg-indigo-600 text-white',
      badgeColor: 'bg-indigo-100 text-indigo-800',
    };
  }
  if (rawTag === 'ON_SALE' || rawTag === 'SALE' || rawTag === 'ON SALE') {
    return {
      id: 'ON_SALE',
      label: 'On Sale',
      labelEn: 'On Sale',
      labelBn: 'On Sale',
      icon: 'tag',
      color: 'bg-rose-600 text-white',
      badgeColor: 'bg-rose-100 text-rose-800',
    };
  }
  if (rawTag === 'HOT_DEAL' || rawTag === 'HOT' || rawTag === 'HOT DEAL') {
    return {
      id: 'HOT_DEAL',
      label: 'Hot Deal',
      labelEn: 'Hot Deal',
      labelBn: 'Hot Deal',
      icon: 'flame',
      color: 'bg-amber-600 text-white',
      badgeColor: 'bg-amber-100 text-amber-800',
    };
  }
  return null;
}
