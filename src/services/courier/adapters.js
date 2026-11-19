export class PathaoAdapter {
  constructor() {
    this.providerId = 'pathao';
    this.name = 'Pathao Courier';
  }

  async authenticate() {
    return { success: true, token: 'pth_bearer_token_' + Date.now() };
  }

  async createShipment(payload) {
    const { order } = payload;
    const isDhaka = (order?.address?.district || '').toLowerCase() === 'dhaka';
    const deliveryFee = isDhaka ? 60 : 130;
    const trackingId = `PTH-${(order?.address?.district || 'DHK').substring(0, 3).toUpperCase()}-${Math.floor(100000 + Math.random() * 900000)}`;
    const consignmentId = `PTH-CNS-${Math.floor(1000000 + Math.random() * 9000000)}`;

    return {
      provider: 'pathao',
      trackingId,
      consignmentId,
      courierStatus: 'Order Placed at Pathao Hub',
      createdDate: new Date().toLocaleString('en-US', { hour12: true }),
      deliveryFee,
      codAmount: order?.paymentMethod === 'COD' ? (order?.total || 0) : 0,
      trackingUrl: `https://pathao.com/courier/tracking?consignment=${consignmentId}`,
      hubLocation: isDhaka ? 'Tejgaon Central Sorting Hub' : 'Dhaka Transit Departure Hub',
      assignedRiderName: 'Pathao Fleet Agent',
      assignedRiderPhone: '01700' + Math.floor(100000 + Math.random() * 900000),
    };
  }

  async cancelShipment(trackingId) {
    return { success: true, message: `Pathao consignment ${trackingId} successfully cancelled in Pathao Merchant portal.` };
  }

  async getTracking(trackingId) {
    return {
      status: 'In Transit',
      timeline: [
        { status: 'Order Submitted to Pathao API', time: '10:00 AM', hub: 'Tejgaon Central' },
        { status: 'Picked Up by Fleet Agent', time: '11:15 AM', hub: 'Merchant Warehouse' },
        { status: 'In Transit to Regional Hub', time: '01:30 PM', hub: 'Central Sorting' },
      ],
    };
  }

  async getRates(query) {
    const isDhaka = (query.destinationDistrict || '').toLowerCase() === 'dhaka';
    const rate = isDhaka ? 60 : 130;
    return {
      provider: 'pathao',
      name: 'Pathao Courier',
      rate,
      codFee: Math.round(rate * 0.01),
      totalEstimated: rate + Math.round(rate * 0.01),
      deliveryDaysEstimate: isDhaka ? '24 Hours' : '48-72 Hours',
    };
  }

  parseWebhook(payload) {
    let orderStatus = 'IN_TRANSIT';
    if (payload.event === 'delivered') orderStatus = 'DELIVERED';
    else if (payload.event === 'out_for_delivery') orderStatus = 'OUT_FOR_DELIVERY';
    else if (payload.event === 'picked_up') orderStatus = 'PICKED_UP';
    else if (payload.event === 'returned') orderStatus = 'RETURNED';
    else if (payload.event === 'cancelled') orderStatus = 'CANCELLED';

    return {
      orderStatus,
      collectedAmount: payload.collected_amount || 0,
      notes: `Pathao Webhook: ${(payload.event || '').toUpperCase()} at hub: ${payload.hub || 'Local Branch'}`,
    };
  }
}

export class SteadfastAdapter {
  constructor() {
    this.providerId = 'steadfast';
    this.name = 'Steadfast Courier';
  }

  async authenticate() {
    return { success: true, token: 'stf_bearer_token_' + Date.now() };
  }

  async createShipment(payload) {
    const { order } = payload;
    const isDhaka = (order?.address?.district || '').toLowerCase() === 'dhaka';
    const deliveryFee = isDhaka ? 60 : 120;
    const trackingId = `STF-BD-${Math.floor(1000000 + Math.random() * 9000000)}`;
    const consignmentId = `CNS-${Math.floor(1000000 + Math.random() * 9000000)}`;

    return {
      provider: 'steadfast',
      trackingId,
      consignmentId,
      courierStatus: 'Consignment Created at Steadfast',
      createdDate: new Date().toLocaleString('en-US', { hour12: true }),
      deliveryFee,
      codAmount: order?.paymentMethod === 'COD' ? (order?.total || 0) : 0,
      trackingUrl: `https://steadfast.com.bd/t/${trackingId}`,
      hubLocation: isDhaka ? 'Motijheel Central Hub' : 'District Express Line',
      assignedRiderName: 'Steadfast Dispatcher',
      assignedRiderPhone: '01800' + Math.floor(100000 + Math.random() * 900000),
    };
  }

  async cancelShipment(trackingId) {
    return { success: true, message: `Steadfast consignment ${trackingId} successfully cancelled.` };
  }

  async getTracking(trackingId) {
    return {
      status: 'Dispatched to Delivery Agent',
      timeline: [
        { status: 'Parcel Entry at Steadfast Hub', time: '09:00 AM' },
        { status: 'Dispatched from Sorting Line', time: '11:45 AM' },
      ],
    };
  }

