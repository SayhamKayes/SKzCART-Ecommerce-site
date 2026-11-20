import React, { Suspense, lazy } from 'react';
import { StorePage } from '../pages/StorePage';
import { ROLE_PERMISSIONS } from '../components/admin/AdminSidebar';
import { useThemeConfig } from '../components/frontPanel/FrontPanelContext';
import { useLanguage } from '../Context/LanguageContext';
import { getProductCampaignInfo } from '../utils/campaignHelper';

// Code-split Customer Views
const ShopPage = lazy(() => import('../components/shop/ShopPage').then(m => ({ default: m.ShopPage || m.default })));
const CampaignLandingPage = lazy(() => import('../components/Landing/CampaignLandingPage').then(m => ({ default: m.CampaignLandingPage || m.default })));
const PublicOrderTracking = lazy(() => import('../components/Tracking/PublicOrderTracking').then(m => ({ default: m.PublicOrderTracking || m.default })));
const UserPortal = lazy(() => import('../components/user/UserPortal').then(m => ({ default: m.UserPortal || m.default })));
const CourierPortal = lazy(() => import('../components/courier/CourierPortal').then(m => ({ default: m.CourierPortal || m.default })));
const FrontPanel = lazy(() => import('../components/frontPanel/FrontPanel').then(m => ({ default: m.FrontPanel || m.default })));

// Code-split Admin Hub & Layout
const AdminLayout = lazy(() => import('../Layouts/AdminLayout').then(m => ({ default: m.AdminLayout || m.default })));
const AdminLoginModal = lazy(() => import('../components/admin/AdminLoginModal').then(m => ({ default: m.AdminLoginModal || m.default })));
const AdminOverview = lazy(() => import('../components/admin/AdminOverview').then(m => ({ default: m.AdminOverview || m.default })));
const AdminOrders = lazy(() => import('../components/admin/AdminOrders').then(m => ({ default: m.AdminOrders || m.default })));
const AdminProducts = lazy(() => import('../components/admin/AdminProducts').then(m => ({ default: m.AdminProducts || m.default })));
const AdminCouriers = lazy(() => import('../components/admin/AdminCouriers').then(m => ({ default: m.AdminCouriers || m.default })));
const AdminPayments = lazy(() => import('../components/admin/AdminPayments').then(m => ({ default: m.AdminPayments || m.default })));
const AdminMarketing = lazy(() => import('../components/admin/AdminMarketing').then(m => ({ default: m.AdminMarketing || m.default })));
const AdminNotifications = lazy(() => import('../components/admin/AdminNotifications').then(m => ({ default: m.AdminNotifications || m.default })));
const AdminBlueprint = lazy(() => import('../components/admin/AdminBlueprint').then(m => ({ default: m.AdminBlueprint || m.default })));
const AdminAuditLogs = lazy(() => import('../components/admin/AdminAuditLogs').then(m => ({ default: m.AdminAuditLogs || m.default })));
const AdminCampaign = lazy(() => import('../components/admin/AdminCampaign').then(m => ({ default: m.AdminCampaign || m.default })));
const AdminShopDetails = lazy(() => import('../components/admin/AdminShopDetails').then(m => ({ default: m.AdminShopDetails || m.default })));
const AdminThemesColors = lazy(() => import('../components/admin/AdminThemesColors').then(m => ({ default: m.AdminThemesColors || m.default })));
const AdminSliders = lazy(() => import('../components/admin/AdminSliders').then(m => ({ default: m.AdminSliders || m.default })));
const AdminMediaLibrary = lazy(() => import('../components/admin/AdminMediaLibrary').then(m => ({ default: m.AdminMediaLibrary || m.default })));
const AdminCustomerReviews = lazy(() => import('../components/admin/AdminCustomerReviews').then(m => ({ default: m.AdminCustomerReviews || m.default })));
const AdminStaffManagement = lazy(() => import('../components/admin/AdminStaffManagement').then(m => ({ default: m.AdminStaffManagement || m.default })));
const AdminRecycleBin = lazy(() => import('../components/admin/AdminRecycleBin').then(m => ({ default: m.AdminRecycleBin || m.default })));
const AdminProductEditorial = lazy(() => import('../components/admin/AdminProductEditorial').then(m => ({ default: m.AdminProductEditorial || m.default })));
const AdminAnalytics = lazy(() => import('../components/admin/AdminAnalytics').then(m => ({ default: m.AdminAnalytics || m.default })));
const AdminLeads = lazy(() => import('../components/admin/AdminLeads').then(m => ({ default: m.AdminLeads || m.default })));

