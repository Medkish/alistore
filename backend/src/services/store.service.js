const crypto = require('crypto');

function rid(prefix) {
  return `${prefix}_${crypto.randomBytes(6).toString('hex')}`;
}

const now = Date.now();
const days = (n) => new Date(now - n * 86400000).toISOString();

const store = {
  settings: {
    store: { name: 'AlioStore', logo: '', email: 'support@aliostore.com', phone: '+971 4 000 0000', currency: 'AED' },
    tax: { enabled: true, rate: 5, included: false },
    shipping: { defaultProvider: 'Aramex', freeShippingThreshold: 150, codEnabled: true, methodsEnabled: ['standard', 'express'] },
    payment: { provider: 'demo', codEnabled: true, cardEnabled: true },
    email: { provider: 'smtp', fromEmail: 'no-reply@alistore.com', fromName: 'AlioStore' },
    notifications: { orderUpdate: true, promotion: true, stockAlert: true, review: true, security: true },
    security: { twoFactor: false, passwordExpiryDays: 90, enforceRolePermissions: true, sessionTimeoutMin: 60 },
    donation: {
      enabled: true,
      minAmount: 5,
      maxAmount: 50000,
      suggestedAmounts: [10, 25, 50, 100, 250, 500],
      monthlyAmounts: [10, 25, 50, 100],
      purposes: ['AlioStore Development', 'Help improve the platform'],
      allowAnonymous: true,
      allowMonthly: true,
      allowMessages: true,
      allowCampaigns: true,
      sendEmailReceipt: true,
      showProgress: true,
      message: 'Your support helps us continue creating programming education and making learning resources more accessible.',
      showOnHomepage: true,
      showSupporterWall: true,
      messageApproval: true,
      messageDisplay: true,
      notifications: {
        customer: { paymentSuccess: true, receipt: true, thankYou: true, monthlyConfirmation: true },
        admin: { newDonation: true, largeDonation: true, paymentFailed: true, recurringCancelled: true, refundRequested: true }
      }
    },
  },

  shippingMethods: [
    { id: 'sm_std', key: 'standard', name: 'Standard Delivery', description: 'Delivery within 3–5 working days.', cost: 10, freeThreshold: 150, estimatedDays: '3–5 days', active: true },
    { id: 'sm_exp', key: 'express', name: 'Express Delivery', description: 'Delivery within 1–2 working days.', cost: 25, freeThreshold: 0, estimatedDays: '1–2 days', active: true },
    { id: 'sm_same', key: 'same_day', name: 'Same-Day (Dubai)', description: 'Order before 1 PM for same-day delivery in Dubai.', cost: 35, freeThreshold: 0, estimatedDays: 'Same day', active: true },
    { id: 'sm_pickup', key: 'pickup', name: 'Store Pickup', description: 'Collect from our Dubai store for free.', cost: 0, freeThreshold: 0, estimatedDays: 'Ready within 2 hours', active: true },
  ],

  shippingZones: [
    { id: 'sz_uae', name: 'UAE', countries: ['UAE'], enabled: true },
    { id: 'sz_gcc', name: 'GCC (KSA, Bahrain, Kuwait, Oman, Qatar)', countries: ['Saudi Arabia', 'Bahrain', 'Kuwait', 'Oman', 'Qatar'], enabled: true },
    { id: 'sz_intl', name: 'International', countries: ['All other countries'], enabled: true },
  ],

  shippingProviders: [
    { id: 'sp_aramex', name: 'Aramex', enabled: true, weightLimitKg: 30 },
    { id: 'sp_dhl', name: 'DHL Express', enabled: true, weightLimitKg: 40 },
    { id: 'sp_emirates', name: 'Emirates Post', enabled: false, weightLimitKg: 25 },
    { id: 'sp_internal', name: 'In-house Courier', enabled: true, weightLimitKg: 50 },
  ],

  website: {
    homepage: {
      heroTitle: 'Discover Your Next Great Read',
      heroSubtitle: 'Digital books delivered instantly to your library — read anywhere, anytime.',
      heroCta: 'Browse the Catalog',
      banner: 'Free delivery on orders over AED 150 in the UAE',
      featuredTitle: 'Featured Books',
      bestsellersTitle: 'Best Sellers',
    },
    about: 'AliStore is a smart book store bringing you the best digital titles with instant delivery and a delightful reading experience.',
    contact: { email: 'support@aliostore.com', phone: '+971 4 000 0000', address: 'Downtown Dubai, UAE' },
    pages: {
      privacy: 'Your privacy matters. We only collect what is needed to deliver your books.',
      terms: 'By using AliStore you agree to these terms and conditions.',
      shippingPolicy: 'Digital books are delivered instantly to your library.',
      refundPolicy: 'Refunds are available within 14 days of purchase for undelivered content.',
      faq: [['How do I get my book?', 'Instantly delivered to your library after purchase.']],
    },
    footer: {
      tagline: 'Smart book store — read smart.',
      social: { twitter: 'https://twitter.com', instagram: 'https://instagram.com', facebook: 'https://facebook.com' },
      contactEmail: 'support@aliostore.com',
    },
  },

  broadcasts: [
    { id: 'n_demo_1', audience: 'all', type: 'PROMO', category: 'customers', priority: 'NORMAL', title: 'Get 10% off your next book', message: 'Use code ALIO10 at checkout.', at: days(3), read: false, enabled: true, sent: 214 },
    { id: 'n_demo_2', audience: 'customers', type: 'SALE', category: 'customers', priority: 'HIGH', title: 'Flash sale this weekend', message: 'Up to 40% off selected titles.', at: days(6), read: false, enabled: true, sent: 196 },
    { id: 'n_evt_order', audience: 'all', type: 'ORDER', category: 'orders', priority: 'HIGH', title: 'New Order Received', message: 'A new order has been placed. Please review the order details and begin processing.', at: days(0.2), read: false, enabled: true, sent: 1 },
    { id: 'n_evt_ship', audience: 'all', type: 'SHIPPING', category: 'shipping', priority: 'NORMAL', title: 'Order Shipped', message: "The customer's order has been shipped successfully. Tracking information is available.", at: days(0.6), read: false, enabled: true, sent: 1 },
    { id: 'n_evt_pay', audience: 'all', type: 'PAYMENT', category: 'payments', priority: 'NORMAL', title: 'Payment Successful', message: "Payment has been successfully received for the customer's order.", at: days(1), read: false, enabled: true, sent: 1 },
    { id: 'n_evt_stock', audience: 'all', type: 'STOCK', category: 'low-stock', priority: 'URGENT', title: 'Low Stock Alert', message: 'Stock is running low for one or more books. Please review inventory and restock when necessary.', at: days(1.4), read: false, enabled: true, sent: 1 },
    { id: 'n_evt_user', audience: 'all', type: 'USER', category: 'customers', priority: 'LOW', title: 'New Customer Registered', message: 'A new customer has successfully created an account on AlioStore.', at: days(2), read: false, enabled: true, sent: 1 },
    { id: 'n_evt_sys', audience: 'all', type: 'SYSTEM', category: 'system', priority: 'NORMAL', title: 'System Maintenance', message: 'Scheduled system maintenance will take place soon. Some services may be temporarily unavailable.', at: days(3.5), read: false, enabled: true, sent: 1 },
  ],

  team: [
    { id: 'a_1', name: 'Administrator', email: 'admin@aliostore.com', role: 'ADMIN', active: true, createdAt: days(90), lastActive: days(0), permissions: { books: true, inventory: true, orders: true, customers: true, payments: true, reports: true, settings: true, team: true } },
    { id: 'a_2', name: 'Store Manager', email: 'manager@aliostore.com', role: 'MANAGER', active: true, createdAt: days(45), lastActive: days(1), permissions: { books: true, inventory: true, orders: true, customers: true, payments: true, reports: true, settings: false, team: false } },
    { id: 'a_3', name: 'Support Agent', email: 'support@aliostore.com', role: 'SUPPORT', active: true, createdAt: days(20), lastActive: days(2), permissions: { books: false, inventory: false, orders: true, customers: true, payments: false, reports: false, settings: false, team: false } },
  ],

  roles: [
    { role: 'ADMIN', label: 'Administrator', color: '#142a56', grants: ['All access'] },
    { role: 'MANAGER', label: 'Store Manager', color: '#2563eb', grants: ['Books', 'Inventory', 'Orders', 'Customers', 'Payments', 'Reports'] },
    { role: 'SUPPORT', label: 'Support Agent', color: '#d97706', grants: ['Orders', 'Customers'] },
  ],

  activityLogs: [
    { id: rid('log'), at: days(0), actor: 'Administrator', action: 'Updated bookstore settings' },
    { id: rid('log'), at: days(0), actor: 'Administrator', action: 'Published a coupon ALIO10' },
    { id: rid('log'), at: days(1), actor: 'Store Manager', action: 'Adjusted stock for 3 books' },
    { id: rid('log'), at: days(2), actor: 'Support Agent', action: 'Marked order #OR-4821 shipped' },
  ],

  apiLogs: [
    { id: rid('api'), at: days(0), method: 'GET', path: '/admin/payments', status: 200, ms: 14 },
    { id: rid('api'), at: days(0), method: 'POST', path: '/admin/inventory/adjust', status: 200, ms: 21 },
    { id: rid('api'), at: days(0), method: 'GET', path: '/books?category=fiction', status: 200, ms: 9 },
  ],

  errorLogs: [
    { id: rid('err'), at: days(0), level: 'WARN', source: 'order.service', message: 'Coupon code not found (attempted)' },
    { id: rid('err'), at: days(1), level: 'ERROR', source: 'payment', message: 'Demo gateway simulation — no live charges' },
  ],
};

function id(list, prefix) {
  let next;
  do {
    next = rid(prefix);
  } while (list.some((x) => x.id === next));
  return next;
}

module.exports = { store, rid, id };