  async getRates(query) {
    const isDhaka = (query.destinationDistrict || '').toLowerCase() === 'dhaka';
    const rate = isDhaka ? 60 : 120;
    return {
      provider: 'steadfast',
      name: 'Steadfast Courier',
      rate,
      codFee: Math.round(rate * 0.01),
      totalEstimated: rate + Math.round(rate * 0.01),
      deliveryDaysEstimate: isDhaka ? '24 Hours' : '36-48 Hours',
    };
  }

  parseWebhook(payload) {
    let orderStatus = 'IN_TRANSIT';
    if (payload.event === 'delivered') orderStatus = 'DELIVERED';
    else if (payload.event === 'out_for_delivery') orderStatus = 'OUT_FOR_DELIVERY';
    else if (payload.event === 'returned') orderStatus = 'RETURNED';

    return {
      orderStatus,
      collectedAmount: payload.collected_amount || 0,
      notes: `Steadfast Webhook Callback: ${(payload.event || '').toUpperCase()}`,
    };
  }
}

export class RedXAdapter {
  constructor() {
    this.providerId = 'redx';
    this.name = 'RedX Logistics';
  }

  async authenticate() {
    return { success: true, token: 'redx_auth_' + Date.now() };
  }

  async createShipment(payload) {
    const { order } = payload;
    const isDhaka = (order?.address?.district || '').toLowerCase() === 'dhaka';
    const deliveryFee = isDhaka ? 65 : 130;
    const trackingId = `RDX-${Math.floor(10000000 + Math.random() * 90000000)}`;
    const consignmentId = `RDX-CNS-${Math.floor(100000 + Math.random() * 900000)}`;

    return {
      provider: 'redx',
      trackingId,
      consignmentId,
      courierStatus: 'Pickup Request Scheduled',
      createdDate: new Date().toLocaleString('en-US', { hour12: true }),
      deliveryFee,
      codAmount: order?.paymentMethod === 'COD' ? (order?.total || 0) : 0,
      trackingUrl: `https://redx.com.bd/track/${trackingId}`,
      hubLocation: 'Mohakhali Sorting Center',
      assignedRiderName: 'RedX Courier Pilot',
      assignedRiderPhone: '01900' + Math.floor(100000 + Math.random() * 900000),
    };
  }

  async cancelShipment(trackingId) {
    return { success: true, message: `RedX parcel ${trackingId} cancelled.` };
  }

  async getTracking(trackingId) {
    return {
      status: 'Scheduled for Pickup',
      timeline: [{ status: 'Shipment created on RedX', time: '10:00 AM' }],
    };
  }

  async getRates(query) {
    const isDhaka = (query.destinationDistrict || '').toLowerCase() === 'dhaka';
    const rate = isDhaka ? 65 : 130;
    return {
      provider: 'redx',
      name: 'RedX Logistics',
      rate,
      codFee: Math.round(rate * 0.01),
      totalEstimated: rate + Math.round(rate * 0.01),
      deliveryDaysEstimate: isDhaka ? '24-48 Hours' : '48-72 Hours',
    };
  }

  parseWebhook(payload) {
    return {
      orderStatus: payload.event === 'delivered' ? 'DELIVERED' : 'IN_TRANSIT',
      collectedAmount: payload.collected_amount || 0,
      notes: `RedX Event: ${payload.event}`,
    };
  }
}

export class ECourierAdapter {
  constructor() {
    this.providerId = 'ecourier';
    this.name = 'eCourier Limited';
  }

  async authenticate() {
    return { success: true, token: 'ecourier_token_' + Date.now() };
  }

  async createShipment(payload) {
    const { order } = payload;
    const isDhaka = (order?.address?.district || '').toLowerCase() === 'dhaka';
    const deliveryFee = isDhaka ? 70 : 140;
    const trackingId = `EC-BD-${Math.floor(1000000 + Math.random() * 9000000)}`;

    return {
      provider: 'ecourier',
      trackingId,
      consignmentId: trackingId,
      courierStatus: 'Package Booked at eCourier',
      createdDate: new Date().toLocaleString('en-US', { hour12: true }),
      deliveryFee,
      codAmount: order?.paymentMethod === 'COD' ? (order?.total || 0) : 0,
      trackingUrl: `https://ecourier.com.bd/tracking?id=${trackingId}`,
      hubLocation: 'Uttara eCourier Hub',
    };
  }

  async cancelShipment(trackingId) {
    return { success: true, message: `eCourier ${trackingId} voided.` };
  }

  async getTracking(trackingId) {
    return { status: 'Registered in eCourier Database', timeline: [] };
  }

  async getRates(query) {
    const isDhaka = (query.destinationDistrict || '').toLowerCase() === 'dhaka';
    const rate = isDhaka ? 70 : 140;
    return {
      provider: 'ecourier',
      name: 'eCourier Limited',
      rate,
      codFee: Math.round(rate * 0.015),
      totalEstimated: rate + Math.round(rate * 0.015),
      deliveryDaysEstimate: '48-72 Hours',
    };
  }

  parseWebhook(payload) {
    return {
      orderStatus: payload.event === 'delivered' ? 'DELIVERED' : 'IN_TRANSIT',
      collectedAmount: payload.collected_amount || 0,
      notes: `eCourier notification: ${payload.event}`,
    };
  }
}

export const courierAdapters = {
  pathao: new PathaoAdapter(),
  steadfast: new SteadfastAdapter(),
  redx: new RedXAdapter(),
  ecourier: new ECourierAdapter(),
};
