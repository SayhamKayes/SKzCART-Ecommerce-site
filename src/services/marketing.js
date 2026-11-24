import { apiClient } from './api';
import { realtimeService } from './realtime';

const GA4_EVENT_MAP = {
  PageView: 'page_view',
  ViewContent: 'view_item',
  ProductClick: 'select_item',
  AddToCart: 'add_to_cart',
  InitiateCheckout: 'begin_checkout',
  Purchase: 'purchase',
};

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
      ga4Enabled: true,
      testEventCode: '',
      targetScope: 'GLOBAL',
      targetProductId: '',
      targetLandingSlug: '',
      isActive: cachedIsActive,
    };
    this.pixelInitialized = false;
    this.ga4Initialized = false;
    this.initialized = false;
    this.configReady = false;
    this._recentTrackTimestamps = new Map();
    this._trackedOrderPurchases = new Set();
    this._pendingQueue = [];
    this._initializedPixelIds = new Set();
    this._initializedGa4Ids = new Set();

    if (typeof window !== 'undefined') {
      this.init();
    }
  }

  _ensureVisitorIdentity() {
    if (typeof window === 'undefined') {
      return { visitorId: 'server_visitor', sessionId: 'server_sess', isNewVisitor: false, sessionStartMs: Date.now() };
    }
    let visitorId = '';
    let isNewVisitor = false;
    try {
      visitorId = localStorage.getItem('amardokan_ga_cid') || '';
      if (!visitorId) {
        visitorId = `${Math.floor(Date.now() / 1000)}.${Math.floor(100000000 + Math.random() * 900000000)}`;
        localStorage.setItem('amardokan_ga_cid', visitorId);
        isNewVisitor = true;
      } else {
        const seenSess = sessionStorage.getItem('amardokan_ga_is_new');
        if (seenSess === '1') isNewVisitor = true;
      }
      if (isNewVisitor) {
        sessionStorage.setItem('amardokan_ga_is_new', '1');
      }
    } catch {
      visitorId = `anon.${Date.now()}`;
    }

    let sessionId = '';
    let sessionStartMs = Date.now();
    try {
      sessionId = sessionStorage.getItem('amardokan_ga_sid') || '';
      const rawStart = Number(sessionStorage.getItem('amardokan_ga_sess_start') || 0);
      if (!sessionId) {
        sessionId = `sess_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`;
        sessionStorage.setItem('amardokan_ga_sid', sessionId);
        sessionStorage.setItem('amardokan_ga_sess_start', String(sessionStartMs));
      } else if (rawStart > 0) {
        sessionStartMs = rawStart;
      }
    } catch {
      sessionId = `sess_${Date.now()}`;
    }

    return { visitorId, sessionId, isNewVisitor, sessionStartMs };
  }

  _detectTrafficAttribution(explicitSource = '') {
    if (typeof window === 'undefined') {
      return { trafficSource: explicitSource || 'Direct', referrerHost: '', utmMedium: '', utmCampaign: '' };
    }
    try {
      const params = new URLSearchParams(window.location.search || '');
      const utmSource = (params.get('utm_source') || '').trim();
      const utmMedium = (params.get('utm_medium') || '').trim();
      const utmCampaign = (params.get('utm_campaign') || '').trim();
      const hasGclid = Boolean(params.get('gclid'));
      const hasFbclid = Boolean(params.get('fbclid'));

      let referrerHost = '';
      if (document.referrer) {
        try {
          const refUrl = new URL(document.referrer);
          if (refUrl.hostname && refUrl.hostname !== window.location.hostname) {
            referrerHost = refUrl.hostname;
          }
        } catch {}
      }

      const rawCombined = `${utmSource} ${referrerHost} ${explicitSource}`.toLowerCase();
      let resolvedSource = '';
      if (rawCombined.includes('instagram') || utmSource.toLowerCase() === 'ig') {
        resolvedSource = 'Instagram';
      } else if (rawCombined.includes('youtube') || rawCombined.includes('youtu.be') || utmSource.toLowerCase() === 'yt') {
        resolvedSource = 'YouTube';
      } else if (hasFbclid || rawCombined.includes('facebook') || rawCombined.includes('fb.com') || utmSource.toLowerCase() === 'fb') {
        resolvedSource = 'Facebook';
      } else if (hasGclid || rawCombined.includes('google')) {
        resolvedSource = 'Google Search';
      } else if (utmSource) {
        resolvedSource = utmSource;
      } else if (referrerHost) {
        resolvedSource = referrerHost;
      }

      if (resolvedSource) {
        const attr = {
          trafficSource: resolvedSource,
          referrerHost,
          utmMedium: utmMedium || (hasGclid || hasFbclid ? 'cpc' : 'referral'),
          utmCampaign,
        };
        sessionStorage.setItem('amardokan_ga_attr', JSON.stringify(attr));
        return attr;
      }

      const saved = sessionStorage.getItem('amardokan_ga_attr');
      if (saved) {
        return JSON.parse(saved);
      }
    } catch {}

    return { trafficSource: explicitSource && explicitSource !== 'storefront_card' ? explicitSource : 'Direct', referrerHost: '', utmMedium: '', utmCampaign: '' };
  }

  _detectDeviceType() {
    if (typeof window === 'undefined') return 'Desktop';
    const ua = (navigator.userAgent || '').toLowerCase();
    if (/ipad|tablet|playbook|silk/.test(ua) || (window.innerWidth >= 768 && window.innerWidth <= 1024 && /android/.test(ua))) {
      return 'Tablet';
    }
    if (/mobile|android|iphone|ipod|blackberry|opera mini|iemobile/.test(ua) || window.innerWidth < 768) {
      return 'Mobile';
    }
    return 'Desktop';
  }

  _isStorefrontPath() {
    if (typeof window === 'undefined') return false;
    const p = (window.location.pathname || '/').toLowerCase();
    return !p.startsWith('/admin') && !p.startsWith('/front-panel');
  }

  _dispatchGA4Telemetry(eventType, extra = {}, useKeepAlive = false) {
    if (typeof window === 'undefined' || !this._isStorefrontPath()) return;
    if (this.config.ga4Enabled === false) return;

    const cleanPath = (extra.pagePath || window.location.pathname || '/').split('?')[0] || '/';
    if (eventType === 'page_view') {
      const pvKey = `GA_TELEM_PV:${cleanPath}`;
      const nowMs = Date.now();
      const lastPv = this._recentTrackTimestamps.get(pvKey) || 0;
      if (nowMs - lastPv < 4000) return;
      this._recentTrackTimestamps.set(pvKey, nowMs);
    }

    const { visitorId, sessionId, isNewVisitor, sessionStartMs } = this._ensureVisitorIdentity();
    const attr = this._detectTrafficAttribution(extra.source || '');
    const durationSeconds = Math.max(0, Math.round((Date.now() - sessionStartMs) / 1000));
    let tz = 'Asia/Dhaka';
    try {
      tz = Intl.DateTimeFormat().resolvedOptions().timeZone || 'Asia/Dhaka';
    } catch {}

    apiClient.collectGA4Event(
      {
        eventType,
        visitorId,
        sessionId,
        isNewVisitor,
        durationSeconds,
        pagePath: extra.pagePath || window.location.pathname || '/',
        pageTitle: extra.pageTitle || document.title || 'Storefront',
        pageLocation: window.location.href,
        trafficSource: attr.trafficSource,
        referrerHost: attr.referrerHost,
        utmMedium: attr.utmMedium,
        utmCampaign: extra.campaign || attr.utmCampaign || '',
        deviceType: this._detectDeviceType(),
        timezone: tz,
        city: extra.city || '',
        orderId: extra.orderId || '',
        productId: extra.productId || '',
        productName: extra.productName || '',
        value: Number(extra.value || 0),
      },
      useKeepAlive
    );
  }

  trackPageView(pagePath, pageTitle = '') {
    if (typeof window === 'undefined' || !this._isStorefrontPath()) return;
    const cleanPath = pagePath || window.location.pathname || '/';
    const key = `GA_PV:${cleanPath}`;
    const nowMs = Date.now();
    const last = this._recentTrackTimestamps.get(key) || 0;
    if (nowMs - last < 3000) return;
    this._recentTrackTimestamps.set(key, nowMs);

    if (window.gtag && this.config.ga4Id && this.config.ga4Enabled !== false) {
      try {
        window.gtag('event', 'page_view', {
          page_path: cleanPath,
          page_title: pageTitle || document.title,
          page_location: window.location.href,
        });
      } catch {}
    }
    this._dispatchGA4Telemetry('page_view', {
      pagePath: cleanPath,
      pageTitle: pageTitle || document.title,
    });
  }

  sendDurationPing(useKeepAlive = true) {
    if (typeof window === 'undefined' || !this._isStorefrontPath()) return;
    this._dispatchGA4Telemetry('session_ping', {}, useKeepAlive);
  }

  async init() {
    const retryDelays = [0, 1500, 3000];
    let serverConfig = null;

    for (let attempt = 0; attempt < retryDelays.length; attempt += 1) {
      if (retryDelays[attempt] > 0) {
        await new Promise((resolve) => setTimeout(resolve, retryDelays[attempt]));
      }
      try {
        const fetched = await apiClient.getMarketingConfig();
        if (fetched) {
          serverConfig = fetched;
          break;
        }
      } catch (err) {
        if (attempt === retryDelays.length - 1) {
          console.warn('[MarketingTracker] Initial sync warning:', err);
        }
      }
    }

    let ga4Extra = {};
    try {
      const gaRes = await apiClient.getGA4Config();
      if (gaRes?.success && gaRes.config) {
        ga4Extra = {
          ga4Id: gaRes.config.ga4Id || '',
          ga4Enabled: gaRes.config.ga4Enabled !== false,
        };
      }
    } catch {}

    if (serverConfig) {
      this.applyConfig({
        ...serverConfig,
        ga4Id: ga4Extra.ga4Id || serverConfig.ga4Id || '',
        ga4Enabled: ga4Extra.ga4Enabled !== undefined ? ga4Extra.ga4Enabled : true,
      });
    } else {
      if (ga4Extra.ga4Id) {
        this.applyConfig(ga4Extra);
      } else {
        this.configReady = true;
        this.flushPendingQueue();
      }
    }

    try {
      const remoteEvents = await apiClient.getMarketingEvents();
      if (remoteEvents && remoteEvents.length > 0) {
        this.events = remoteEvents;
      }
    } catch (err) {
      console.warn('[MarketingTracker] Initial events warning:', err);
    }

    this.initialized = true;

    if (typeof window !== 'undefined') {
      realtimeService.subscribe((msg) => {
        if (msg && (msg.type === 'MARKETING_CONFIG_UPDATED' || msg.type === 'GA4_CONFIG_UPDATED') && msg.payload) {
          this.applyConfig(msg.payload);
        }
      });
    }
  }

  flushPendingQueue() {
    if (!this._pendingQueue.length) return;
    const queued = [...this._pendingQueue];
    this._pendingQueue = [];
    for (const item of queued) {
      this._executeTrack(item.eventName, item.data, item.context);
    }
  }

  applyConfig(config) {
    const normalized = config ? { ...config } : {};
    if (typeof normalized.pixelId === 'string') normalized.pixelId = normalized.pixelId.trim();
    if (typeof normalized.capiToken === 'string') normalized.capiToken = normalized.capiToken.trim();
    if (typeof normalized.ga4Id === 'string') normalized.ga4Id = normalized.ga4Id.trim();
    if (typeof normalized.testEventCode === 'string') normalized.testEventCode = normalized.testEventCode.trim();

    this.config = { ...this.config, ...normalized };
    this.configReady = true;

    if (typeof window !== 'undefined' && config && 'isActive' in config) {
      try {
        localStorage.setItem('amardokan_marketing_is_active', JSON.stringify(Boolean(this.config.isActive)));
      } catch {}
    }

    if (typeof window !== 'undefined') {
      if (this.config.isActive && this.config.pixelId) {
        this.injectMetaPixel(this.config.pixelId);
      }
      if (this.config.ga4Enabled !== false && this.config.ga4Id) {
        this.injectGA4(this.config.ga4Id);
      }
    }

    if (!this.config.isActive) {
      this._pendingQueue = [];
      return;
    }

    this.flushPendingQueue();
  }

  injectMetaPixel(pixelId) {
    if (typeof window === 'undefined') return;
    const cleanPixelId = String(pixelId || '').trim();
    if (!cleanPixelId) return;

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
      if (!this._initializedPixelIds.has(cleanPixelId)) {
        window.fbq('init', cleanPixelId);
        this._initializedPixelIds.add(cleanPixelId);
        console.log(`[Meta Pixel Initialized] Pixel ID: ${cleanPixelId}`);
      }
      this.pixelInitialized = true;
    } catch (e) {
      console.warn('[Meta Pixel Init Error]:', e);
    }
  }

  injectGA4(ga4Id) {
    if (typeof window === 'undefined') return;
    const cleanId = String(ga4Id || '').trim();
    if (!cleanId) return;

    if (!document.getElementById(`ga4-script-${cleanId}`)) {
      const script = document.createElement('script');
      script.id = `ga4-script-${cleanId}`;
      script.async = true;
      script.src = `https://www.googletagmanager.com/gtag/js?id=${encodeURIComponent(cleanId)}`;
      document.head.appendChild(script);
    }

    window.dataLayer = window.dataLayer || [];
    if (!window.gtag) {
      window.gtag = function () {
        window.dataLayer.push(arguments);
      };
      window.gtag('js', new Date());
    }
    if (!this._initializedGa4Ids.has(cleanId)) {
      window.gtag('config', cleanId, { send_page_view: true });
      this._initializedGa4Ids.add(cleanId);
      this.ga4Initialized = true;
      console.log(`[GA4 Initialized] Measurement ID: ${cleanId}`);
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
    if (typeof window !== 'undefined' && !this.configReady && context.source !== 'admin_test_console') {
      if (this._pendingQueue.length < 25) {
        this._pendingQueue.push({ eventName, data, context });
      }
      return `pending_${eventName.toLowerCase()}_${Date.now()}`;
    }
    return this._executeTrack(eventName, data, context);
  }

  _executeTrack(eventName, data = {}, context = {}) {
    const combinedContext = { ...data, ...context };
    const eventId = this.generateEventId(eventName.toLowerCase());
    const timestamp = new Date().toISOString();

    const productName =
      data.productName ||
      data.name ||
      data.content_name ||
      (data.items && data.items.map((i) => i.name).filter(Boolean).join(', ')) ||
      '';
    const productId = data.productId || (data.items && (data.items[0]?.productId || data.items[0]?.id)) || '';

    // Always forward real storefront funnel hits to GA4 Telemetry even if Meta Pixel is paused
    const ga4EventType = GA4_EVENT_MAP[eventName];
    if (ga4EventType && context.source !== 'admin_test_console') {
      if (typeof window !== 'undefined' && window.gtag && this.config.ga4Id && this.config.ga4Enabled !== false) {
        try {
          window.gtag('event', ga4EventType, {
            transaction_id: data.orderId || eventId,
            value: data.value || 0,
            currency: data.currency || 'BDT',
            items: data.items || (productId ? [{ item_id: productId, item_name: productName }] : []),
          });
        } catch (err) {
          console.warn('[GA4 track error]:', err);
        }
      }
      this._dispatchGA4Telemetry(ga4EventType, {
        source: data.source || '',
        campaign: data.campaign || '',
        city: data.city || data.district || '',
        orderId: data.orderId || '',
        productId,
        productName,
        value: data.value || 0,
      });
    }

    const isEligible = this.isScopeActive(combinedContext);
    if (!isEligible) {
      return null;
    }

    if (typeof window !== 'undefined' && this.config.pixelId && !window.fbq) {
      this.injectMetaPixel(this.config.pixelId);
    }

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

    const hasBrowserPixel = Boolean(
      this.config.pixelId && typeof window !== 'undefined' && typeof window.fbq === 'function'
    );

    const eventRecord = {
      id: 'mkt-' + Math.random().toString(36).substring(2, 9),
      eventId,
      eventName,
      timestamp,
      productName,
      productId,
      browserReported: hasBrowserPixel,
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
    if (hasBrowserPixel) {
      try {
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
        const pixelData =
          eventName === 'PageView'
            ? {}
            : {
                currency: data.currency || 'BDT',
                value: data.value || 0,
                content_name: productName || undefined,
                content_ids: productId ? [productId] : data.content_ids || undefined,
                content_type: 'product',
              };
        window.fbq(fbqMethod, eventName, pixelData, { eventID: eventId });
      } catch (err) {
        console.warn('[Browser Pixel track error]:', err);
      }
    }

    // 2. Dispatch Server-Side CAPI Event
    apiClient
      .sendCAPIEvent({
        eventName,
        eventId,
        browserReported: hasBrowserPixel,
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
