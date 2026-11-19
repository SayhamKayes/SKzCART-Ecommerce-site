/**
 * Central Campaign Helper for AmarDokan
 * Evaluates whether a product is currently part of an active campaign,
 * taking into account Special Campaigns, Marketing Ad Campaigns (from backend-synced themeConfig),
 * and Admin On/Off (pause) and Delete states.
 */

function readMarketingLists(themeConfig) {
  const mkt = themeConfig?.marketingCampaigns;
  if (mkt && typeof mkt === "object") {
    return {
      deletedIds: Array.isArray(mkt.deletedCampaignIds) ? mkt.deletedCampaignIds : [],
      pausedIds: Array.isArray(mkt.pausedCampaignIds) ? mkt.pausedCampaignIds : [],
      customCampaigns: Array.isArray(mkt.customCampaigns) ? mkt.customCampaigns : [],
    };
  }
  try {
    return {
      deletedIds: JSON.parse(localStorage.getItem("amardokan_deleted_campaigns") || "[]"),
      pausedIds: JSON.parse(localStorage.getItem("amardokan_paused_campaigns") || "[]"),
      customCampaigns: JSON.parse(localStorage.getItem("amardokan_custom_campaigns") || "[]"),
    };
  } catch {
    return { deletedIds: [], pausedIds: [], customCampaigns: [] };
  }
}

/**
 * Check if a campaign ID or product ID has been marked paused or deleted
 */
export function isCampaignPausedOrDeleted(campaignId, productId, themeConfig = null) {
  const { deletedIds: deleted, pausedIds: paused } = readMarketingLists(themeConfig);

  if (campaignId && (deleted.includes(campaignId) || paused.includes(campaignId))) {
    return true;
  }
  if (productId) {
    const pid = String(productId);
    if (
      deleted.includes(pid) ||
      paused.includes(pid) ||
      paused.includes(`camp-prod-${pid}`)
    ) {
      return true;
    }
  }
  return false;
}

/**
 * Determines whether a product has an active campaign and returns the associated campaign config.
 * If the product is not in an active campaign (or its campaign is paused/deleted/disabled),
 * isCampaign is false and campaignConfig is null.
 *
 * @param {Object} product
 * @param {Object} themeConfig
 * @returns {{ isCampaign: boolean, type: string|null, campaignConfig: Object|null }}
 */
export function getProductCampaignInfo(product, themeConfig) {
  if (!product || !product.id) {
    return { isCampaign: false, type: null, campaignConfig: null };
  }

  const prodId = String(product.id);
  const prodSlug = product.slug ? String(product.slug).toLowerCase() : "";
  const { deletedIds, pausedIds, customCampaigns } = readMarketingLists(themeConfig);

  // If this product specifically is marked paused or deleted
  if (
    deletedIds.includes(prodId) ||
    pausedIds.includes(prodId) ||
    pausedIds.includes(`camp-prod-${prodId}`)
  ) {
    return { isCampaign: false, type: null, campaignConfig: null };
  }

  // 1. Check Special Campaign from themeConfig (Supports multiple activeProductIds + legacy activeProductId)
  const specialCampaign = themeConfig?.campaign;
  const isSpecialEnabled = specialCampaign?.enabled !== false;

  const specialIdsList = Array.isArray(specialCampaign?.activeProductIds)
    ? specialCampaign.activeProductIds.filter(Boolean).map(String)
    : (specialCampaign?.activeProductId
        ? [String(specialCampaign.activeProductId) === "prod-1790503380337" ? "prod-1" : String(specialCampaign.activeProductId)]
        : ["prod-1"]);

  if (isSpecialEnabled && specialIdsList.length > 0) {
    const matchedSpecialId = specialIdsList.find((cid) => {
      const normalizedCid = cid === "prod-1790503380337" ? "prod-1" : cid;
      return normalizedCid === prodId || (prodSlug && normalizedCid.toLowerCase() === prodSlug);
    });

    const isSpecialBlocked =
      !matchedSpecialId ||
      deletedIds.includes("special-campaign") ||
      deletedIds.includes(matchedSpecialId) ||
      pausedIds.includes("special-campaign") ||
      pausedIds.includes(matchedSpecialId) ||
      pausedIds.includes(`camp-prod-${matchedSpecialId}`);

    if (matchedSpecialId && !isSpecialBlocked) {
      return {
        isCampaign: true,
        type: "special",
        campaignConfig: specialCampaign,
      };
    }
  }

  // 2. Check Custom Ad Campaigns from backend-synced themeConfig
  if (Array.isArray(customCampaigns)) {
    for (const camp of customCampaigns) {
      if (!camp || !camp.id) continue;
      if (
        deletedIds.includes(camp.id) ||
        pausedIds.includes(camp.id) ||
        camp.status === "paused"
      ) {
        continue;
      }
      const campTarget = String(camp.productId || "");
      if (
        campTarget === prodId ||
        (prodSlug && campTarget.toLowerCase() === prodSlug)
      ) {
        return {
          isCampaign: true,
          type: "ad_campaign",
          campaignConfig: {
            ...specialCampaign,
            headline:
              camp.headline ||
              specialCampaign?.headline ||
              `🔥 Special Offer: ${product.name}`,
            subheadline: camp.subheadline || specialCampaign?.subheadline,
            badgeText:
              camp.badgeText || specialCampaign?.badgeText || "Special Campaign Offer",
            urgencyText: camp.urgencyText || specialCampaign?.urgencyText,
          },
        };
      }
    }
  }

  return { isCampaign: false, type: null, campaignConfig: null };
}

/**
 * Returns the canonical URL for a product depending on its campaign status:
 * - Active campaign product -> /campaign-products?product=${prod.id}
 * - Normal product -> /products/${prod.slug || prod.id}
 */
export function getProductCanonicalUrl(product, themeConfig, baseUrl = "") {
  if (!product) return baseUrl ? `${baseUrl}/` : "/";
  const { isCampaign } = getProductCampaignInfo(product, themeConfig);
  const prodSlug = product.slug || product.id;
  if (isCampaign) {
    return `${baseUrl}/campaign-products?product=${product.id}`;
  }
  return `${baseUrl}/products/${prodSlug}`;
}
