/**
 * Dynamic Theme, Color & Typography Helper Utilities
 * Powers central DB-backed visual customization across all browsers and devices.
 */

export const GOOGLE_FONT_OPTIONS = [
  { id: "Plus Jakarta Sans", label: "Plus Jakarta Sans (Modern Sans)", googleSpec: "Plus+Jakarta+Sans:ital,wght@0,300;0,400;0,500;0,600;0,700;0,800;1,400;1,600;1,700", stack: "'Plus Jakarta Sans', 'Hind Siliguri', sans-serif" },
  { id: "Inter", label: "Inter (Clean UI)", googleSpec: "Inter:ital,wght@0,300;0,400;0,500;0,600;0,700;0,800;0,900;1,400;1,600", stack: "'Inter', 'Hind Siliguri', sans-serif" },
  { id: "Poppins", label: "Poppins (Geometric)", googleSpec: "Poppins:ital,wght@0,300;0,400;0,500;0,600;0,700;0,800;0,900;1,400;1,600", stack: "'Poppins', 'Hind Siliguri', sans-serif" },
  { id: "Outfit", label: "Outfit (Modern Display)", googleSpec: "Outfit:wght@300;400;500;600;700;800;900", stack: "'Outfit', 'Hind Siliguri', sans-serif" },
  { id: "DM Sans", label: "DM Sans (Minimal)", googleSpec: "DM+Sans:ital,wght@0,400;0,500;0,700;1,400;1,700", stack: "'DM Sans', 'Hind Siliguri', sans-serif" },
  { id: "Roboto", label: "Roboto (Classic Google)", googleSpec: "Roboto:ital,wght@0,300;0,400;0,500;0,700;0,900;1,400;1,700", stack: "'Roboto', 'Hind Siliguri', sans-serif" },
  { id: "Montserrat", label: "Montserrat (Bold Brand)", googleSpec: "Montserrat:ital,wght@0,400;0,500;0,600;0,700;0,800;0,900;1,400;1,700", stack: "'Montserrat', 'Hind Siliguri', sans-serif" },
  { id: "Space Grotesk", label: "Space Grotesk (Tech)", googleSpec: "Space+Grotesk:wght@400;500;600;700", stack: "'Space Grotesk', 'Hind Siliguri', sans-serif" },
  { id: "Playfair Display", label: "Playfair Display (Luxury Serif)", googleSpec: "Playfair+Display:ital,wght@0,400;0,600;0,700;0,800;1,400;1,700", stack: "'Playfair Display', Georgia, serif" },
  { id: "Merriweather", label: "Merriweather (Editorial Serif)", googleSpec: "Merriweather:ital,wght@0,400;0,700;0,900;1,400", stack: "'Merriweather', Georgia, serif" },
  { id: "Hind Siliguri", label: "Hind Siliguri (Bengali + EN)", googleSpec: "Hind+Siliguri:wght@300;400;500;600;700", stack: "'Hind Siliguri', sans-serif" },
  { id: "Noto Sans Bengali", label: "Noto Sans Bengali", googleSpec: "Noto+Sans+Bengali:wght@400;500;600;700;800", stack: "'Noto Sans Bengali', sans-serif" },
  { id: "Baloo Da 2", label: "Baloo Da 2 (Bengali Display)", googleSpec: "Baloo+Da+2:wght@400;500;600;700;800", stack: "'Baloo Da 2', sans-serif" },
];

export const TYPOGRAPHY_TAGS = [
  { key: "h1", label: "H1 — Hero / Main Heading" },
  { key: "h2", label: "H2 — Section Heading" },
  { key: "h3", label: "H3 — Sub Heading / Card Title" },
  { key: "h4", label: "H4 — Small Heading" },
  { key: "h5", label: "H5 — Micro Heading" },
  { key: "h6", label: "H6 — Label Heading" },
  { key: "p", label: "Paragraph (Body Copy)" },
];

