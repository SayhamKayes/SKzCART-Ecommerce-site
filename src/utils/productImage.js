/**
 * Global Default Product Placeholder Utilities
 * Uses the user-provided asset in frontend/public/assets/default-product-placeholder.png
 */
export const DEFAULT_PRODUCT_PLACEHOLDER = "/assets/default-product-placeholder.png";

export function getProductImage(product) {
  if (!product) return DEFAULT_PRODUCT_PLACEHOLDER;
  if (Array.isArray(product.images) && product.images.length > 0 && product.images[0]) {
    return product.images[0];
  }
  if (typeof product.image === "string" && product.image.trim()) {
    return product.image.trim();
  }
  return DEFAULT_PRODUCT_PLACEHOLDER;
}

export function handleProductImageError(e) {
  const img = e?.currentTarget;
  if (!img || img.dataset.fallbackApplied === "true") return;
  img.dataset.fallbackApplied = "true";
  img.src = DEFAULT_PRODUCT_PLACEHOLDER;
}

