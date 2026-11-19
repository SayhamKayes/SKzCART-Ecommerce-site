import { compressImage } from '../utils/imageCompressor';

const nativeFetch = typeof window !== 'undefined' ? window.fetch.bind(window) : globalThis.fetch;

const getBaseUrl = () => {
  // If running in browser on localhost or 127.0.0.1, always use local relative URL
  // so Vite's proxy routes /api and /media directly to the local Django server (port 8000)
  if (typeof window !== 'undefined') {
    const hostname = window.location.hostname;
    if (hostname === 'localhost' || hostname === '127.0.0.1') {
      return '';
    }
  }
  const envUrl = (import.meta.env?.VITE_API_BASE_URL || '').trim();
  if (envUrl) {
    return envUrl.replace(/\/+$/, '');
  }
  return '';
};

export const API_BASE_URL = getBaseUrl();

/**
 * Universal apiFetch that prefixes API_BASE_URL (for Vercel/production deployment),
 * auto-sets JSON Content-Type headers when body is a JSON string,
 * and wraps res.json() to gracefully handle non-JSON/HTML responses
 * (like Render 502 Bad Gateway during cold boot, or 500 server errors).
 */
export const apiFetch = async (endpoint, options = {}) => {
  const isAbsolute = endpoint.startsWith('http://') || endpoint.startsWith('https://');
  const cleanEndpoint = endpoint.startsWith('/') ? endpoint : `/${endpoint}`;
  const fullUrl = isAbsolute ? endpoint : (API_BASE_URL ? `${API_BASE_URL}${cleanEndpoint}` : cleanEndpoint);

  const headers = { ...options.headers };
  if (options.body && typeof options.body === 'string' && !headers['Content-Type']) {
    headers['Content-Type'] = 'application/json';
  }
  if (!headers['Authorization'] && typeof window !== 'undefined') {
    const staffToken = sessionStorage.getItem('amardokan_staff_token') || localStorage.getItem('amardokan_staff_token');
    if (staffToken) {
      headers['Authorization'] = `Bearer ${staffToken}`;
    }
  }

  const res = await nativeFetch(fullUrl, {
    ...options,
    headers,
  });

  const originalJson = res.json.bind(res);
  res.json = async () => {
    try {
      const data = await originalJson();
      return data;
    } catch (parseErr) {
      console.warn(`[apiFetch] Non-JSON response from ${fullUrl} (status ${res.status}):`, parseErr);
      return {
        success: false,
        ok: false,
        status: res.status,
        message: res.status >= 500
          ? 'Server is temporarily unavailable or restarting. Please try again in 30 seconds.'
          : (res.status === 404
            ? 'Server endpoint not found (404).'
            : 'An unexpected response was received from the server. Please try again.')
      };
    }
  };

  return res;
};

// Scoped fetch to route all internal API calls through apiFetch
const fetch = apiFetch;

