import { apiClient } from './api';
import { realtimeService } from './realtime';

export class MarketingTracker {
  constructor(initialEvents = []) {
    this.events = [...initialEvents];
    let cachedIsActive = true;
    if (typeof window !== 'undefined') {
      try {
        const stored = localStorage.getItem('amardokan_marketing_is_active');
        if (stored !== null) cachedIsActive = JSON.parse(stored) !== false;
      } catch {}
    }
    this.config = {
      pixelId: '',
      capiToken: '',
      ga4Id: '',
      testEventCode: '',
      targetScope: 'GLOBAL',
      targetProductId: '',
      targetLandingSlug: '',
      isActive: cachedIsActive,
    };
    this.pixelInitialized = false;
    this.ga4Initialized = false;
    this.initialized = false;
    this._recentTrackTimestamps = new Map();
    this._trackedOrderPurchases = new Set();

    if (typeof window !== 'undefined') {
      this.init();
    }
  }

  async init() {
    try {
      const serverConfig = await apiClient.getMarketingConfig();
      if (serverConfig) {
        this.applyConfig(serverConfig);
      }
      const remoteEvents = await apiClient.getMarketingEvents();
      if (remoteEvents && remoteEvents.length > 0) {
        this.events = remoteEvents;
      }
    } catch (err) {
      console.warn('[MarketingTracker] Initial sync warning:', err);
    }
    this.initialized = true;

    if (typeof window !== 'undefined') {
      realtimeService.subscribe((msg) => {
        if (msg && msg.type === 'MARKETING_CONFIG_UPDATED' && msg.payload) {
          this.applyConfig(msg.payload);
        }
      });
    }
  }

  applyConfig(config) {
    this.config = { ...this.config, ...config };
    if (typeof window !== 'undefined' && config && 'isActive' in config) {
      try {
        localStorage.setItem('amardokan_marketing_is_active', JSON.stringify(Boolean(this.config.isActive)));
      } catch {}
    }

    if (!this.config.isActive) {
      return;
    }

    if (typeof window !== 'undefined') {
      // Inject Meta Pixel if pixelId exists
      if (this.config.pixelId) {
        this.injectMetaPixel(this.config.pixelId);
      }
      // Inject Google Analytics 4 if ga4Id exists
      if (this.config.ga4Id) {
        this.injectGA4(this.config.ga4Id);
      }
    }
  }

  injectMetaPixel(pixelId) {
    if (typeof window === 'undefined') return;

    if (!window.fbq) {
      /* eslint-disable */
      (function (f, b, e, v, n, t, s) {
        if (f.fbq) return;
        n = f.fbq = function () {
          n.callMethod ? n.callMethod.apply(n, arguments) : n.queue.push(arguments);
        };
        if (!f._fbq) f._fbq = n;
        n.push = n;
        n.loaded = !0;
        n.version = '2.0';
        n.queue = [];
        t = b.createElement(e);
        t.async = !0;
        t.src = v;
        s = b.getElementsByTagName(e)[0];
        s.parentNode.insertBefore(t, s);
      })(window, document, 'script', 'https://connect.facebook.net/en_US/fbevents.js');
      /* eslint-enable */
    }

    try {
      window.fbq('init', pixelId);
      this.pixelInitialized = true;
      console.log(`[Meta Pixel Initialized] Pixel ID: ${pixelId}`);
    } catch (e) {
      console.warn('[Meta Pixel Init Error]:', e);
    }
  }

  injectGA4(ga4Id) {
    if (typeof window === 'undefined') return;

    if (!document.getElementById(`ga4-script-${ga4Id}`)) {
      const script = document.createElement('script');
      script.id = `ga4-script-${ga4Id}`;
      script.async = true;
      script.src = `https://www.googletagmanager.com/gtag/js?id=${ga4Id}`;
      document.head.appendChild(script);

      window.dataLayer = window.dataLayer || [];
      window.gtag = function () {
        window.dataLayer.push(arguments);
      };
      window.gtag('js', new Date());
      window.gtag('config', ga4Id, { send_page_view: false });
      this.ga4Initialized = true;
      console.log(`[GA4 Initialized] Measurement ID: ${ga4Id}`);
    }
  }

  generateEventId(prefix) {
    return `ev_${prefix}_${Date.now()}_${Math.random().toString(36).substring(2, 8)}`;
  }

  isScopeActive(context = {}) {
    if (!this.config.isActive) return false;
    if (this.config.targetScope === 'PRODUCT') {
      const currentProdId = context.productId || context.targetId;
      if (currentProdId && String(currentProdId) === String(this.config.targetProductId)) {
        return true;
      }
      if (context.source === 'admin_test_console') return true;
      return false;
    }

    return true;
  }

