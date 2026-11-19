import React, { useState, useEffect, useRef } from 'react';
import { MainLayout } from './Layouts/MainLayout';
import { AppRouter } from './routers/AppRouter';

// Modals
import { ProductDetailModal } from './components/Product/ProductDetailModal';
import { CartDrawer } from './components/Cart/CartDrawer';
import { GuestCheckoutModal } from './components/Checkout/GuestCheckoutModal';
import { OrderConfirmationModal } from './components/Checkout/OrderConfirmationModal';
import { UserAuthModal } from './components/user/UserAuthModal';
import { InvoiceModal } from './components/admin/InvoiceModal';
import { AssignCourierModal } from './components/admin/AssignCourierModal';
import { AdminOrderDetailModal } from './components/admin/AdminOrderDetailModal';
import CustomModal from './components/common/CustomModal';

// Services & Utils
import { realtimeService } from './services/realtime';
import { apiClient } from './services/api';
import { marketingTracker } from './services/marketing';
import { getUniqueCategories, matchesCategory } from './utils/categories';
import { useThemeConfig } from './components/frontPanel/FrontPanelContext';
import { getProductCampaignInfo } from './utils/campaignHelper';
import { DEFAULT_PRODUCT_PLACEHOLDER } from './utils/productImage';

export default function App() {
  const { themeConfig } = useThemeConfig();
  const [currentView, setCurrentView] = useState(() => {
    if (typeof window === 'undefined') return 'store';
    const path = window.location.pathname;
    if (path === '/admin' || path.startsWith('/admin')) return 'admin';
    if (path === '/front-panel' || path.startsWith('/front-panel')) return 'front-panel';
    if (
      path === '/campaign-products' ||
      path === '/special-campaign' ||
      path.startsWith('/campaign-products') ||
      path.startsWith('/special-campaign') ||
      path === '/landing-campaign' ||
      path.startsWith('/landing') ||
      path.startsWith('/products/') ||
      path.startsWith('/product/')
    ) {
      return 'landing';
    }
    if (path === '/user' || path.startsWith('/user')) return 'user';
    if (path === '/courier' || path.startsWith('/courier')) return 'courier';
    if (path === '/track' || path === '/track-order' || path === '/tracking' || path.startsWith('/track')) return 'track';
    if (path === '/shop' || path.startsWith('/shop') || path === '/products' || path === '/product') return 'shop';
    return 'store';
  });

  // State diffing refs to eliminate redundant render loops
  const lastProdsJsonRef = useRef('');
  const lastOrdersJsonRef = useRef('');
  const lastCouponsJsonRef = useRef('');
  const lastAuditJsonRef = useRef('');

  // Admin Auth State
  const [isAdminAuthenticated, setIsAdminAuthenticated] = useState(() => {
    return sessionStorage.getItem('amardokan_admin_auth') === 'true';
  });
  const [adminRole, setAdminRole] = useState(() => {
    return sessionStorage.getItem('amardokan_admin_role') || 'ADMIN';
  });
  const [adminTab, setAdminTab] = useState(() => {
    const savedRole = sessionStorage.getItem('amardokan_admin_role');
    return savedRole === 'DISPATCHER' ? 'orders' : 'overview';
  });


  // Core Data States - Pure Backend First (Cached in localStorage for instant rendering without mock data)
  const [products, setProducts] = useState(() => {
    try {
      const cached = localStorage.getItem('amardokan_cached_products');
      if (cached) {
        const parsed = JSON.parse(cached);
        if (Array.isArray(parsed) && parsed.length > 0) return parsed;
      }
    } catch {}
    return [];
  });
  const [isLoadingProducts, setIsLoadingProducts] = useState(true);

  const [orders, setOrders] = useState(() => {
    try {
      const cached = localStorage.getItem('amardokan_cached_orders');
      if (cached) {
        const parsed = JSON.parse(cached);
        if (Array.isArray(parsed)) return parsed;
      }
    } catch {}
    return [];
  });

  const [coupons, setCoupons] = useState(() => {
    try {
      const cached = localStorage.getItem('amardokan_cached_coupons');
      if (cached) {
        const parsed = JSON.parse(cached);
        if (Array.isArray(parsed)) return parsed;
      }
    } catch {}
    return [];
  });

  const [landingPages, setLandingPages] = useState([]);
  const [auditLogs, setAuditLogs] = useState([]);

  // Filter / Search in Store
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCategory, setSelectedCategory] = useState('ALL');

  // Cart State
  const [cartItems, setCartItems] = useState(() => {
    try {
      const saved = localStorage.getItem('amardokan_cart');
      if (!saved) return [];
      const parsed = JSON.parse(saved);
      if (!Array.isArray(parsed)) return [];
      // Allow any valid cart item
      return parsed.filter(item => Boolean(item.productId || item.id));
    } catch {
      return [];
    }
  });

  useEffect(() => {
    try {
      localStorage.setItem('amardokan_cart', JSON.stringify(cartItems));
    } catch {}
  }, [cartItems]);

  const [isCartOpen, setIsCartOpen] = useState(false);
  const [appliedCoupon, setAppliedCoupon] = useState(undefined);

  // Modals
  const [selectedProduct, setSelectedProduct] = useState(null);
  const [isCheckoutOpen, setIsCheckoutOpen] = useState(false);
  const [confirmedOrder, setConfirmedOrder] = useState(null);
  const [paymentAlertModal, setPaymentAlertModal] = useState(null);

  // Admin Modals
  const [adminSelectedOrder, setAdminSelectedOrder] = useState(null);
  const [invoiceOrder, setInvoiceOrder] = useState(null);
  const [courierAssignOrder, setCourierAssignOrder] = useState(null);

  // Track Page pre-fill state from URL params or direct call
  const [initialTrackData, setInitialTrackData] = useState(() => {
    if (typeof window === 'undefined') return null;
    try {
      const params = new URLSearchParams(window.location.search);
      const orderId = params.get('id') || params.get('orderId') || params.get('order_id');
      const phone = params.get('phone');
      return orderId ? { id: orderId, phone } : null;
    } catch {
      return null;
    }
  });

  // Customer User Auth State
  const [currentUser, setCurrentUser] = useState(() => {
    try {
      const saved = localStorage.getItem('amardokan_user_session');
      if (!saved) return null;
      const parsed = JSON.parse(saved);
      return parsed && parsed.user ? parsed.user : parsed;
    } catch {
      return null;
    }
  });
  const [isAuthModalOpen, setIsAuthModalOpen] = useState(false);
  const [orderCredentials, setOrderCredentials] = useState(null);

  const handleLoginSuccess = (user) => {
    setCurrentUser(user);
    try {
      localStorage.setItem('amardokan_user_session', JSON.stringify(user));
    } catch {}
    setIsAuthModalOpen(false);
  };

  const handleLogoutUser = () => {
    try {
      localStorage.removeItem('amardokan_user_session');
      localStorage.removeItem('amardokan_customer_profile');
      sessionStorage.removeItem('amardokan_user_session');
    } catch {}
    setCurrentUser(null);
    navigateToView('store');
  };

  const navigateToView = (view, data = null) => {
    if (view === 'store') {
      window.history.pushState({}, '', '/');
    } else if (view === 'landing' && (data?.productId || data?.slug || data?.id)) {
      const prodId = data.productId || data.id;
      const targetProd = products.find(
        (p) => p.id === prodId || (data.slug && p.slug === data.slug)
      );
      const campInfo = getProductCampaignInfo(targetProd || data, themeConfig);
      if (campInfo.isCampaign || data?.forceCampaign || data?.isCampaign) {
        window.history.pushState(
          {},
          '',
          `/campaign-products?product=${targetProd?.id || prodId}`
        );
      } else {
        const slug = targetProd?.slug || data?.slug || prodId;
        window.history.pushState({}, '', `/products/${slug}`);
      }
    } else if (view === 'landing') {
      const rawSpecialId =
        (Array.isArray(themeConfig?.campaign?.activeProductIds) &&
          themeConfig.campaign.activeProductIds[0]) ||
        themeConfig?.campaign?.activeProductId;
      const specialProdId = (rawSpecialId && rawSpecialId !== 'prod-1790503380337') ? rawSpecialId : (products && products[0]?.id) || 'prod-1';
      const activeProd = products.find((p) => p.id === specialProdId) || products[0];
      if (activeProd) {
        window.history.pushState({}, '', `/campaign-products?product=${activeProd.id}`);
      } else {
        window.history.pushState({}, '', '/campaign-products');
      }
    } else if (view === 'front-panel') {
      window.history.pushState({}, '', '/front-panel');
    } else if (view === 'track') {
      if (data?.id) {
        window.history.pushState({}, '', `/track-order?id=${data.id}`);
        setInitialTrackData(data);
      } else {
        window.history.pushState({}, '', '/track-order');
      }
    } else {
      window.history.pushState({}, '', `/${view}`);
    }
    setCurrentView(view);
    window.scrollTo({ top: 0, left: 0, behavior: 'instant' });
  };

  // URL Path Routing Listener
  useEffect(() => {
    const handleLocationChange = () => {
      window.scrollTo({ top: 0, left: 0, behavior: 'instant' });
      const path = window.location.pathname;
      if (path === '/admin' || path.startsWith('/admin')) {
        setCurrentView('admin');
      } else if (path === '/front-panel' || path.startsWith('/front-panel')) {
        setCurrentView('front-panel');
      } else if (
        path === '/campaign-products' ||
        path === '/special-campaign' ||
        path.startsWith('/campaign-products') ||
        path.startsWith('/special-campaign') ||
        path === '/landing-campaign' ||
        path.startsWith('/landing') ||
        path.startsWith('/products/') ||
        path.startsWith('/product/')
      ) {
        setCurrentView('landing');
      } else if (path === '/user' || path.startsWith('/user')) {
        setCurrentView('user');
      } else if (path === '/courier' || path.startsWith('/courier')) {
        setCurrentView('courier');
      } else if (
        path === '/track' ||
        path === '/track-order' ||
        path === '/tracking' ||
        path.startsWith('/track')
      ) {
        try {
          const params = new URLSearchParams(window.location.search);
          const orderId = params.get('id') || params.get('orderId') || params.get('order_id');
          const phone = params.get('phone');
          if (orderId) {
            setInitialTrackData({ id: orderId, phone });
          }
        } catch {}
        setCurrentView('track');
      } else if (path === '/shop' || path.startsWith('/shop') || path === '/products' || path === '/product') {
        setCurrentView('shop');
      } else {
        setCurrentView('store');
      }
    };

    handleLocationChange();
    window.addEventListener('popstate', handleLocationChange);
    return () => window.removeEventListener('popstate', handleLocationChange);
  }, []);

  // Handle SSLCommerz return URL query parameters (success, fail, cancel)
  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const orderId = params.get('order_id');
    const paymentStatus = params.get('payment_status');
    const tranId = params.get('tran_id');
    const reason = params.get('reason');

    if (orderId && paymentStatus) {
      if (paymentStatus === 'success') {
        setCartItems([]);
        try {
          localStorage.removeItem('amardokan_cart');
          localStorage.setItem('amardokan_cart', '[]');
        } catch {}
      }
      window.history.replaceState({}, document.title, window.location.pathname);

      apiClient.getOrders().then((allOrders) => {
        if (Array.isArray(allOrders) && allOrders.length > 0) {
          setOrders(allOrders);
          const found = allOrders.find((o) => o.id === orderId);
          if (found) {
            if (paymentStatus === 'success') {
              setConfirmedOrder(found);
              setCartItems([]);
              try {
                localStorage.removeItem('amardokan_cart');
                localStorage.setItem('amardokan_cart', '[]');
              } catch {}
              realtimeService.playChime('order');
            } else if (paymentStatus === 'failed') {
              setPaymentAlertModal({
                type: 'error',
                title: 'SSLCommerz Online Payment Failed',
                message: `Payment gateway transaction could not be confirmed. Reason: ${reason || 'Payment failed'}. You can check your order status or try again.`,
              });
            } else if (paymentStatus === 'cancelled') {
              setPaymentAlertModal({
                type: 'warning',
                title: 'Payment Cancelled',
                message: 'You cancelled the SSLCommerz payment window. The order remains saved as pending.',
              });
            }
          }
        }
      });
    }
  }, []);

  // Load backend data if available
  const refreshData = async () => {
    try {
      const [prodsRes, ordersRes, couponsRes, auditRes] = await Promise.all([
        apiClient.getProducts(),
        apiClient.getOrders(),
        apiClient.getCoupons(),
        apiClient.getAuditLogs(),
      ]);

      if (Array.isArray(prodsRes)) {
        // Map backend products preserving order, strictly respecting backend productType and variants
        const defaultImg = DEFAULT_PRODUCT_PLACEHOLDER;
        const cleanProds = prodsRes.map((bp) => {
          const hasCustomImages = Array.isArray(bp.images) && bp.images.length > 0;
          const finalImages = hasCustomImages ? bp.images : (bp.image ? [bp.image] : [defaultImg]);
          const finalImage = bp.image || (Array.isArray(finalImages) && finalImages[0]) || defaultImg;
          
          // STRICT productType: backend is the single source of truth!
          const resolvedType = bp.productType ? bp.productType : 'standard';
          const resolvedVariants = resolvedType === 'variable' && Array.isArray(bp.variants) ? bp.variants : [];

          return {
            ...bp,
            image: finalImage,
            images: finalImages,
            features: bp.features || bp.keyFeatures || [],
            keyFeatures: bp.features || bp.keyFeatures || [],
            shortDescription: bp.shortDescription || '',
            description: bp.description || '',
            productType: resolvedType,
            variants: resolvedVariants,
          };
        });

        const str = JSON.stringify(cleanProds);
        if (str !== lastProdsJsonRef.current) {
          lastProdsJsonRef.current = str;
          setProducts(cleanProds);
          try {
            localStorage.setItem('amardokan_cached_products', str);
          } catch {}
        }
      }

      if (Array.isArray(ordersRes)) {
        const str = JSON.stringify(ordersRes);
        if (str !== lastOrdersJsonRef.current) {
          lastOrdersJsonRef.current = str;
          setOrders(ordersRes);
          try {
            localStorage.setItem('amardokan_cached_orders', str);
          } catch {}
        }
      }

      if (Array.isArray(couponsRes)) {
        const str = JSON.stringify(couponsRes);
        if (str !== lastCouponsJsonRef.current) {
          lastCouponsJsonRef.current = str;
          setCoupons(couponsRes);
          try {
            localStorage.setItem('amardokan_cached_coupons', str);
          } catch {}
        }
      }

      if (Array.isArray(auditRes)) {
        const str = JSON.stringify(auditRes);
        if (str !== lastAuditJsonRef.current) {
          lastAuditJsonRef.current = str;
          setAuditLogs(auditRes);
        }
      }
    } catch (err) {
      console.warn("Backend refresh failed, keeping current cached state:", err);
    } finally {
      setIsLoadingProducts(false);
    }
  };

  // Real-time synchronization
  useEffect(() => {
    const unsubscribe = realtimeService.subscribe((event) => {
      if (event.type === 'ORDER_CREATED') {
        const newOrder = event.payload;
        if (newOrder && newOrder.id) {
          setOrders((prev) => {
            if (prev.some((o) => o.id === newOrder.id)) return prev;
            return [newOrder, ...prev];
          });
        }
        realtimeService.playChime('order');
        refreshData();
      } else if (
        event.type === 'ORDER_UPDATED' ||
        event.type === 'ORDER_STATUS_CHANGED' ||
        event.type === 'COURIER_ASSIGNED'
      ) {
        const payload = event.payload;
        const updatedOrder = payload?.order || (payload?.id ? payload : null);
        if (updatedOrder && updatedOrder.id) {
          setOrders((prev) =>
            prev.map((o) => (o.id === updatedOrder.id ? { ...o, ...updatedOrder } : o))
          );
        }
        realtimeService.playChime('update');
        refreshData();
      } else if (event.type === 'NOTIFICATION_DISPATCHED') {
        refreshData();
      } else if (event.type === 'STOCK_UPDATED') {
        const { productId, stock } = event.payload || {};
        if (productId) {
          setProducts((prev) =>
            prev.map((p) =>
              p.id === productId ? { ...p, stock } : p
            )
          );
        }
        refreshData();
      } else if (
        event.type === 'PRODUCTS_REORDERED' ||
        event.type === 'PRODUCT_DELETED' ||
        event.type === 'ORDER_DELETED' ||
        event.type === 'AUDIT_LOG_UPDATED' ||
        event.type === 'RECYCLE_BIN_UPDATED'
      ) {
        refreshData();
      }
    });

    const pollInterval = setInterval(() => {
      refreshData();
    }, 5000);

    const handleFocus = () => refreshData();
    window.addEventListener('focus', handleFocus);

    return () => {
      unsubscribe();
      clearInterval(pollInterval);
      window.removeEventListener('focus', handleFocus);
    };
  }, []);

  useEffect(() => {
    refreshData();
    marketingTracker.track('PageView', { url: window.location.pathname });
  }, []);

  // Cart Handlers
  const handleAddToCart = (product, variant, variantObj = null) => {
    const finalVariantName = typeof variant === 'object' ? variant?.name : (variant || '');
    const finalPrice = (variantObj && typeof variantObj === 'object' && variantObj.price)
      ? variantObj.price
      : ((typeof variant === 'object' && variant?.price) ? variant.price : product.price);
    const finalImage = (variantObj && typeof variantObj === 'object' && variantObj.image)
      ? variantObj.image
      : ((typeof variant === 'object' && variant?.image) ? variant.image : (product.images ? product.images[0] : product.image));
    const finalSku = (variantObj && typeof variantObj === 'object' && variantObj.sku)
      ? variantObj.sku
      : product.sku;

    setCartItems((prev) => {
      const existing = prev.find(
        (item) => item.productId === product.id && item.variant === finalVariantName
      );
      if (existing) {
        return prev.map((item) =>
          item.id === existing.id ? { ...item, quantity: item.quantity + 1 } : item
        );
      }
      return [
        ...prev,
        {
          id: `cart-${Date.now()}`,
          productId: product.id,
          name: product.name,
          sku: finalSku,
          variant: finalVariantName,
          price: finalPrice,
          quantity: 1,
          image: finalImage,
        },
      ];
    });

    marketingTracker.track('AddToCart', {
      productId: product.id,
      name: product.name,
      value: finalPrice,
    });

    setIsCartOpen(true);
  };

  const handleQuickBuy = (product, variant, variantObj = null) => {
    const finalVariantName = typeof variant === 'object' ? variant?.name : (variant || '');
    const finalPrice = (variantObj && typeof variantObj === 'object' && variantObj.price)
      ? variantObj.price
      : ((typeof variant === 'object' && variant?.price) ? variant.price : product.price);
    const finalImage = (variantObj && typeof variantObj === 'object' && variantObj.image)
      ? variantObj.image
      : ((typeof variant === 'object' && variant?.image) ? variant.image : (product.images ? product.images[0] : product.image));
    const finalSku = (variantObj && typeof variantObj === 'object' && variantObj.sku)
      ? variantObj.sku
      : product.sku;

    setCartItems([
      {
        id: `cart-${Date.now()}`,
        productId: product.id,
        name: product.name,
        sku: finalSku,
        variant: finalVariantName,
        price: finalPrice,
        quantity: 1,
        image: finalImage,
      },
    ]);
    setSelectedProduct(null);
    setIsCheckoutOpen(true);
  };

  const handleUpdateCartQuantity = (id, qty) => {
    setCartItems((prev) =>
      prev.map((item) => (item.id === id ? { ...item, quantity: qty } : item))
    );
  };

  const handleRemoveCartItem = (id) => {
    setCartItems((prev) => prev.filter((item) => item.id !== id));
  };

  const handleProceedToCheckout = (coupon) => {
    if (!cartItems || cartItems.length === 0) return;
    setAppliedCoupon(coupon);
    setIsCartOpen(false);
    setIsCheckoutOpen(true);
    const itemNames = cartItems.map(i => `${i.name} (x${i.quantity})`).join(', ');
    const firstProdId = cartItems[0]?.productId || cartItems[0]?.id || '';
    marketingTracker.track('InitiateCheckout', {
      itemsCount: cartItems.length,
      value: cartItems.reduce((acc, i) => acc + i.price * i.quantity, 0),
      productName: itemNames || "Checkout Initiated",
      name: itemNames || "Checkout Initiated",
      productId: firstProdId,
      items: cartItems,
    });
  };

  const handleOrderSuccess = (order, credentials) => {
    setOrders((prev) => [order, ...prev.filter((o) => o.id !== order.id)]);
    setCartItems([]);
    setIsCheckoutOpen(false);
    setConfirmedOrder(order);
    if (credentials) {
      setOrderCredentials(credentials);
      try {
        const session = localStorage.getItem('amardokan_user_session');
        if (session) setCurrentUser(JSON.parse(session));
      } catch {}
    } else {
      setOrderCredentials(null);
    }
  };

  const handleTrackFromConfirmation = (orderId, phone) => {
    setConfirmedOrder(null);
    setOrderCredentials(null);
    setInitialTrackData({ id: orderId, phone });
    navigateToView('track');
  };

  const handleUpdateStock = async (productId, newStock) => {
    const safeStock = Math.max(0, parseInt(newStock) || 0);
    setProducts((prev) =>
      prev.map((p) => (p.id === productId ? { ...p, stock: safeStock } : p))
    );
    try {
      await apiClient.updateProduct(productId, { stock: safeStock });
      realtimeService.broadcast('STOCK_UPDATED', { productId, stock: safeStock });
    } catch (err) {
      console.error('Failed to persist stock update to backend:', err);
    }
  };

  const handleBulkUpdateStock = async (payload) => {
    try {
      const res = await apiClient.bulkUpdateStock(payload);
      if (res && res.products && Array.isArray(res.products)) {
        setProducts((prev) => {
          const updatedMap = new Map(res.products.map(p => [p.id, p]));
          return prev.map(p => updatedMap.get(p.id) || p);
        });
      }
      realtimeService.broadcast('STOCK_UPDATED', { bulk: true });
      await refreshData();
      return res;
    } catch (err) {
      console.error('Failed to bulk update stock in backend:', err);
      throw err;
    }
  };

  const handleDeleteProduct = async (productId) => {
    setProducts((prev) => prev.filter((p) => p.id !== productId));
    try {
      const res = await apiClient.deleteProduct(productId);
      realtimeService.broadcast('PRODUCT_DELETED', { productId });
      realtimeService.broadcast('RECYCLE_BIN_UPDATED', { itemType: 'PRODUCT' });
      await refreshData();
      return res;
    } catch (err) {
      console.error('Failed to delete product in backend:', err);
      throw err;
    }
  };

  const handleAddNewProduct = async (newProd) => {
    try {
      const created = await apiClient.createProduct(newProd);
      const finalProd = created || newProd;
      setProducts((prev) => [finalProd, ...prev.filter(p => p.id !== finalProd.id)]);
      realtimeService.broadcast('PRODUCT_CREATED', finalProd);
      await refreshData();
      return finalProd;
    } catch (err) {
      console.error('Failed to create product in backend:', err);
      await refreshData();
      throw err;
    }
  };

  const handleUpdateProduct = async (productId, updatedFields) => {
    setProducts((prev) =>
      prev.map((p) => (p.id === productId ? { ...p, ...updatedFields } : p))
    );
    try {
      const updated = await apiClient.updateProduct(productId, updatedFields);
      const finalProd = updated || updatedFields;
      setProducts((prev) =>
        prev.map((p) => (p.id === productId ? { ...p, ...finalProd } : p))
      );
      realtimeService.broadcast('PRODUCT_UPDATED', finalProd);
      await refreshData();
      return finalProd;
    } catch (err) {
      console.error('Failed to update product in backend:', err);
      await refreshData();
      throw err;
    }
  };

  const handleReorderProducts = async (reorderedProducts) => {
    setProducts(reorderedProducts);
    try {
      const orderIds = reorderedProducts.map((p) => p.id);
      await apiClient.reorderProducts(orderIds);
      realtimeService.broadcast('PRODUCTS_REORDERED', { order: orderIds });
    } catch (err) {
      console.error('Failed to reorder products in backend:', err);
    }
  };

  // Clean deduplicated category list from products without double language duplicates
  const categories = getUniqueCategories(products);

  const filteredProducts = products.filter((p) => {
    const matchCat = matchesCategory(p.category, selectedCategory);
    const q = searchQuery.toLowerCase().trim();
    const matchQ =
      !q ||
      p.name.toLowerCase().includes(q) ||
      (p.nameBn && p.nameBn.includes(q)) ||
      (p.category && p.category.toLowerCase().includes(q)) ||
      (p.sku && p.sku.toLowerCase().includes(q));
    return matchCat && matchQ;
  });

  const pendingOrdersCount = orders.filter((o) => o.status === 'PENDING').length;

  return (
    <MainLayout
      cartItems={cartItems}
      onOpenCart={() => setIsCartOpen(true)}
      activeView={currentView}
      setActiveView={navigateToView}
      searchQuery={searchQuery}
      setSearchQuery={setSearchQuery}
      selectedCategory={selectedCategory}
      setSelectedCategory={setSelectedCategory}
      categories={categories}
      currentUser={currentUser}
      isCartOpen={isCartOpen}
      onOpenAuthModal={() => setIsAuthModalOpen(true)}
      onLogoutUser={handleLogoutUser}
    >
      <AppRouter
        currentView={currentView}
        setCurrentView={setCurrentView}
        navigateToView={navigateToView}
        cartItems={cartItems}
        onOpenCart={() => setIsCartOpen(true)}
        searchQuery={searchQuery}
        setSearchQuery={setSearchQuery}
        isLoadingProducts={isLoadingProducts}
        isAdminAuthenticated={isAdminAuthenticated}
        setIsAdminAuthenticated={setIsAdminAuthenticated}
        adminTab={adminTab}
        setAdminTab={setAdminTab}
        adminRole={adminRole}
        setAdminRole={setAdminRole}
        pendingOrdersCount={pendingOrdersCount}
        products={products}
        orders={orders}
        coupons={coupons}
        landingPages={landingPages}
        auditLogs={auditLogs}
        refreshData={refreshData}
        filteredProducts={filteredProducts}
        categories={categories}
        selectedCategory={selectedCategory}
        setSelectedCategory={setSelectedCategory}
        handleAddToCart={handleAddToCart}
        handleQuickBuy={handleQuickBuy}
        setSelectedProduct={setSelectedProduct}
        handleOrderSuccess={handleOrderSuccess}
        initialTrackData={initialTrackData}
        currentUser={currentUser}
        handleLogoutUser={handleLogoutUser}
        setIsAuthModalOpen={setIsAuthModalOpen}
        setInvoiceOrder={setInvoiceOrder}
        setCourierAssignOrder={setCourierAssignOrder}
        setAdminSelectedOrder={setAdminSelectedOrder}
        handleUpdateStock={handleUpdateStock}
        handleBulkUpdateStock={handleBulkUpdateStock}
        handleAddNewProduct={handleAddNewProduct}
        handleUpdateProduct={handleUpdateProduct}
        handleDeleteProduct={handleDeleteProduct}
        handleReorderProducts={handleReorderProducts}
      />

      {/* Global Modals */}
      {selectedProduct && (
        <ProductDetailModal
          product={products.find((p) => p.id === selectedProduct.id) || selectedProduct}
          onClose={() => setSelectedProduct(null)}
          onAddToCart={handleAddToCart}
          onQuickBuy={handleQuickBuy}
          onNavigateToLanding={(prod) => {
            setSelectedProduct(null);
            window.scrollTo({ top: 0, left: 0, behavior: 'instant' });
            navigateToView('landing', { slug: prod.slug, productId: prod.id });
          }}
        />
      )}

      <CartDrawer
        isOpen={isCartOpen}
        onClose={() => setIsCartOpen(false)}
        cartItems={cartItems}
        onUpdateQuantity={handleUpdateCartQuantity}
        onRemoveItem={handleRemoveCartItem}
        onProceedToCheckout={handleProceedToCheckout}
        availableCoupons={coupons}
      />

      <GuestCheckoutModal
        isOpen={isCheckoutOpen}
        onClose={() => setIsCheckoutOpen(false)}
        items={cartItems}
        appliedCoupon={appliedCoupon}
        currentUser={currentUser}
        onOrderSuccess={handleOrderSuccess}
        onUpdateQuantity={handleUpdateCartQuantity}
      />

      <OrderConfirmationModal
        order={confirmedOrder}
        accountCredentials={orderCredentials}
        onClose={() => {
          setConfirmedOrder(null);
          setOrderCredentials(null);
        }}
        onTrackOrder={handleTrackFromConfirmation}
      />

      <UserAuthModal
        isOpen={isAuthModalOpen}
        onClose={() => setIsAuthModalOpen(false)}
        onLoginSuccess={handleLoginSuccess}
      />

      <InvoiceModal order={invoiceOrder} onClose={() => setInvoiceOrder(null)} />

      <AssignCourierModal
        order={courierAssignOrder}
        onClose={() => setCourierAssignOrder(null)}
        onSuccess={refreshData}
      />

      <AdminOrderDetailModal
        order={adminSelectedOrder}
        onClose={() => setAdminSelectedOrder(null)}
        onPrintInvoice={(o) => {
          setAdminSelectedOrder(null);
          setInvoiceOrder(o);
        }}
        onOpenAssignCourier={(o, targetStatus = 'COURIER_CREATED') => {
          setAdminSelectedOrder(null);
          setCourierAssignOrder(o ? { ...o, _targetStatus: targetStatus } : null);
        }}
        onStatusUpdated={refreshData}
        currentRole={adminRole}
      />

      <CustomModal
        isOpen={Boolean(paymentAlertModal)}
        type={paymentAlertModal?.type || 'info'}
        title={paymentAlertModal?.title || ''}
        message={paymentAlertModal?.message || ''}
        confirmText="OK"
        onClose={() => setPaymentAlertModal(null)}
      />
    </MainLayout>
  );
}
