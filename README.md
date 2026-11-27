<div align="center">

# SKzCART | E-commerce Frontend App
### **Single Page Storefront, Campaign Funnel & Operations Command Center**

[![React](https://img.shields.io/badge/React_19.0-20232A?style=for-the-badge&logo=react&logoColor=61DAFB)](https://react.dev/)
[![Vite](https://img.shields.io/badge/Vite_8.3-646CFF?style=for-the-badge&logo=vite&logoColor=white)](https://vitejs.dev/)
[![TailwindCSS](https://img.shields.io/badge/Tailwind_CSS_v4-38B2AC?style=for-the-badge&logo=tailwind-css&logoColor=white)](https://tailwindcss.com/)
[![Motion](https://img.shields.io/badge/Motion_12-0055FF?style=for-the-badge&logo=framer&logoColor=white)](https://motion.dev/)
[![Vercel Ready](https://img.shields.io/badge/Vercel-SPA_Ready-black?style=for-the-badge&logo=vercel&logoColor=white)](https://vercel.com/)

<p align="center">
  <b>High-speed React 19 Single Page Application (SPA) for the SKzCART Bangladesh-native e-commerce platform.</b><br/>
  Built with 100% database-driven storefronts, conversion-optimized campaign funnels, self-service order tracking &amp; customer portals, PIN/staff-gated Courier Rider hub, real-time DB-backed theme synchronization, full Google Analytics 4 + Meta Pixel/CAPI telemetry, and a role-gated Operations Admin Panel with 2FA verification.
</p>

</div>

---

## 🏗️ Frontend Architecture

**SKzCART Frontend** is structured around a central lazy-loaded router (`AppRouter`), a real-time DB-synced theme/config provider (`FrontPanelContext`), a unified visitor & conversion tracker (`marketing.js`), and a resilient REST client (`api.js`) that connects via Vite dev proxy locally or `VITE_API_BASE_URL` in production.

### 1. Application Routing & Multi-Portal Architecture

```mermaid
graph TB
    Entry["main.jsx + App.jsx<br/>(Global Data, PageView/Session Tracking &amp; Cart Coordinator)"] --> Provider["FrontPanelProvider<br/>(Theme, Branding, Typography &amp; Header/Footer Sync)"]
    Provider --> Layout["MainLayout<br/>(Front_Header, WhatsApp Widget, BackToTop)"]
    Layout --> Router["AppRouter<br/>(Code-Split Lazy Routes, Filter Reset &amp; Role Guards)"]

    subgraph Public_Portals["🛍️ Public Customer Portals"]
        Store["StorePage (/)<br/>5 Hero Slider Styles, Categories, Coverflow Reviews"]
        Shop["ShopPage (/shop)<br/>Advanced Filters, Sorting, Grid/List Views"]
        Landing["CampaignLandingPage<br/>(/products/:slug &amp; /campaign-products)"]
        Track["PublicOrderTracking (/track-order)<br/>Live Parcel Timeline Lookup"]
        UserPortal["UserPortal (/user)<br/>My Orders, Invoices, Profile &amp; Password Update"]
    end

    subgraph Restricted_Portals["🛡️ Restricted Operations Portals"]
        CourierPortal["CourierPortal (/courier)<br/>PIN/Staff-Gated Rider Delivery Panel"]
        FrontPanel["FrontPanel (/front-panel)<br/>Visual Storefront Customizer Studio"]
        AdminGate["AdminLoginModal (/admin)<br/>Staff DB Auth + 2FA Challenge + OTP Password Reset"]
        AdminDash["AdminLayout + 22 Admin Tabs<br/>(RBAC: ADMIN / MANAGER / DISPATCHER)"]
    end

    Router --> Store
    Router --> Shop
    Router --> Landing
    Router --> Track
    Router --> UserPortal
    Router --> CourierPortal
    Router --> FrontPanel
    Router --> AdminGate
    AdminGate -->|Verified JWT &amp; Optional 2FA| AdminDash
```

---

### 2. Real-Time Theme, Branding & Cross-Tab Synchronization Flow

To prevent default branding flicker on reload and ensure identical storefront state across all devices, `FrontPanelContext` synchronizes with the central backend database and caches the validated snapshot locally (`amardokan_db_theme_cache`).

```mermaid
sequenceDiagram
    autonumber
    actor Admin as 👨‍💼 Store Admin
    participant AdminUI as 🖥️ AdminShopDetails / AdminThemesColors
    participant Context as ⚡ FrontPanelContext
    participant Cache as 💾 localStorage (amardokan_db_theme_cache)
    participant Bus as 📡 BroadcastChannel (realtimeService)
    participant API as 🌐 Backend REST API (/api/v1/settings/shop)

    Note over Context,Cache: On page reload, themeConfig hydrates instantly from DB-synced cache (no default flash)
    Admin->>AdminUI: Updates Shop Name, Header, Footer, Delivery Zones, Sliders, or Colors
    AdminUI->>Context: updateThemeConfig({ shop, header }) (Synchronous Batch)
    Context->>Cache: Persist sanitized JSON snapshot
    Context->>Bus: Broadcast THEME_CONFIG_UPDATED to other open browser tabs
    Context->>API: POST /api/v1/settings/shop (Central DB persistence)
    API-->>Context: 200 OK (Saved Settings)
    Note over Context,API: Background poll every 10s + window focus refreshes from central DB
```

---

## 🌟 Core Frontend Modules & Capabilities

- **Public Storefront (`StorePage.jsx`, `ShopPage.jsx`, `HeroSection.jsx`):**
  - 5 selectable dynamic Hero Slider styles (`AdminSliders.jsx`), fully DB-driven product cards (`ProductCard.jsx`), interactive 360° & gallery modals (`ProductDetailModal.jsx`), and 3D customer review coverflow (`CustomerReviewsCoverflow.jsx`).
- **Conversion-Focused Landing & Product Pages (`CampaignLandingPage.jsx`):**
  - Supports dedicated multi-product campaign funnels (`/campaign-products`) and canonical regular product URLs (`/products/:slug`) via `campaignHelper.js`, distinguishing `"Campaign Page"` vs `"Product Page"` attribution cleanly across Meta CAPI & GA4 telemetry.
- **Checkout & Bangladesh Local Flows (`GuestCheckoutModal.jsx`, `CartDrawer.jsx`, `OrderConfirmationModal.jsx`):**
  - 11-digit BD mobile validation (`013–019`), dynamic DB-configured delivery zones & free-shipping thresholds (`ShopSetting`), coupon validation, Cash on Delivery (COD), bKash/Nagad/Rocket channels, and **SSLCommerz** online gateway redirect + sandbox simulator.
- **Standalone A4 Printing & Customer Self-Service (`InvoiceModal.jsx`, `UserPortal.jsx`):**
  - `InvoiceModal` renders outside `MainLayout` for clean white A4 printing (`6` selectable invoice templates configured via `AdminInvoiceGenerator.jsx`), alongside mobile/email login, password reset, and order tracking.
- **Admin Command Center (`AdminSidebar.jsx`, `AdminLayout.jsx`, `AppRouter.jsx`):**
  - **Role-Based Access Control (RBAC):** `ADMIN` (Full Access), `MANAGER` (Operations, Products, Orders, Analytics, Google Analytics, Invoice Generator, Leads, Campaigns, Reviews, Couriers, Notifications, Recycle Bin), `DISPATCHER` (Orders & Couriers).
  - **Smart Order Navigation (`navigateAdminTab` & `navKey`):** Clicking status cards on Overview jumps straight to filtered Orders or Payment Reconciliation, while clicking **Order Management** in the sidebar from any view cleanly resets all filters & modals back to **All Orders**.
  - **Core & Revenue Analytics:**
    - `AdminAnalytics.jsx` (`30 Days` default full-month view + `7d`, `14d`, `30d`, `6m`, `1y`, `Custom`, `All Time`, Revenue Trend Graph, Vertical `Orders vs Pending Pipeline` Bar Chart without horizontal scrollbars, expandable large chart popup modals with inline timeframe controls, and MFS/Gateway/Order Stage breakdown).
    - `AdminGoogleAnalytics.jsx` (**Google Analytics 4 & Visitor Intelligence**: `G-XXXX` / Property ID / API Secret setup + `Active`/`Inactive` pill toggle, `Traffic Sources` Pie Chart, `New vs Returning` & `Device` Pie Charts, `Visitors vs Page Views` & `Top Cities` Bar Charts, `E-Commerce Funnel Drop-Off` Bar Chart, Top Pages, and `Live Visitor Activity Stream` showing resolved `Product` names with a 10-row scroller).
    - `AdminMarketing.jsx` (**Meta Pixel & CAPI** with `Active`/`Inactive` toggle button, Live Event Stream, Pie & Vertical Bar Product Charts + **Ads Campaigns** with Meta OAuth, Boost Wizard & ROAS sync).
    - `AdminLeads.jsx` (**Lead Generation** CRM with A-Z customer profile modal, dedicated `Full Address` line below location, live SMTP connection indicator & editable Follow-Up Email composer).
    - `AdminInvoiceGenerator.jsx` (Live invoice customization across 6 templates & store branding).
  - **Appearances, Operations & Security:** `AdminShopDetails.jsx`, `AdminThemesColors.jsx`, `AdminSliders.jsx`, `AdminProductEditorial.jsx`, `AdminCustomerReviews.jsx`, `AdminMediaLibrary.jsx`, `AdminCouriers.jsx` (Testing Sandbox vs Live API mode + live webhook simulator & clean status labels), `AdminPayments.jsx`, `AdminNotifications.jsx` (SMTP gateway), `AdminRecycleBin.jsx`, `AdminAuditLogs.jsx` (with 2FA settings), and `AdminStaffManagement.jsx` (with Portal Access controls).

---

## 💻 Frontend Tech Stack

| Technology | Version | Purpose |
|---|---|---|
| **React** | `^19.0.1` | Component-based UI & React 19 concurrent rendering |
| **Vite** | `^8.3.0` | Ultra-fast dev server, `/api` proxy, and Rolldown bundler |
| **Tailwind CSS** | `^4.3.3` | Utility-first responsive design system (`@tailwindcss/vite`) |
| **Motion** | `^12.23.24` | Fluid UI animations, drawers, and review transitions |
| **Lucide React** | `^0.546.0` | Clean vector iconography across Storefront & Admin |
| **Custom State & Services** | Built-in | `FrontPanelContext`, `LanguageContext`, `CartContext`, `apiFetch`, `marketingTracker`, `realtimeService` |

---

## 📁 Frontend Directory Structure

```text
frontend/
├── index.html                        # Root HTML template with instant DB theme title hydration
├── package.json                      # Dependencies & Vite scripts (dev, build, preview)
├── vite.config.js                    # Vite build chunks & /api -> 127.0.0.1:8000 local proxy
├── vercel.json                       # SPA rewrite rules (/(.*) -> /index.html) for Vercel
├── .env.example                      # Frontend environment template
└── src/
    ├── App.jsx                       # Root view state, storefront GA4/PageView session pings, print isolation & cart sync
    ├── main.jsx                      # React 19 entry point
    ├── Layouts/
    │   ├── MainLayout.jsx            # Storefront wrapper (Front_Header, WhatsApp, BackToTop)
    │   └── AdminLayout.jsx           # Admin shell (Sidebar, Header, tab title resolver)
    ├── routers/
    │   └── AppRouter.jsx             # Lazy-loaded routes, sidebar filter reset & role-based admin tab guard
    ├── pages/
    │   └── StorePage.jsx             # Primary home storefront layout
    ├── Context/
    │   ├── LanguageContext.jsx       # Localization & category/product label helpers
    │   └── CartContext.jsx           # Shopping bag state helpers
    ├── components/
    │   ├── admin/                    # Operations Admin Portal (Analytics, GA4, Meta Pixel & CAPI, Ads, Leads, Invoice Generator, Couriers, Payments, Orders, Products, Editorial, Staff RBAC, Recycle Bin, etc.)
    │   ├── frontPanel/               # FrontPanelContext, defaultThemeConfig & visual customizer
    │   ├── Header/                   # Front_Header, Product_Header, Campaign_Header, Admin_Header, Courier_Header
    │   ├── Footer/                   # Dynamic DB-driven Storefront Footer
    │   ├── hero/                     # Multi-style HeroSection slider engine
    │   ├── Landing/                  # CampaignLandingPage
    │   ├── Product/                  # ProductCard, ProductDetailModal & galleries
    │   ├── Cart/                     # Slide-over CartDrawer
    │   ├── Checkout/                 # GuestCheckoutModal & OrderConfirmationModal
    │   ├── Reviews/                  # CustomerReviewsCoverflow & RateUsForm
    │   ├── shop/                     # ShopPage full catalog browser
    │   ├── Tracking/                 # PublicOrderTracking lookup
    │   ├── user/                     # UserAuthModal & UserPortal
    │   ├── courier/                  # CourierPortal rider view
    │   ├── WhatsApp/                 # Floating WhatsApp widget
    │   ├── BackToTop/                # Smooth scroll-to-top widget
    │   └── common/                   # Reusable modals
    ├── services/
    │   ├── api.js                    # Unified REST client (uses VITE_API_BASE_URL in production)
    │   ├── realtime.js               # Cross-tab BroadcastChannel + localStorage event sync
    │   ├── marketing.js              # Hybrid Meta Pixel + server CAPI deduplication + GA4 event/telemetry collector
    │   ├── notifications.js          # Active shop info cache for templates
    │   └── payment.js                # Client payment helpers
    └── utils/
        ├── analyticsRange.js         # Multi-granularity timeframe bounds & series builder (7d/14d/30d/6m/1y/custom/all)
        ├── bangladesh.js             # BD districts, thanas, 01X phone regex, BDT formatters
        ├── campaignHelper.js         # Active campaign matching & canonical URL resolver
        ├── categories.js             # Category extraction & normalization
        ├── countryCodes.js           # International phone dialing metadata
        ├── imageCompressor.js        # Client-side image compression before upload
        ├── invoiceTemplates.js       # 6 configurable invoice layout definitions
        ├── orderStatus.js            # Clean human-readable order & courier status formatters
        ├── paymentConfig.js          # Payment channel metadata & labels
        ├── productEditorial.jsx      # Custom editorial badges, checkout fields & delivery fee helpers
        ├── productImage.js           # Safe image fallbacks
        ├── productTags.js            # Dynamic product badge definitions
        ├── textSanitizer.js          # Text normalization utilities
        ├── themeHelper.js            # Dynamic CSS variable injection & 4 preset themes
        └── translations.js           # UI label translation dictionary
```

---

## ⚙️ Environment Variables & Local Setup

### 1. Environment Variables (`frontend/.env`)
Create `frontend/.env` from `frontend/.env.example`:
```env
# Leave empty in local development (Vite proxies /api and /media to http://127.0.0.1:8000)
# Set this in production (e.g. Vercel) to your live Render backend URL (without trailing slash):
VITE_API_BASE_URL=
```

### 2. Local Development
```bash
cd frontend
npm install
npm run dev
```
- **Storefront:** `http://localhost:3001/`
- **Admin Portal:** `http://localhost:3001/admin`
- **Production Build Check:** `npm run build` (outputs to `frontend/dist`)

---

## 🚀 Vercel Deployment Guide (Standalone Frontend Repo)

1. Push the `frontend/` directory to its own GitHub repository.
2. Import the repository in **Vercel**:
   - **Framework Preset:** `Vite`
   - **Build Command:** `npm run build`
   - **Output Directory:** `dist`
3. Add **Environment Variable** in Vercel:
   - `VITE_API_BASE_URL` = `https://your-backend-service.onrender.com` (no trailing slash)
4. Trigger a **Redeploy** after setting or updating `VITE_API_BASE_URL`.
5. Keep `vercel.json` tracked in GitHub so client-side React routes (`/admin`, `/shop`, `/products/...`, `/campaign-products`, `/track-order`, `/user`, `/courier`) resolve cleanly without 404 errors on page reload.