export const FONT_WEIGHT_OPTIONS = [
  { value: "", label: "Default" },
  { value: "300", label: "300 (Light)" },
  { value: "400", label: "400 (Regular)" },
  { value: "500", label: "500 (Medium)" },
  { value: "600", label: "600 (SemiBold)" },
  { value: "700", label: "700 (Bold)" },
  { value: "800", label: "800 (ExtraBold)" },
  { value: "900", label: "900 (Black)" },
];

export function isPlainObject(val) {
  return Boolean(val) && typeof val === "object" && !Array.isArray(val);
}

/**
 * Resolves a localized/legacy pair of theme strings (e.g. announcementText & announcementTextEn)
 * so edits in either key immediately win over stale legacy defaults and explicit blanks are preserved.
 */
export function resolveThemeText(primary, secondary, legacyDefault = "", fallback = "") {
  const hasPrimary = primary !== undefined && primary !== null;
  const hasSecondary = secondary !== undefined && secondary !== null;
  const p = hasPrimary ? String(primary).trim() : "";
  const s = hasSecondary ? String(secondary).trim() : "";
  const def = typeof legacyDefault === "string" ? legacyDefault.trim() : "";

  if (hasPrimary && hasSecondary && p === "" && s === "") {
    return "";
  }
  if (p && p !== def && (!s || s === def)) return p;
  if (s && s !== def) return s;
  if (p) return p;
  if (s) return s;
  return fallback;
}

export function deepMerge(target, source) {
  const base = isPlainObject(target) ? { ...target } : {};
  if (!isPlainObject(source)) return base;
  for (const key of Object.keys(source)) {
    const srcVal = source[key];
    if (isPlainObject(srcVal) && isPlainObject(base[key])) {
      base[key] = deepMerge(base[key], srcVal);
    } else if (srcVal !== undefined) {
      base[key] = srcVal;
    }
  }
  return base;
}

/**
 * Builds an inline React style object supporting solid or gradient backgrounds.
 */
export function buildBgStyle(cfg = {}, fallbackSolid = "#ffffff") {
  if (!cfg || typeof cfg !== "object") {
    return { background: fallbackSolid };
  }
  const type = cfg.bgType || cfg.pageBgType || "solid";
  if (type === "gradient") {
    const dir = cfg.gradientDirection || "to right";
    const from = cfg.gradientFrom || cfg.pageGradientFrom || cfg.solidBg || fallbackSolid;
    const via = cfg.gradientVia;
    const to = cfg.gradientTo || cfg.pageGradientTo || from;
    const stops = via ? `${from}, ${via}, ${to}` : `${from}, ${to}`;
    return { background: `linear-gradient(${dir}, ${stops})` };
  }
  const solid = cfg.solidBg || cfg.pageBgColor || fallbackSolid;
  return { backgroundColor: solid, background: solid };
}

export function getFontStack(fontId) {
  if (!fontId) return "";
  const match = GOOGLE_FONT_OPTIONS.find((f) => f.id === fontId);
  return match ? match.stack : `'${fontId}', sans-serif`;
}

export function getGoogleFontsHref(typography = {}) {
  const chosen = new Set();
  if (typography.primaryFont) chosen.add(typography.primaryFont);
  if (typography.banglaFont) chosen.add(typography.banglaFont);
  for (const tag of TYPOGRAPHY_TAGS) {
    const tagCfg = typography[tag.key];
    if (tagCfg?.fontFamily) {
      chosen.add(tagCfg.fontFamily);
    }
  }
  const specs = [];
  for (const id of chosen) {
    const found = GOOGLE_FONT_OPTIONS.find((f) => f.id === id);
    if (found?.googleSpec) {
      specs.push(`family=${found.googleSpec}`);
    }
  }
  if (specs.length === 0) return null;
  return `https://fonts.googleapis.com/css2?${specs.join("&")}&display=swap`;
}