const RouteLoadingSpinner = () => (
  <div className="min-h-[60vh] flex flex-col items-center justify-center p-8 text-center">
    <div className="w-9 h-9 border-3 border-emerald-600 border-t-transparent rounded-full animate-spin mb-3" />
    <p className="text-xs font-semibold text-neutral-500 animate-pulse">Loading page...</p>
  </div>
);

class AdminTabErrorBoundary extends React.Component {
  constructor(props) {
    super(props);
    this.state = { hasError: false, errorMessage: '' };
  }

  static getDerivedStateFromError(error) {
    return { hasError: true, errorMessage: error?.message || 'Unexpected rendering error' };
  }

  componentDidCatch(error, info) {
    console.error('Admin Tab Error:', error, info);
  }

  componentDidUpdate(prevProps) {
    if (prevProps.tabKey !== this.props.tabKey && this.state.hasError) {
      this.setState({ hasError: false, errorMessage: '' });
    }
  }

  render() {
    if (this.state.hasError) {
      return (
        <div className="bg-white rounded-3xl p-8 border border-rose-200 shadow-xs text-center space-y-3 max-w-xl mx-auto my-8">
          <h2 className="text-base font-black text-rose-800">Something went wrong loading this view</h2>
          <p className="text-xs text-neutral-600 font-mono bg-rose-50 p-3 rounded-xl border border-rose-100 break-words">
            {this.state.errorMessage}
          </p>
          <div className="flex items-center justify-center gap-2 pt-2">
            <button
              type="button"
              onClick={() => this.setState({ hasError: false, errorMessage: '' })}
              className="px-4 py-2 rounded-xl bg-emerald-700 text-white text-xs font-bold cursor-pointer"
            >
              Retry View
            </button>
            <button
              type="button"
              onClick={() => {
                try {
                  localStorage.removeItem('amardokan_custom_campaigns');
                  localStorage.removeItem('amardokan_active_tenant_id');
                  sessionStorage.removeItem('amardokan_active_tenant_id');
                } catch {}
                window.location.reload();
              }}
              className="px-4 py-2 rounded-xl bg-neutral-100 text-neutral-800 text-xs font-bold border border-neutral-200 cursor-pointer"
            >
              Reset Cache & Reload
            </button>
          </div>
        </div>
      );
    }
    return this.props.children;
  }
}