  track(eventName, data = {}, context = {}) {
    const combinedContext = { ...data, ...context };
    const eventId = this.generateEventId(eventName.toLowerCase());
    const timestamp = new Date().toISOString();

    const isEligible = this.isScopeActive(combinedContext);
    if (!isEligible) {
      return null;
    }

    const productName = data.productName || data.name || data.content_name || (data.items && data.items.map(i => i.name).filter(Boolean).join(', ')) || '';
    const productId = data.productId || (data.items && (data.items[0]?.productId || data.items[0]?.id)) || '';

    // Prevent duplicate firing (e.g. StrictMode double-mount, Modal -> Show More Details transition, or repeated Purchase submit)
    if (eventName === 'Purchase' && data.orderId) {
      const orderKey = String(data.orderId).trim();
      if (this._trackedOrderPurchases.has(orderKey)) {
        return null;
      }
      this._trackedOrderPurchases.add(orderKey);
    } else if (context.source !== 'admin_test_console') {
      const dedupKey = `${eventName}:${String(productId || productName || 'global')}`;
      const nowMs = Date.now();
      const cooldownMs = eventName === 'ViewContent' ? 30000 : 2000;
      const lastTs = this._recentTrackTimestamps.get(dedupKey) || 0;
      if (nowMs - lastTs < cooldownMs) {
        return null;
      }
      this._recentTrackTimestamps.set(dedupKey, nowMs);
    }

    const eventRecord = {
      id: 'mkt-' + Math.random().toString(36).substring(2, 9),
      eventId,
      eventName,
      timestamp,
      productName,
      productId,
      browserReported: !!this.config.pixelId,
      serverCapiReported: !!this.config.capiToken,
      source: data.source || 'direct',
      campaign: data.campaign,
      value: data.value,
      orderId: data.orderId,
      dedupMatched: true,
      eligible: true,
      _isClientPending: true,
      serverSynced: false,
    };

    this.events.unshift(eventRecord);
    if (this.events.length > 50) this.events.pop();

    try {
      realtimeService.broadcast('MARKETING_EVENT_FIRED', eventRecord);
    } catch {}

    const getCookieVal = (name) => {
      if (typeof document === 'undefined' || !document.cookie) return '';
      const match = document.cookie.match(new RegExp(`(?:^|; )${name}=([^;]*)`));
      return match ? decodeURIComponent(match[1]) : '';
    };

    // 1. Browser Meta Pixel Execution
    if (typeof window !== 'undefined' && window.fbq) {
      try {
        const pixelData = {
          currency: data.currency || 'BDT',
          value: data.value || 0,
          content_name: productName || undefined,
          content_ids: productId ? [productId] : data.content_ids || undefined,
          content_type: 'product',
        };
        const standardEvents = new Set([
          'PageView',
          'ViewContent',
          'AddToCart',
          'InitiateCheckout',
          'Purchase',
          'Lead',
          'Search',
        ]);
        const fbqMethod = standardEvents.has(eventName) ? 'track' : 'trackCustom';
        window.fbq(fbqMethod, eventName, pixelData, { eventID: eventId });
      } catch (err) {
        console.warn('[Browser Pixel track error]:', err);
      }
    }

    // 2. Google Analytics 4 Event Execution
    if (typeof window !== 'undefined' && window.gtag) {
      try {
        window.gtag('event', eventName, {
          transaction_id: data.orderId || eventId,
          value: data.value || 0,
          currency: data.currency || 'BDT',
          items: data.items || (productId ? [{ item_id: productId, item_name: productName }] : []),
        });
      } catch (err) {
        console.warn('[GA4 track error]:', err);
      }
    }

    // 3. Dispatch Server-Side CAPI Event
    apiClient
      .sendCAPIEvent({
        eventName,
        eventId,
        eventSourceUrl: typeof window !== 'undefined' ? window.location.href : '',
        source: data.source || 'website',
        campaign: data.campaign || '',
        testEventCode: this.config.testEventCode || undefined,
        productName,
        productId,
        userData: {
          fbp: getCookieVal('_fbp'),
          fbc: getCookieVal('_fbc'),
        },
        customData: {
          value: data.value,
          currency: data.currency || 'BDT',
          orderId: data.orderId,
          content_name: productName,
          content_ids: productId ? [productId] : data.content_ids,
          items: Array.isArray(data.items) ? data.items : undefined,
        },
      })
      .then((res) => {
        if (res && res.success) {
          eventRecord.serverCapiReported = true;
          eventRecord.serverSynced = true;
          eventRecord._isClientPending = false;
          eventRecord.capiResult = res.capi_result;
        }
      })
      .catch((err) => {
        console.warn('[CAPI Relay Warning]:', err);
      });

    return eventId;
  }

  getEvents() {
    return this.events;
  }

  getRecentEvents() {
    return this.events;
  }

  getConfig() {
    return this.config;
  }
}

export const marketingTracker = new MarketingTracker();