export function buildDynamicThemeCss(themesColors = {}) {
  const g = themesColors.globalTheme || {};
  const t = themesColors.typography || {};
  const rules = [];

  const primaryStack = t.primaryFont ? getFontStack(t.primaryFont) : "'Plus Jakarta Sans', 'Hind Siliguri', sans-serif";
  const banglaStack = t.banglaFont ? getFontStack(t.banglaFont) : "'Hind Siliguri', sans-serif";

  const rootBg =
    g.pageBgType === "gradient"
      ? `linear-gradient(${g.gradientDirection || "to bottom"}, ${g.pageGradientFrom || "#f8fafc"}, ${g.pageGradientTo || "#f0fdf4"})`
      : g.pageBgColor || "";

  rules.push(`.amardokan-storefront-root {
  font-family: ${primaryStack};
  --ad-primary: ${g.primaryColor || "#059669"};
  --ad-secondary: ${g.secondaryColor || "#022c22"};
  --ad-accent: ${g.accentColor || "#f59e0b"};
  --ad-surface: ${g.surfaceBgColor || "#ffffff"};
  --ad-border: ${g.borderColor || "#e5e5e5"};
  --ad-heading: ${g.headingColor || "#171717"};
  --ad-body: ${g.bodyTextColor || "#525252"};
  ${rootBg ? `background: ${rootBg};` : ""}
}`);

  rules.push(`.amardokan-storefront-root .font-bn {
  font-family: ${banglaStack};
}`);

  if (g.selectionBg || g.selectionText) {
    rules.push(`.amardokan-storefront-root ::selection {
  ${g.selectionBg ? `background-color: ${g.selectionBg};` : ""}
  ${g.selectionText ? `color: ${g.selectionText};` : ""}
}`);
  }

  for (const tag of TYPOGRAPHY_TAGS) {
    const cfg = t[tag.key];
    if (!cfg || typeof cfg !== "object") continue;
    const decls = [];
    if (cfg.fontFamily) decls.push(`font-family: ${getFontStack(cfg.fontFamily)} !important;`);
    if (cfg.fontStyle && cfg.fontStyle !== "normal") decls.push(`font-style: ${cfg.fontStyle} !important;`);
    if (cfg.fontStyle === "normal" && cfg.explicitNormal) decls.push(`font-style: normal !important;`);
    if (cfg.fontWeight) decls.push(`font-weight: ${cfg.fontWeight} !important;`);
    if (cfg.fontSize && String(cfg.fontSize).trim()) decls.push(`font-size: ${String(cfg.fontSize).trim()} !important;`);
    if (cfg.color && String(cfg.color).trim()) decls.push(`color: ${String(cfg.color).trim()} !important;`);

    if (decls.length > 0) {
      rules.push(`.amardokan-storefront-root ${tag.key} {\n  ${decls.join("\n  ")}\n}`);
    }
  }

  return rules.join("\n\n");
}

