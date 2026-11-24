import { apiClient } from './api';

let _cachedShopInfo = { shopName: 'AmarDokan', hotline: '', supportEmail: '' };

export function setActiveShopInfoCache(info = {}) {
  _cachedShopInfo = {
    shopName: info.name || info.shopName || 'AmarDokan',
    hotline: info.hotline || '',
    supportEmail: info.supportEmail || '',
  };
}

function getActiveShopInfo() {
  return _cachedShopInfo;
}

export class NotificationEngine {
  constructor() {
    this.notificationLogs = [];
  }

  getLogs() {
    return this.notificationLogs;
  }

  async fetchLogs() {
    try {
      const logs = await apiClient.getNotifications();
      if (Array.isArray(logs)) {
        const mapped = logs
          .filter((l) => (l.channel || 'EMAIL').toUpperCase() === 'EMAIL')
          .map((l) => ({
            id: l.id,
            channel: 'EMAIL',
            recipient: l.recipient,
            templateName: l.templateName,
            message: l.messageText,
            sentAt: l.timestamp,
            provider: l.provider,
            status: l.status,
            orderId: l.orderId,
          }));
        this.notificationLogs = mapped;
        return mapped;
      }
    } catch (e) {
      console.warn('Failed to fetch backend notification logs:', e);
    }
    return this.notificationLogs;
  }

  async sendEmail(params) {
    const recipient = (params.recipientEmail || params.recipient || '').trim();
    const res = await apiClient.sendNotification({
      channel: 'EMAIL',
      recipient,
      subject: params.subject || '',
      messageText: params.message,
      templateName: params.type || 'MANUAL_EMAIL',
      orderId: params.orderId || 'MANUAL-EMAIL',
    });

    const resultObj = res?.result || {};
    const ok = Boolean(res?.success && resultObj.success !== false);
    const entry = {
      id: resultObj.logId || 'email-' + Date.now(),
      channel: 'EMAIL',
      recipient,
      message: params.message,
      sentAt: resultObj.timestamp || new Date().toLocaleString(),
      provider: resultObj.provider || 'Django_SMTP_Email',
      status: resultObj.status || (ok ? 'SENT' : 'FAILED'),
      orderId: params.orderId || 'MANUAL-EMAIL',
    };
    this.notificationLogs.unshift(entry);
    return {
      success: ok,
      messageId: entry.id,
      error: resultObj.error || res?.message,
      res,
    };
  }
}

export const notificationEngine = new NotificationEngine();