export const AppRouter = ({
  currentView,
  setCurrentView,
  navigateToView,
  cartItems = [],
  onOpenCart,
  // Admin State
  isAdminAuthenticated,
  setIsAdminAuthenticated,
  adminTab,
  setAdminTab,
  adminRole,
  setAdminRole,
  pendingOrdersCount,
  // Data State
  products,
  orders,
  coupons,
  landingPages,
  auditLogs,
  refreshData,
  isLoadingProducts = false,
  // Cart & Product Handlers
  filteredProducts,
  categories,
  selectedCategory,
  setSelectedCategory,
  searchQuery,
  setSearchQuery,
  handleAddToCart,
  handleQuickBuy,
  setSelectedProduct,
  handleOrderSuccess,
  initialTrackData,
  // User state
  currentUser,
  handleLogoutUser,
  setIsAuthModalOpen,
  // Modals
  setInvoiceOrder,
  setCourierAssignOrder,
  setAdminSelectedOrder,
  handleUpdateStock,
  handleBulkUpdateStock,
  handleAddNewProduct,
  handleUpdateProduct,
  handleDeleteProduct,
  handleReorderProducts,
}) => {
  const { themeConfig, updateThemeConfig } = useThemeConfig();
  const { isEnglish } = useLanguage();
  const [orderStatusFilter, setOrderStatusFilter] = React.useState('ALL');
  const [orderPaymentMethodFilter, setOrderPaymentMethodFilter] = React.useState('ALL');

  // Strict Tab Guard: Automatically redirects if the active tab is forbidden for the current role
  React.useEffect(() => {
    if (currentView === 'admin' && isAdminAuthenticated) {
      const allowed = ROLE_PERMISSIONS[adminRole] || ROLE_PERMISSIONS.ADMIN;
      if (!allowed.includes(adminTab)) {
        setAdminTab(allowed[0]);
      }
    }
  }, [currentView, isAdminAuthenticated, adminRole, adminTab, setAdminTab]);

  if (currentView === 'front-panel') {
    return (
      <Suspense fallback={<RouteLoadingSpinner />}>
        <FrontPanel
          products={products}
          onNavigateToView={navigateToView}
        />
      </Suspense>
    );
  }

  if (currentView === 'store') {
    return (
      <StorePage
        products={products}
        filteredProducts={filteredProducts}
        categories={categories}
        selectedCategory={selectedCategory}
        setSelectedCategory={setSelectedCategory}
        onAddToCart={handleAddToCart}
        onQuickBuy={handleQuickBuy}
        onSelectProduct={setSelectedProduct}
        onNavigateToLanding={(prod) => navigateToView('landing', prod)}
        onNavigateToView={navigateToView}
        isLoading={isLoadingProducts}
        onClearFilters={() => {
          if (setSelectedCategory) setSelectedCategory('ALL');
          if (setSearchQuery) setSearchQuery('');
        }}
      />
    );
  }

  if (currentView === 'shop') {
    return (
      <Suspense fallback={<RouteLoadingSpinner />}>
        <ShopPage
          products={products}
          categories={categories}
          onAddToCart={handleAddToCart}
          onQuickBuy={handleQuickBuy}
          onSelectProduct={setSelectedProduct}
          onNavigateToView={navigateToView}
          initialCategory={selectedCategory}
          initialSearch={searchQuery}
          isLoading={isLoadingProducts}
        />
      </Suspense>
    );
  }

  if (currentView === 'landing') {
    const path = window.location.pathname;
    const match = path.match(/\/(?:products|product)\/([^/]+)/i);
    const rawSlug = match ? match[1].replace(/-landing-page$/, '') : null;
    let slugOrId = rawSlug;
    if (rawSlug) {
      try {
        slugOrId = decodeURIComponent(rawSlug);
      } catch {}
    }
    const rawCampaignId = (Array.isArray(themeConfig?.campaign?.activeProductIds) && themeConfig.campaign.activeProductIds[0]) || themeConfig?.campaign?.activeProductId;
    const activeCampaignId = (rawCampaignId && rawCampaignId !== 'prod-1790503380337') ? rawCampaignId : (products && products[0]?.id) || 'prod-1';

    // Check URL query parameters for ?product=xxx or ?productId=xxx or ?slug=xxx
    const searchParams = typeof window !== 'undefined' ? new URLSearchParams(window.location.search) : new URLSearchParams();
    const queryProd = searchParams.get('product') || searchParams.get('productId') || searchParams.get('slug');

    const cleanQuery = queryProd ? String(queryProd).toLowerCase() : null;
    const cleanSlug = slugOrId ? String(slugOrId).toLowerCase() : null;
    const norm = (s) => (s ? String(s).toLowerCase().trim().replace(/^-+|-+$/g, '') : '');
    const targetNorm = norm(cleanSlug || cleanQuery);

    const dynamicProduct = cleanQuery
      ? products.find(p => p.id === queryProd || String(p.id).toLowerCase() === cleanQuery || norm(p.slug) === targetNorm || (p.slug && p.slug.toLowerCase() === cleanQuery))
      : (cleanSlug
        ? products.find(p => String(p.id).toLowerCase() === cleanSlug || norm(p.slug) === targetNorm || (p.slug && p.slug.toLowerCase() === cleanSlug) || (rawSlug && p.slug === rawSlug))
        : (activeCampaignId ? products.find(p => p.id === activeCampaignId) : null) || products[0]);

    if (!dynamicProduct) {
      if (isLoadingProducts) {
        return (
          <div className="min-h-[70vh] flex flex-col items-center justify-center p-8 text-center bg-white">
            <div className="w-10 h-10 border-4 border-emerald-600 border-t-transparent rounded-full animate-spin mb-4" />
            <p className="text-sm font-semibold text-neutral-600">Loading...</p>
          </div>
        );
      }
      return (
        <div className="min-h-[70vh] flex flex-col items-center justify-center p-8 text-center bg-white">
          <div className="w-16 h-16 rounded-2xl bg-amber-100 text-amber-700 flex items-center justify-center text-2xl font-bold mb-4">
            ⚠️
          </div>
          <h2 className="text-2xl font-black text-neutral-900 mb-2">Product Not Found</h2>
          <p className="text-sm text-neutral-600 mb-6 max-w-md">
            The product you are looking for is currently unavailable or has been relocated.
          </p>
          <button
            onClick={() => navigateToView('store')}
            className="px-6 py-3 rounded-xl bg-emerald-700 hover:bg-emerald-800 text-white font-bold text-sm shadow-md transition-all cursor-pointer"
          >
            View All Products →
          </button>
        </div>
      );
    }

    // Accurately verify if dynamicProduct is currently part of an active campaign
    const campInfo = getProductCampaignInfo(dynamicProduct, themeConfig);
    const isCampaign = campInfo.isCampaign;
    const effectiveCampaignConfig = campInfo.campaignConfig;

    // If NOT an active campaign product, but accessed via /campaign-products, update URL to clean /products/{slug}
    if (typeof window !== 'undefined' && !isCampaign && path.startsWith('/campaign-products')) {
      const normalSlug = dynamicProduct.slug || dynamicProduct.id;
      window.history.replaceState({}, '', `/products/${normalSlug}`);
    }

    return (
      <Suspense fallback={<RouteLoadingSpinner />}>
        <CampaignLandingPage
          landingPage={landingPages[0]}
          product={dynamicProduct}
          campaignConfig={isCampaign ? effectiveCampaignConfig : null}
          onOrderSuccess={handleOrderSuccess}
          onNavigateToView={navigateToView}
          isCampaignPage={isCampaign}
          cartItems={cartItems}
          onOpenCart={onOpenCart}
          currentUser={currentUser}
          onOpenAuthModal={() => setIsAuthModalOpen && setIsAuthModalOpen(true)}
          onLogoutUser={handleLogoutUser}
          searchQuery={searchQuery}
          setSearchQuery={setSearchQuery}
        />
      </Suspense>
    );
  }

  if (currentView === 'track') {
    const userOrders = currentUser?.phone
      ? (orders || []).filter(o => {
          const cleanCust = currentUser.phone.replace(/\D/g, "");
          const cleanOrd = (o.address?.phone || "").replace(/\D/g, "");
          return cleanCust.length >= 6 && cleanOrd.length >= 6 &&
            (cleanOrd.endsWith(cleanCust.slice(-10)) || cleanCust.endsWith(cleanOrd.slice(-10)));
        })
      : [];
    const activeOrders = userOrders.filter(o => !['DELIVERED', 'CANCELLED', 'RETURNED'].includes(o.status));

    return (
      <Suspense fallback={<RouteLoadingSpinner />}>
        <PublicOrderTracking
          initialOrderId={initialTrackData?.id}
          initialPhone={initialTrackData?.phone || currentUser?.phone}
          autoSearch={!!initialTrackData}
          activeOrders={activeOrders}
          allUserOrders={userOrders}
          currentUser={currentUser}
        />
      </Suspense>
    );
  }

  if (currentView === 'user') {
    return (
      <Suspense fallback={<RouteLoadingSpinner />}>
        <UserPortal
          orders={orders}
          currentUser={currentUser}
          onOpenAuthModal={() => setIsAuthModalOpen(true)}
          onLogoutUser={handleLogoutUser}
          onBackToStore={() => navigateToView('store')}
          onViewInvoice={(ord) => setInvoiceOrder(ord)}
        />
      </Suspense>
    );
  }

  if (currentView === 'courier') {
    return (
      <Suspense fallback={<RouteLoadingSpinner />}>
        <CourierPortal
          orders={orders}
          onRefresh={refreshData}
          onBackToStore={() => navigateToView('store')}
        />
      </Suspense>
    );
  }

  if (currentView === 'admin') {
    if (!isAdminAuthenticated) {
      return (
        <Suspense fallback={<RouteLoadingSpinner />}>
          <AdminLoginModal
            onSuccess={(staffUser) => {
              try {
                sessionStorage.setItem('amardokan_admin_auth', 'true');
                if (staffUser?.role) {
                  sessionStorage.setItem('amardokan_admin_role', staffUser.role);
                }
                if (staffUser) {
                  sessionStorage.setItem('amardokan_admin_user', JSON.stringify(staffUser));
                }
              } catch {}
              setIsAdminAuthenticated(true);
              if (staffUser?.role) {
                setAdminRole(staffUser.role);
                const allowed = ROLE_PERMISSIONS[staffUser.role] || ROLE_PERMISSIONS.ADMIN;
                setAdminTab(allowed[0]);
              }
            }}
            onBackToStore={() => navigateToView('store')}
          />
        </Suspense>
      );
    }

    return (
      <Suspense fallback={<RouteLoadingSpinner />}>
        <AdminLayout
          currentTab={adminTab}
          setCurrentTab={setAdminTab}
          currentRole={adminRole}
          setCurrentRole={setAdminRole}
          onExitToStore={() => navigateToView('store')}
          onOpenRiderPortal={() => navigateToView('courier')}
          onOpenFrontPanel={() => navigateToView('front-panel')}
          onLogout={() => {
            sessionStorage.removeItem('amardokan_admin_auth');
            sessionStorage.removeItem('amardokan_admin_role');
            sessionStorage.removeItem('amardokan_admin_user');
            sessionStorage.removeItem('amardokan_staff_token');
            localStorage.removeItem('amardokan_staff_token');
            setIsAdminAuthenticated(false);
            setAdminRole('ADMIN');
            setAdminTab('overview');
          }}
          pendingOrdersCount={pendingOrdersCount}
        >
          {adminTab === 'overview' && (
            <AdminOverview
              orders={orders}
              products={products}
              onViewOrders={(status = 'ALL', paymentMethod = 'ALL') => {
                setOrderStatusFilter(status);
                setOrderPaymentMethodFilter(paymentMethod);
                setAdminTab('orders');
              }}
              onSelectOrderStatusFilter={(status, paymentMethod = 'ALL') => {
                setOrderStatusFilter(status);
                setOrderPaymentMethodFilter(paymentMethod);
                setAdminTab('orders');
              }}
              onNavigateTab={(tab) => setAdminTab(tab)}
              onSelectOrder={(ord) => setAdminSelectedOrder(ord)}
            />
          )}
          {adminTab === 'shopDetails' && (
            <AdminShopDetails
              orders={orders}
              products={products}
              coupons={coupons}
              onRefreshCoupons={refreshData}
              onNavigateTab={(tab) => setAdminTab(tab)}
              onSelectOrderStatusFilter={(status) => {
                setOrderStatusFilter(status);
                setAdminTab('orders');
              }}
            />
          )}
          {adminTab === 'themesColors' && (
            <AdminThemesColors />
          )}
          {adminTab === 'sliders' && (
            <AdminSliders products={products} />
          )}
          {adminTab === 'media' && (
            <AdminMediaLibrary />
          )}
          {adminTab === 'reviews' && (
            <AdminCustomerReviews
              isEnglish={isEnglish}
              products={products}
            />
          )}
          {adminTab === 'orders' && (
            <AdminOrders
              orders={orders}
              onRefresh={refreshData}
              onSelectOrder={(ord) => setAdminSelectedOrder(ord)}
              onPrintInvoice={(ord) => setInvoiceOrder(ord)}
              onOpenAssignCourier={(ord) => setCourierAssignOrder(ord)}
              currentRole={adminRole}
              initialStatusFilter={orderStatusFilter}
              initialPaymentMethodFilter={orderPaymentMethodFilter}
            />
          )}
          {adminTab === 'products' && (
            <AdminProducts
              products={products}
              categories={categories}
              onUpdateProductStock={handleUpdateStock}
              onBulkUpdateStock={handleBulkUpdateStock}
              onAddNewProduct={handleAddNewProduct}
              onUpdateProduct={handleUpdateProduct}
              onDeleteProduct={handleDeleteProduct}
              onReorderProducts={handleReorderProducts}
              onRefreshData={refreshData}
            />
          )}
          {(adminTab === 'campaignProducts' || adminTab === 'campaign') && (
            <AdminCampaign
              products={products}
              themeConfig={themeConfig}
              updateThemeConfig={updateThemeConfig}
              onNavigateToView={navigateToView}
            />
          )}
          {adminTab === 'productEditorial' && <AdminProductEditorial />}
          {adminTab === 'couriers' && (
            <AdminCouriers
              orders={orders}
              onRefresh={refreshData}
              onOpenRiderPortal={() => navigateToView('courier')}
            />
          )}
          {adminTab === 'payments' && <AdminPayments orders={orders} onRefreshOrders={refreshData} />}
          {adminTab === 'marketing' && (
            <AdminTabErrorBoundary tabKey="marketing">
              <AdminMarketing
                products={products}
                landingPages={landingPages}
                orders={orders}
                sectionMode="pixel"
                onNavigateTab={(tab) => setAdminTab(tab)}
                onSelectCampaignProduct={(prodId) => {
                  if (typeof updateThemeConfig === 'function') {
                    updateThemeConfig('campaign', { activeProductId: prodId });
                  }
                }}
                onNavigateToView={navigateToView}
              />
            </AdminTabErrorBoundary>
          )}
          {adminTab === 'adCampaigns' && (
            <AdminTabErrorBoundary tabKey="adCampaigns">
              <AdminMarketing
                products={products}
                landingPages={landingPages}
                orders={orders}
                sectionMode="campaigns"
                onNavigateTab={(tab) => setAdminTab(tab)}
                onSelectCampaignProduct={(prodId) => {
                  if (typeof updateThemeConfig === 'function') {
                    updateThemeConfig('campaign', { activeProductId: prodId });
                  }
                }}
                onNavigateToView={navigateToView}
              />
            </AdminTabErrorBoundary>
          )}
          {adminTab === 'analytics' && <AdminAnalytics orders={orders} products={products} />}
          {adminTab === 'leads' && <AdminLeads orders={orders} />}
          {adminTab === 'notifications' && <AdminNotifications orders={orders} />}
          {adminTab === 'blueprint' && <AdminBlueprint />}
          {adminTab === 'audit' && <AdminAuditLogs logs={auditLogs} onRefresh={refreshData} />}
          {adminTab === 'staff' && <AdminStaffManagement />}
          {adminTab === 'recycleBin' && <AdminRecycleBin onRefreshData={refreshData} />}
        </AdminLayout>
      </Suspense>
    );
  }

  return null;
};