export const THEME_PRESETS = [
  {
    id: "emerald_luxe",
    name: "Emerald Luxe (Default)",
    description: "Signature Bangladesh Enterprise Emerald & Gold theme",
    swatch: ["#022c22", "#059669", "#fbbf24", "#ffffff"],
    patch: null, // Uses DEFAULT_THEME_CONFIG.themesColors cleanly
  },
  {
    id: "royal_indigo",
    name: "Royal Indigo Modern",
    description: "Deep indigo gradients with violet accents & crisp cards",
    swatch: ["#1e1b4b", "#4f46e5", "#f59e0b", "#f8fafc"],
    patch: {
      topHeader: {
        bgType: "gradient",
        solidBg: "#1e1b4b",
        gradientFrom: "#1e1b4b",
        gradientVia: "#312e81",
        gradientTo: "#1e1b4b",
        borderBottomColor: "#3730a3",
        notice1TextColor: "#fde047",
        notice1IconColor: "#fde047",
        notice2TextColor: "#c7d2fe",
        notice2IconColor: "#818cf8",
        hotlineTextColor: "#e0e7ff",
        hotlineIconColor: "#fde047",
        trackBtnText: "#e0e7ff",
        trackBtnIconColor: "#818cf8",
        trackBtnActiveBg: "#4f46e5",
      },
      mainHeader: {
        bgType: "solid",
        solidBg: "#ffffff",
        borderBottomColor: "#e0e7ff",
        logoTextColor: "#1e1b4b",
        menuHoverColor: "#4f46e5",
        cartIconColor: "#4f46e5",
        cartBadgeBg: "#4f46e5",
        accountIconColor: "#4f46e5",
      },
      globalTheme: {
        pageBgType: "solid",
        pageBgColor: "#f8fafc",
        primaryColor: "#4f46e5",
        secondaryColor: "#1e1b4b",
        accentColor: "#f59e0b",
        selectionBg: "#4f46e5",
      },
      productCards: {
        categoryLabelColor: "#4f46e5",
        cardHoverBorderColor: "#a5b4fc",
        buyNowBg: "#4f46e5",
        buyNowText: "#ffffff",
        viewMoreBtnBg: "#1e1b4b",
        categoryPillActiveBg: "#312e81",
      },
      productPage: {
        topBarBgType: "gradient",
        topBarGradientFrom: "#1e1b4b",
        topBarGradientVia: "#312e81",
        topBarGradientTo: "#1e1b4b",
        mainHeaderIconColor: "#4f46e5",
        mainHeaderOrderBtnBg: "#4f46e5",
        badgeBg: "#e0e7ff",
        badgeText: "#312e81",
        priceBoxBg: "#eef2ff",
        priceBoxBorder: "#c7d2fe",
        priceTextColor: "#3730a3",
        primaryBtnBg: "#4f46e5",
        tabActiveColor: "#4338ca",
        tabActiveBorderColor: "#4f46e5",
        ctaBannerBg: "#312e81",
        ctaBannerGradientTo: "#1e1b4b",
        checkoutSubmitBtnBg: "#4f46e5",
      },
      footer: {
        bgType: "solid",
        solidBg: "#0f172a",
        borderTopColor: "#1e293b",
        linkHoverColor: "#818cf8",
      },
      widgets: {
        backToTopBg: "#312e81",
        backToTopBorderColor: "#4f46e5",
      },
    },
  },
  {
    id: "obsidian_gold",
    name: "Midnight Obsidian & Gold",
    description: "Luxury dark charcoal header & gold CTA highlights",
    swatch: ["#09090b", "#d97706", "#fbbf24", "#fafafa"],
    patch: {
      topHeader: {
        bgType: "gradient",
        solidBg: "#09090b",
        gradientFrom: "#09090b",
        gradientVia: "#18181b",
        gradientTo: "#09090b",
        borderBottomColor: "#27272a",
        notice1TextColor: "#fbbf24",
        notice1IconColor: "#fbbf24",
        notice2TextColor: "#d4d4d8",
        notice2IconColor: "#f59e0b",
        hotlineTextColor: "#fafafa",
        hotlineIconColor: "#fbbf24",
        trackBtnText: "#e4e4e7",
        trackBtnIconColor: "#fbbf24",
        trackBtnActiveBg: "#d97706",
      },
      mainHeader: {
        bgType: "solid",
        solidBg: "#ffffff",
        borderBottomColor: "#e4e4e7",
        logoTextColor: "#09090b",
        menuHoverColor: "#d97706",
        cartIconColor: "#d97706",
        cartBadgeBg: "#d97706",
        accountIconColor: "#d97706",
      },
      globalTheme: {
        pageBgType: "solid",
        pageBgColor: "#f4f4f5",
        primaryColor: "#d97706",
        secondaryColor: "#09090b",
        accentColor: "#fbbf24",
        selectionBg: "#d97706",
      },
      productCards: {
        categoryLabelColor: "#b45309",
        buyNowBg: "#18181b",
        buyNowText: "#fbbf24",
        viewMoreBtnBg: "#09090b",
        categoryPillActiveBg: "#09090b",
      },
      productPage: {
        topBarGradientFrom: "#09090b",
        topBarGradientVia: "#18181b",
        topBarGradientTo: "#09090b",
        mainHeaderOrderBtnBg: "#18181b",
        badgeBg: "#fef3c7",
        badgeText: "#78350f",
        priceBoxBg: "#fffbeb",
        priceBoxBorder: "#fde68a",
        priceTextColor: "#92400e",
        primaryBtnBg: "#d97706",
        tabActiveColor: "#b45309",
        tabActiveBorderColor: "#d97706",
        ctaBannerBg: "#18181b",
        ctaBannerGradientTo: "#09090b",
        checkoutSubmitBtnBg: "#18181b",
      },
      footer: {
        bgType: "solid",
        solidBg: "#09090b",
        linkHoverColor: "#fbbf24",
      },
      widgets: {
        backToTopBg: "#09090b",
        backToTopIconColor: "#fbbf24",
        backToTopBorderColor: "#d97706",
      },
    },
  },
  {
    id: "crimson_rose",
    name: "Rose & Warm Coral",
    description: "Vibrant crimson conversion theme ideal for fashion & gifts",
    swatch: ["#4c0519", "#e11d48", "#fb7185", "#fff1f2"],
    patch: {
      topHeader: {
        bgType: "gradient",
        gradientFrom: "#4c0519",
        gradientVia: "#881337",
        gradientTo: "#4c0519",
        borderBottomColor: "#9f1239",
        notice1TextColor: "#fde047",
        notice1IconColor: "#fde047",
        notice2TextColor: "#fecdd3",
        notice2IconColor: "#fda4af",
        hotlineTextColor: "#ffe4e6",
        hotlineIconColor: "#fde047",
        trackBtnText: "#fecdd3",
        trackBtnIconColor: "#fda4af",
        trackBtnActiveBg: "#e11d48",
      },
      mainHeader: {
        bgType: "solid",
        solidBg: "#ffffff",
        borderBottomColor: "#ffe4e6",
        logoTextColor: "#881337",
        cartIconColor: "#e11d48",
        cartBadgeBg: "#e11d48",
        accountIconColor: "#e11d48",
      },
      globalTheme: {
        pageBgColor: "#fff1f2",
        primaryColor: "#e11d48",
        secondaryColor: "#4c0519",
        selectionBg: "#e11d48",
      },
      productCards: {
        categoryLabelColor: "#be123c",
        buyNowBg: "#e11d48",
        buyNowText: "#ffffff",
        viewMoreBtnBg: "#881337",
        categoryPillActiveBg: "#881337",
      },
      productPage: {
        topBarGradientFrom: "#4c0519",
        topBarGradientVia: "#881337",
        topBarGradientTo: "#4c0519",
        mainHeaderIconColor: "#e11d48",
        mainHeaderOrderBtnBg: "#e11d48",
        badgeBg: "#ffe4e6",
        badgeText: "#881337",
        priceBoxBg: "#fff1f2",
        priceBoxBorder: "#fecdd3",
        priceTextColor: "#be123c",
        primaryBtnBg: "#e11d48",
        tabActiveColor: "#be123c",
        tabActiveBorderColor: "#e11d48",
        ctaBannerBg: "#881337",
        ctaBannerGradientTo: "#4c0519",
        checkoutSubmitBtnBg: "#e11d48",
      },
      footer: {
        bgType: "solid",
        solidBg: "#1f1218",
        linkHoverColor: "#fb7185",
      },
      widgets: {
        backToTopBg: "#881337",
        backToTopBorderColor: "#e11d48",
      },
    },
  },
];

