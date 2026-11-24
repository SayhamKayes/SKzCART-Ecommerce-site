import { apiClient } from './api';

export class BangladeshPaymentService {
  async initiatePayment(orderId, amount, method, customerPhone) {
    const normalized = String(method || 'COD').toUpperCase();
    if (normalized === 'COD') {
      return {
        paymentMethod: 'COD',
        status: 'UNPAID',
        isInstantConfirmation: true,
        message: 'Cash on Delivery selected. Pay courier upon parcel delivery.',
      };
    }

    if (normalized === 'SSLCOMMERZ') {
      const res = await apiClient.initiatePayment({
        orderId,
        amount,
        phone: customerPhone,
      });
      if (res && res.success && res.gatewayUrl) {
        return {
          paymentMethod: 'SSLCOMMERZ',
          status: 'PENDING',
          transactionId: res.tran_id,
          gatewayUrl: res.gatewayUrl,
          isInstantConfirmation: false,
          message: 'Redirecting to SSLCOMMERZ payment gateway...',
        };
      }
      throw new Error(res?.message || 'Failed to initiate SSLCOMMERZ payment session.');
    }

    return {
      paymentMethod: normalized,
      status: 'PENDING',
      isInstantConfirmation: false,
      message: `${normalized} manual payment recorded and awaiting TrxID verification.`,
    };
  }

  async verifyPayment(transactionId, orderId) {
    return apiClient.verifyPayment({
      tran_id: transactionId,
      orderId,
      action: 'verify',
    });
  }
}

export const paymentService = new BangladeshPaymentService();