export const apiClient = {
  async getProducts(category, search) {
    try {
      const params = new URLSearchParams();
      if (category && category !== 'All') params.append('category', category);
      if (search) params.append('search', search);

      const res = await fetch(`/api/v1/products?${params.toString()}`);
      if (!res.ok) throw new Error('Failed to fetch products');
      const data = await res.json();
      return data.products || [];
    } catch (err) {
      console.warn('API error, falling back:', err);
      return [];
    }
  },

  async getProduct(id) {
    try {
      const res = await fetch(`/api/v1/products/${id}`);
      if (!res.ok) return null;
      const data = await res.json();
      return data.product;
    } catch {
      return null;
    }
  },

  async createProduct(product) {
    const res = await fetch('/api/v1/products', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(product),
    });
    const data = await res.json();
    if (!res.ok || data.success === false || !data.product) {
      const errMsg = data.message || data.error || (data.errors ? JSON.stringify(data.errors) : 'Failed to save product to database. Please verify backend connection.');
      throw new Error(errMsg);
    }
    return data.product;
  },

  async updateProduct(id, updates) {
    const res = await fetch(`/api/v1/products/${id}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(updates),
    });
    const data = await res.json();
    if (!res.ok || data.success === false || !data.product) {
      const errMsg = data.message || data.error || (data.errors ? JSON.stringify(data.errors) : 'Failed to update product.');
      throw new Error(errMsg);
    }
    return data.product;
  },

  async deleteProduct(id) {
    const res = await fetch(`/api/v1/products/${id}`, {
      method: 'DELETE',
    });
    const data = await res.json();
    if (!res.ok || data.success === false) {
      throw new Error(data.message || data.error || 'Failed to delete product');
    }
    return data;
  },

  async reorderProducts(orderIds) {
    try {
      const res = await fetch('/api/v1/products/reorder', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ order: orderIds }),
      });
      return await res.json();
    } catch (err) {
      console.error('Failed to reorder products:', err);
      return { success: false, message: err.message };
    }
  },

  async bulkUpdateStock(payload) {
    const res = await fetch('/api/v1/products/bulk-stock', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
    });
    return res.json();
  },

  async bulkUploadProductsCsv(fileOrPayload) {
    let body;
    let headers = {};
    if (fileOrPayload instanceof FormData) {
      body = fileOrPayload;
    } else if (fileOrPayload instanceof File) {
      const fd = new FormData();
      fd.append('file', fileOrPayload);
      body = fd;
    } else {
      headers['Content-Type'] = 'application/json';
      body = JSON.stringify(fileOrPayload);
    }
    const res = await apiFetch('/api/v1/products/bulk-upload-csv', {
      method: 'POST',
      headers,
      body,
    });
    return await res.json();
  },

  async uploadProductImage(file, libraryFolder = 'products') {
    let fileToUpload = file;
    try {
      fileToUpload = await compressImage(file);
    } catch (compErr) {
      console.warn('[apiClient] Image compression bypassed:', compErr);
    }

    const formData = new FormData();
    formData.append('image', fileToUpload);
    if (libraryFolder) {
      formData.append('library_folder', libraryFolder);
    }
    const res = await fetch('/api/v1/upload/image', {
      method: 'POST',
      body: formData,
    });
    const data = await res.json();
    if (!res.ok || data.success === false) {
      throw new Error(data.error || data.message || 'Image upload failed');
    }
    return data;
  },

  async deleteProductImage(target) {
    if (!target) return { success: false, message: 'No target provided' };
    const body = typeof target === 'string'
      ? ((target.startsWith('http') || target.startsWith('/')) ? { url: target } : { public_id: target })
      : target;
    try {
      const res = await fetch('/api/v1/upload/image/delete', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
      });
      return await res.json();
    } catch (err) {
      console.warn('deleteProductImage error:', err);
      return { success: false, error: err.message };
    }
  },

  // ==========================================
  // CENTRALIZED WORDPRESS-STYLE MEDIA LIBRARY API
  // ==========================================
  async getMediaAssets(params = {}) {
    try {
      const q = new URLSearchParams();
      if (params.q) q.append('q', params.q);
      if (params.folder && params.folder !== 'all') q.append('folder', params.folder);
      const url = `/api/v1/media${q.toString() ? `?${q.toString()}` : ''}`;
      const res = await fetch(url);
      if (!res.ok) throw new Error('Failed to load media library');
      const data = await res.json();
      return data.media || [];
    } catch (err) {
      console.warn('getMediaAssets failed:', err);
      return [];
    }
  },

  async uploadMediaAssets(files, folder = 'library', extra = {}) {
    const list = Array.isArray(files) ? files : [files];
    const formData = new FormData();
    for (const f of list) {
      let processed = f;
      try {
        processed = await compressImage(f);
      } catch {}
      formData.append('files', processed);
    }
    formData.append('folder', folder || 'library');
    if (extra.title) formData.append('title', extra.title);
    if (extra.alt_text) formData.append('alt_text', extra.alt_text);

    const res = await fetch('/api/v1/media', {
      method: 'POST',
      body: formData,
    });
    const data = await res.json();
    if (!res.ok || data.success === false) {
      throw new Error(data.message || 'Media upload failed');
    }
    return data;
  },

  async updateMediaAsset(id, updates) {
    const res = await fetch(`/api/v1/media/${id}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(updates),
    });
    return await res.json();
  },

  async deleteMediaAsset(id) {
    const res = await fetch(`/api/v1/media/${id}`, {
      method: 'DELETE',
    });
    return await res.json();
  },

  async syncMediaLibrary() {
    const res = await fetch('/api/v1/media/sync', { method: 'POST' });
    return await res.json();
  },

  async getOrders(status, search) {
    try {
      const params = new URLSearchParams();
      if (status && status !== 'ALL') params.append('status', status);
      if (search) params.append('search', search);

      const res = await fetch(`/api/v1/orders?${params.toString()}`);
      if (!res.ok) throw new Error('Failed to fetch orders');
      const data = await res.json();
      return data.orders || [];
    } catch (err) {
      console.warn('API getOrders failed:', err);
      return [];
    }
  },

  async downloadOrderStatementPdf({ period = 'weekly', startDate = '', endDate = '', status = 'ALL' } = {}) {
    const params = new URLSearchParams();
    params.append('period', period);
    if (period === 'custom') {
      if (startDate) params.append('start_date', startDate);
      if (endDate) params.append('end_date', endDate);
    }
    if (status && status !== 'ALL') {
      params.append('status', status);
    }

    const endpoint = `/api/v1/orders/statement/pdf?${params.toString()}`;
    const fullUrl = API_BASE_URL ? `${API_BASE_URL}${endpoint}` : endpoint;
    const headers = {};
    if (typeof window !== 'undefined') {
      const staffToken = sessionStorage.getItem('amardokan_staff_token') || localStorage.getItem('amardokan_staff_token');
      if (staffToken) {
        headers['Authorization'] = `Bearer ${staffToken}`;
      }
    }

    const res = await nativeFetch(fullUrl, { method: 'GET', headers });
    if (!res.ok) {
      let errMsg = 'Failed to generate PDF order statement';
      try {
        const data = await res.json();
        if (data?.message) errMsg = data.message;
      } catch {
        // ignore parse failure
      }
      throw new Error(errMsg);
    }

    const blob = await res.blob();
    let filename = `order-statement-${period}.pdf`;
    const disp = res.headers.get('Content-Disposition') || '';
    const match = disp.match(/filename="?([^"]+)"?/i);
    if (match && match[1]) {
      filename = match[1];
    }

    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.setAttribute('download', filename);
    document.body.appendChild(link);
    link.click();
    link.remove();
    setTimeout(() => URL.revokeObjectURL(url), 1000);
    return { success: true, filename };
  },

  async checkout(orderData) {
    const res = await fetch('/api/v1/checkout', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(orderData),
    });
    return res.json();
  },

  async deleteOrder(orderId) {
    try {
      const res = await apiFetch(`/api/v1/orders/${encodeURIComponent(orderId)}`, {
        method: 'DELETE',
      });
      return await res.json();
    } catch (err) {
      return { success: false, message: err.message || 'Failed to delete order' };
    }
  },

  async bulkDeleteOrders(orderIds) {
    try {
      const res = await apiFetch('/api/v1/orders/bulk-delete', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ order_ids: orderIds }),
      });
      return await res.json();
    } catch (err) {
      return { success: false, message: err.message || 'Failed to bulk delete orders' };
    }
  },

  // ==========================================
  // CUSTOMER REVIEWS API (Synced across Storefront, Tracking & Admin)
  // ==========================================
  async getReviews(params = {}) {
    try {
      const q = new URLSearchParams();
      if (params.product_id) q.append('product_id', params.product_id);
      if (params.order_id) q.append('order_id', params.order_id);
      if (params.approved_only) q.append('approved_only', 'true');

      const url = `/api/v1/reviews${q.toString() ? `?${q.toString()}` : ''}`;
      const res = await fetch(url);
      if (!res.ok) throw new Error('Failed to fetch reviews');
      const data = await res.json();
      return data.reviews || [];
    } catch (err) {
      console.warn('API getReviews failed, returning empty list:', err);
      return [];
    }
  },

  async createReview(reviewData) {
    const res = await fetch('/api/v1/reviews', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(reviewData),
    });
    return res.json();
  },

  async updateReview(id, updates) {
    const res = await fetch(`/api/v1/reviews/${id}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(updates),
    });
    return res.json();
  },

  async deleteReview(id) {
    const res = await fetch(`/api/v1/reviews/${id}`, {
      method: 'DELETE',
    });
    return res.json();
  },

  async trackOrder(orderId, phone) {
    const res = await fetch('/api/v1/tracking/lookup', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ orderId, phone }),
    });
    return res.json();
  },

  async updateOrderStatus(orderId, status, note, actorName, actorRole) {
    const res = await fetch(`/api/v1/orders/${orderId}/status`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ status, note, actorName, actorRole }),
    });
    return res.json();
  },

  async assignCourier(params) {
    const res = await fetch('/api/v1/couriers/assign', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        ...params,
        specialInstruction: params.specialInstruction || params.instructions,
      }),
    });
    return res.json();
  },

  async triggerCourierWebhook(payload) {
    const res = await fetch('/api/v1/webhooks/couriers', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
    });
    return res.json();
  },

  async simulateCourierWebhook(payload) {
    const endpoint = payload.provider === 'steadfast' 
      ? '/api/v1/webhooks/couriers/steadfast'
      : '/api/v1/webhooks/couriers';
    const res = await fetch(endpoint, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        provider: payload.provider,
        invoice: payload.orderId,
        order_id: payload.orderId,
        tracking_code: payload.tracking_id || payload.orderId || 'TRK-DEFAULT',
        tracking_id: payload.tracking_id || payload.orderId || 'TRK-DEFAULT',
        status: payload.event || payload.eventStatus || 'delivered',
        event: payload.event || payload.eventStatus || 'delivered',
        collected_amount: payload.collected_amount,
        hub: payload.hub,
      }),
    });
    return res.json();
  },

  async getCourierBalance(provider) {
    try {
      const res = await fetch(`/api/v1/couriers/${provider}/balance`);
      return await res.json();
    } catch (err) {
      return { success: false, message: err.message };
    }
  },

  async checkCourierStatus(provider, trackingCode) {
    try {
      const res = await fetch(`/api/v1/couriers/${provider}/status/${encodeURIComponent(trackingCode)}`);
      return await res.json();
    } catch (err) {
      return { success: false, message: err.message };
    }
  },

  async getSteadfastBalance() {
    return this.getCourierBalance('steadfast');
  },

  async checkSteadfastStatus(trackingCode) {
    return this.checkCourierStatus('steadfast', trackingCode);
  },

  async getCoupons(includeAll = false) {
    try {
      const url = `/api/v1/coupons${includeAll ? '?include_all=true' : ''}`;
      const res = await fetch(url);
      if (!res.ok) return [];
      const data = await res.json();
      return data.coupons || [];
    } catch {
      return [];
    }
  },

  async createCoupon(couponData) {
    const res = await fetch('/api/v1/coupons', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(couponData),
    });
    return res.json();
  },

  async updateCoupon(code, updates) {
    const res = await fetch(`/api/v1/coupons/${encodeURIComponent(code)}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(updates),
    });
    return res.json();
  },

  async deleteCoupon(code) {
    const res = await fetch(`/api/v1/coupons/${encodeURIComponent(code)}`, {
      method: 'DELETE',
    });
    return res.json();
  },

  async getCouriers() {
    try {
      const res = await fetch('/api/v1/couriers');
      const data = await res.json();
      return data.couriers || [];
    } catch {
      return [];
    }
  },

  async updateCourier(id, updates) {
    const res = await fetch(`/api/v1/couriers/${id}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(updates),
    });
    const data = await res.json();
    return data.courier;
  },

  async getMarketingEvents() {
    try {
      const res = await fetch('/api/v1/marketing/events');
      const data = await res.json();
      return data.events || [];
    } catch {
      return [];
    }
  },

  async getNotifications() {
    try {
      const res = await fetch('/api/v1/notifications');
      const data = await res.json();
      return data.notifications || [];
    } catch {
      return [];
    }
  },

  async getAuditLogs() {
    try {
      const res = await fetch('/api/v1/audit-logs');
      const data = await res.json();
      return data.logs || [];
    } catch {
      return [];
    }
  },

  async userAuth(userData) {
    try {
      const res = await fetch('/api/v1/users/auth', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(userData),
      });
      return res.json();
    } catch (err) {
      return { success: false, message: err.message };
    }
  },

  async getUserProfile(phone) {
    try {
      const res = await fetch(`/api/v1/users/${phone}`);
      return res.json();
    } catch {
      return { success: false };
    }
  },

  async updateUserProfile(phone, profileData) {
    try {
      const res = await fetch(`/api/v1/users/${phone}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(profileData),
      });
      return res.json();
    } catch (err) {
      return { success: false, message: err.message };
    }
  },

  async getCustomerOrders(phone) {
    try {
      const res = await fetch(`/api/v1/users/${phone}/orders`);
      const data = await res.json();
      return data.orders || [];
    } catch {
      return [];
    }
  },

  async getMarketingConfig() {
    try {
      const res = await fetch('/api/v1/marketing/config');
      if (!res.ok) throw new Error('Failed to fetch marketing config');
      const data = await res.json();
      return data.config || null;
    } catch (err) {
      console.warn('Marketing config API error:', err);
      return null;
    }
  },

  async updateMarketingConfig(configData) {
    try {
      const res = await fetch('/api/v1/marketing/config', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(configData),
      });
      return await res.json();
    } catch (err) {
      return { success: false, message: err.message };
    }
  },

  async getShopSettings() {
    try {
      const res = await fetch('/api/v1/settings/shop');
      if (!res.ok) throw new Error('Failed to fetch shop settings');
      const data = await res.json();
      return data.settings || null;
    } catch (err) {
      console.warn('Shop settings API error:', err);
      return null;
    }
  },

  async updateShopSettings(settingsData) {
    try {
      const res = await fetch('/api/v1/settings/shop', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(settingsData),
      });
      return await res.json();
    } catch (err) {
      return { success: false, message: err.message };
    }
  },

  async sendTestEmail(payload) {
    try {
      const res = await fetch('/api/v1/settings/email/test', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });
      return await res.json();
    } catch (err) {
      return { success: false, error: err.message };
    }
  },


  async sendCAPIEvent(eventPayload) {
    try {
      const res = await fetch('/api/v1/marketing/capi/event', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(eventPayload),
      });
      return await res.json();
    } catch (err) {
      console.warn('CAPI dispatch failed:', err);
      return { success: false, error: err.message };
    }
  },

  async getMarketingEvents() {
    try {
      const res = await fetch('/api/v1/marketing/events');
      const data = await res.json();
      return data.events || [];
    } catch {
      return [];
    }
  },

  async syncMetaAds(payload = {}) {
    try {
      const res = await fetch('/api/v1/marketing/sync-meta-ads', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });
      return await res.json();
    } catch (err) {
      console.warn('syncMetaAds error:', err);
      return { success: false, message: err.message };
    }
  },

  async getNotifications() {
    try {
      const res = await fetch('/api/v1/notifications');
      if (!res.ok) throw new Error('Failed to fetch notifications');
      const data = await res.json();
      return data.notifications || [];
    } catch (err) {
      console.warn('getNotifications error:', err);
      return [];
    }
  },

  async sendNotification(payload) {
    try {
      const res = await fetch('/api/v1/notifications', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });
      return await res.json();
    } catch (err) {
      console.warn('sendNotification error:', err);
      return { success: false, message: err.message };
    }
  },

  // SSLCommerz Payments
  async initiatePayment(payload) {
    try {
      const res = await fetch('/api/v1/payments/initiate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });
      return await res.json();
    } catch (err) {
      console.error('initiatePayment error:', err);
      return { success: false, message: err.message };
    }
  },

  async getPaymentTransactions(params = {}) {
    try {
      const query = new URLSearchParams();
      if (params.status && params.status !== 'ALL') query.append('status', params.status);
      if (params.search) query.append('search', params.search);
      if (params.orderId) query.append('order_id', params.orderId);

      const res = await fetch(`/api/v1/payments/transactions?${query.toString()}`);
      if (!res.ok) throw new Error('Failed to fetch transactions');
      const data = await res.json();
      return data.transactions || [];
    } catch (err) {
      console.warn('getPaymentTransactions error:', err);
      return [];
    }
  },

  async getPaymentConfig() {
    try {
      const res = await fetch('/api/v1/payments/config');
      if (!res.ok) throw new Error('Failed to fetch payment config');
      const data = await res.json();
      return data.config || null;
    } catch (err) {
      console.warn('getPaymentConfig error:', err);
      return null;
    }
  },

  async updatePaymentConfig(configData) {
    try {
      const res = await fetch('/api/v1/payments/config', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(configData),
      });
      return await res.json();
    } catch (err) {
      return { success: false, message: err.message };
    }
  },

  async getPaymentMethods() {
    try {
      const res = await fetch('/api/v1/payments/methods');
      if (!res.ok) throw new Error('Failed to fetch payment methods');
      const data = await res.json();
      return data.methods || [];
    } catch (err) {
      console.warn('getPaymentMethods error:', err);
      return [];
    }
  },

  async updatePaymentMethods(methodsPayload) {
    try {
      const res = await fetch('/api/v1/payments/methods', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(methodsPayload),
      });
      return await res.json();
    } catch (err) {
      return { success: false, message: err.message };
    }
  },

  async verifyPayment(payload) {
    try {
      const res = await fetch('/api/v1/payments/verify', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });
      return await res.json();
    } catch (err) {
      return { success: false, message: err.message };
    }
  },

  async getNotifications() {
    try {
      const res = await fetch('/api/v1/notifications');
      if (!res.ok) throw new Error('Failed to fetch notifications');
      const data = await res.json();
      return data.notifications || [];
    } catch (err) {
      console.warn('getNotifications error:', err);
      return [];
    }
  },

  async sendNotification(payload) {
    try {
      const res = await fetch('/api/v1/notifications', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });
      return await res.json();
    } catch (err) {
      return { success: false, message: err.message };
    }
  },

  async getStaffMembers() {
    try {
      const res = await fetch('/api/v1/staff');
      if (!res.ok) throw new Error('Failed to fetch staff members');
      const data = await res.json();
      if (Array.isArray(data.staff)) {
        try {
          localStorage.setItem('amardokan_cached_staff', JSON.stringify(data.staff));
        } catch {}
        return data.staff;
      }
      return [];
    } catch (err) {
      console.warn('getStaffMembers error, reading local cache:', err);
      try {
        const cached = localStorage.getItem('amardokan_cached_staff');
        if (cached) return JSON.parse(cached);
      } catch {}
      return [];
    }
  },

  async createStaffMember(payload) {
    try {
      const res = await fetch('/api/v1/staff', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });
      const data = await res.json();
      return data;
    } catch (err) {
      return { success: false, message: err.message || 'Failed to create staff' };
    }
  },

  async updateStaffMember(staffId, updates) {
    try {
      const res = await fetch(`/api/v1/staff/${staffId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(updates),
      });
      const data = await res.json();
      return data;
    } catch (err) {
      return { success: false, message: err.message || 'Failed to update staff' };
    }
  },

  async deleteStaffMember(staffId) {
    try {
      const res = await fetch(`/api/v1/staff/${staffId}`, {
        method: 'DELETE',
      });
      const data = await res.json();
      return data;
    } catch (err) {
      return { success: false, message: err.message || 'Failed to delete staff' };
    }
  },

  async bulkDeleteProducts(productIds) {
    try {
      const res = await apiFetch('/api/v1/products/bulk-delete', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ product_ids: productIds }),
      });
      return await res.json();
    } catch (err) {
      return { success: false, message: err.message || 'Failed to bulk delete products' };
    }
  },

  async forgotPassword(email) {
    try {
      const res = await apiFetch('/api/v1/users/forgot-password', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email }),
      });
      return await res.json();
    } catch (err) {
      return { success: false, message: err.message || 'Failed to request password reset' };
    }
  },

  async verifyStaffToken(token) {
    try {
      const t = token || (typeof window !== 'undefined' ? (sessionStorage.getItem('amardokan_staff_token') || localStorage.getItem('amardokan_staff_token')) : '');
      if (!t) return { success: false, authenticated: false };
      const res = await apiFetch('/api/v1/staff-auth/verify', {
        headers: { Authorization: `Bearer ${t}` },
      });
      return await res.json();
    } catch (err) {
      return { success: false, authenticated: false, message: err.message };
    }
  },

  async staffLogin(credentialsOrUsername, maybePassword) {
    const payload =
      typeof credentialsOrUsername === 'string'
        ? { username: credentialsOrUsername, password: maybePassword || '' }
        : (credentialsOrUsername || {});
    try {
      const res = await apiFetch('/api/v1/staff-auth/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });
      const data = await res.json();
      if (data && data.success && data.token && typeof window !== 'undefined') {
        try {
          sessionStorage.setItem('amardokan_staff_token', data.token);
          localStorage.setItem('amardokan_staff_token', data.token);
        } catch (e) {}
      }
      return data;
    } catch (err) {
      return { success: false, networkError: true, message: err.message || 'Network error during login' };
    }
  },

  async verifyStaff2FA(payload) {
    try {
      const res = await apiFetch('/api/v1/staff-auth/verify-2fa', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });
      const data = await res.json();
      if (data && data.success && data.token && typeof window !== 'undefined') {
        try {
          sessionStorage.setItem('amardokan_staff_token', data.token);
          localStorage.setItem('amardokan_staff_token', data.token);
        } catch (e) {}
      }
      return data;
    } catch (err) {
      return { success: false, message: err.message || '2FA verification failed' };
    }
  },

  async staffForgotPassword(identifier) {
    try {
      const res = await apiFetch('/api/v1/staff-auth/forgot-password', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ identifier }),
      });
      return await res.json();
    } catch (err) {
      return { success: false, message: err.message || 'Failed to request password reset' };
    }
  },

  async staffResetPassword(payload) {
    try {
      const res = await apiFetch('/api/v1/staff-auth/reset-password', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });
      return await res.json();
    } catch (err) {
      return { success: false, message: err.message || 'Failed to reset password' };
    }
  },

  async getSecurity2FA() {
    try {
      const res = await apiFetch('/api/v1/security/2fa');
      return await res.json();
    } catch (err) {
      return { success: false, message: err.message || 'Failed to fetch 2FA configuration' };
    }
  },

  async updateSecurity2FA(payload) {
    try {
      const res = await apiFetch('/api/v1/security/2fa', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });
      return await res.json();
    } catch (err) {
      return { success: false, message: err.message || 'Failed to update 2FA settings' };
    }
  },

  // ==========================================
  // AUDIT LOGS & PAYMENT TRANSACTIONS DELETE (Move to Recycle Bin)
  // ==========================================
  async deleteAuditLog(logId) {
    try {
      const res = await apiFetch(`/api/v1/audit-logs/${encodeURIComponent(logId)}`, {
        method: 'DELETE',
      });
      return await res.json();
    } catch (err) {
      return { success: false, message: err.message || 'Failed to delete audit log' };
    }
  },

  async bulkDeleteAuditLogs(ids) {
    try {
      const res = await apiFetch('/api/v1/audit-logs/bulk-delete', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ ids }),
      });
      return await res.json();
    } catch (err) {
      return { success: false, message: err.message || 'Failed to bulk delete audit logs' };
    }
  },

  async deletePaymentTransaction(txnId) {
    try {
      const res = await apiFetch(`/api/v1/payments/transactions/${encodeURIComponent(txnId)}`, {
        method: 'DELETE',
      });
      return await res.json();
    } catch (err) {
      return { success: false, message: err.message || 'Failed to delete transaction' };
    }
  },

  async bulkDeletePaymentTransactions(ids) {
    try {
      const res = await apiFetch('/api/v1/payments/transactions/bulk-delete', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ ids }),
      });
      return await res.json();
    } catch (err) {
      return { success: false, message: err.message || 'Failed to bulk delete transactions' };
    }
  },

  // ==========================================
  // RECYCLE BIN API (Global Central Database Trash)
  // ==========================================
  async getRecycleBin(params = {}) {
    try {
      const q = new URLSearchParams();
      if (params.item_type && params.item_type !== 'ALL') q.append('item_type', params.item_type);
      if (params.search) q.append('search', params.search);
      const queryStr = q.toString();
      const res = await apiFetch(`/api/v1/recycle-bin${queryStr ? `?${queryStr}` : ''}`);
      return await res.json();
    } catch (err) {
      return { success: false, items: [], counts: { ALL: 0 }, message: err.message || 'Failed to load Recycle Bin' };
    }
  },

  async addToRecycleBin(payload) {
    try {
      const res = await apiFetch('/api/v1/recycle-bin', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });
      return await res.json();
    } catch (err) {
      return { success: false, message: err.message || 'Failed to move item to Recycle Bin' };
    }
  },

  async restoreRecycleBinItem(id) {
    try {
      const res = await apiFetch(`/api/v1/recycle-bin/${encodeURIComponent(id)}/restore`, {
        method: 'POST',
      });
      return await res.json();
    } catch (err) {
      return { success: false, message: err.message || 'Failed to restore item' };
    }
  },

  async permanentDeleteRecycleBinItem(id) {
    try {
      const res = await apiFetch(`/api/v1/recycle-bin/${encodeURIComponent(id)}`, {
        method: 'DELETE',
      });
      return await res.json();
    } catch (err) {
      return { success: false, message: err.message || 'Failed to permanently delete item' };
    }
  },

  async bulkRestoreRecycleBin(ids) {
    try {
      const res = await apiFetch('/api/v1/recycle-bin/bulk-restore', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ ids }),
      });
      return await res.json();
    } catch (err) {
      return { success: false, message: err.message || 'Failed to restore selected items' };
    }
  },

  async bulkPermanentDeleteRecycleBin(data) {
    try {
      const res = await apiFetch('/api/v1/recycle-bin/bulk-delete', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(data || {}),
      });
      return await res.json();
    } catch (err) {
      return { success: false, message: err.message || 'Failed to permanently delete items' };
    }
  },
};

