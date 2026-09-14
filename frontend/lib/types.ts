export interface Book {
  id: string;
  slug?: string;
  title: string;
  author: string;
  price: number;
  image: string;
  description?: string;
  pages?: number;
  rating?: number;
  stock?: number;
  prevPrice?: number;
  publicationDate?: string;
  coverImage?: string;
  featured?: boolean;
  bestseller?: boolean;
  isbn?: string;
  publisher?: string;
  language?: string;
  edition?: string;
  format?: string;
  published?: boolean;
  publishedAt?: string;
  updatedAt?: string;
  category?: { id?: string; name?: string; slug?: string } | string;
}

export interface CartItem {
  id: string;
  name: string;
  qty: number;
  price: number;
  image?: string;
}

export interface User {
  id?: string;
  name: string;
  email: string;
  mobile?: string;
  role?: string;
  subscriptions?: { plan: string; price: number; per: string; ref: string }[];
}

export interface OrderContact {
  name: string;
  email: string;
  phone: string;
  address: string;
}

export interface TrackingEventItem {
  id?: string;
  status: string;
  label: string;
  note?: string;
  at: string;
}

export interface Order {
  id?: string;
  reference?: string;
  items: CartItem[];
  total: number;
  subtotal?: number;
  shippingCost?: number;
  tax?: number;
  status?: string;
  placedAt?: string;
  paymentMethod?: string;
  paymentProvider?: string;
  paymentStatus?: string;
  paymentReference?: string;
  paidAt?: string | null;
  couponCode?: string;
  discountAmount?: number;
  trackingNumber?: string;
  trackingProvider?: string;
  estimatedDelivery?: string | null;
  notes?: string;
  contact?: OrderContact;
  trackingEvents?: TrackingEventItem[];
  user?: { id?: string; name?: string; email?: string; mobile?: string };
}

export interface BooksResult {
  books: Book[];
  total: number;
  page: number;
  pageSize: number;
  totalPages: number;
}

export interface AdminStats {
  bookCount: number;
  stockTotal: number;
  userCount: number;
  revenue: number;
  paidOrderCount: number;
  recentOrders: Order[];
}

export interface AdminUser {
  id: string;
  name: string;
  email: string;
  mobile: string;
  role: string;
  blocked?: boolean;
  notes?: string;
  lastActive?: string;
  createdAt: string;
  ordersCount: number;
  totalSpent?: number;
  lastOrderAt?: string | null;
}

export const ORDER_STATUSES = ['PENDING', 'CONFIRMED', 'PROCESSING', 'SHIPPED', 'OUT_FOR_DELIVERY', 'DELIVERED', 'CANCELLED', 'REFUNDED'] as const;
export type OrderStatus = (typeof ORDER_STATUSES)[number];

export const TRACK_LABELS: Record<string, string> = {
  PENDING: 'Order Placed',
  PAID: 'Payment Received',
  CONFIRMED: 'Order Confirmed',
  PROCESSING: 'Processing',
  SHIPPED: 'Shipped',
  OUT_FOR_DELIVERY: 'Out for Delivery',
  DELIVERED: 'Delivered',
  CANCELLED: 'Cancelled',
  REFUNDED: 'Refunded',
};

export const ORDER_TRANSITIONS: Record<string, string[]> = {
  PENDING: ['CONFIRMED', 'CANCELLED'],
  PAID: ['CONFIRMED', 'PROCESSING', 'SHIPPED', 'CANCELLED', 'REFUNDED'],
  CONFIRMED: ['PROCESSING', 'CANCELLED'],
  PROCESSING: ['SHIPPED', 'CANCELLED'],
  SHIPPED: ['OUT_FOR_DELIVERY', 'DELIVERED', 'CANCELLED'],
  OUT_FOR_DELIVERY: ['DELIVERED'],
  DELIVERED: ['REFUNDED'],
  CANCELLED: [],
  REFUNDED: [],
};

export interface CatalogItem {
  name: string;
  qty: number;
  price: number;
}

export interface CategoryItem {
  id: string;
  slug: string;
  name: string;
  description?: string;
  image?: string;
  active?: boolean;
  booksCount?: number;
}

export interface ReviewItem {
  id: string;
  rating: number;
  text: string;
  user: string;
  createdAt: string;
}

export interface BookReviews {
  average: number | null;
  count: number;
  purchased: boolean;
  submitted: boolean;
  status?: string | null;
  reviews: ReviewItem[];
}

export interface NotificationItem {
  id: string;
  type: string;
  title: string;
  message: string;
  read: boolean;
  at: string;
}

export interface DiscountItem {
  id: string;
  code: string;
  type: 'PERCENT' | 'FIXED';
  value: number;
  minOrder: number;
  active: boolean;
  maxUses?: number | null;
  usedCount?: number;
  expiresAt: string | null;
  createdAt: string;
}

export interface StockLogItem {
  id: string;
  slug: string;
  title: string;
  change: number;
  reason: string;
  createdBy: string;
  createdAt: string;
}

export interface AdminCart {
  id: string;
  name: string;
  email: string;
  lastActive: string;
  items: { id: string; title: string; price: number; qty: number }[];
  value: number;
}

export interface PaymentTransaction {
  id: string;
  reference: string;
  transactionId: string;
  method: string;
  provider: string;
  amount: number;
  status: string;
  date: string;
}

export interface Campaign {
  id: string;
  title: string;
  slug: string;
  description: string;
  banner?: string | null;
  purpose?: string | null;
  goal: number;
  currency: string;
  status: string;
  featured: boolean;
  raised: number;
  donorsCount: number;
  fundedPercent: number;
  startsAt?: string | null;
  endsAt?: string | null;
  createdAt: string;
}

export interface DonationItem {
  id: string;
  donationNumber: string;
  amount: number;
  feesAmount?: number | null;
  coverFees?: boolean;
  currency: string;
  status: string;
  paymentMethod: string | null;
  provider: string | null;
  transactionId: string | null;
  donorName: string;
  donorEmail: string | null;
  isAnonymous: boolean;
  showOnWall?: boolean;
  recurring?: boolean;
  purpose?: string | null;
  message?: string | null;
  messageStatus?: string;
  country?: string | null;
  campaignId?: string | null;
  campaign?: { id: string; title: string; slug: string; purpose?: string | null } | null;
  refund?: {
    amount: number;
    reason: string;
    actorName: string;
    refundedAt: string;
  } | null;
  paidAt: string | null;
  createdAt: string;
}

export interface DonationsResult {
  stats: {
    totalDonations: number;
    totalCount: number;
    thisMonth: number;
    thisMonthCount: number;
    today: number;
    donors: number;
    monthlyDonors: number;
    average: number;
  };
  byStatus: Record<string, number>;
  totalCount: number;
  donations: DonationItem[];
}

export interface DonationSummary {
  totalRaised: number;
  totalDonors: number;
  thisMonth: number;
  campaigns: { id: string; title: string; slug: string; goal: number; raised: number; fundedPercent: number }[];
}

export interface DonationSupporter {
  name: string;
  total: number;
  amount?: number;
  count?: number;
  recurring?: boolean;
  badges?: string[];
  currency?: string;
  purpose?: string | null;
  campaign?: string | null;
  message?: string;
  at?: string;
}

export interface DonorItem {
  userId: string | null;
  name: string;
  email: string | null;
  isAnonymous: boolean;
  total: number;
  count: number;
  recurring: boolean;
  lastDonation: string;
  firstDonation: string;
}

export interface DonationReports {
  currency: string;
  label: string;
  totalAmount: number;
  donors: number;
  average: number;
  monthlyDonors: number;
  largest: number;
  largestDonor: string | null;
  recurringRevenue: number;
  conversionRate: number;
  daily: { date: string; amount: number }[];
  monthly: { month: string; amount: number; donors: number }[];
  campaignPerformance: { name: string; amount: number }[];
  byAmount: { label: string; value: number }[];
  oneTimeIfMonthly: { oneTime: number; monthly: number };
  byCountry: { name: string; amount: number }[];
  byStatus: { PAID: number; PENDING: number; FAILED: number; REFUNDED: number };
}

export interface DonationRefundItem {
  id: string;
  donationNumber: string;
  amount: number;
  reason: string;
  actorName: string;
  refundedAt: string;
}

export interface CouponResult {
  valid: boolean;
  code?: string;
  type?: string;
  value?: number;
  minOrder?: number;
  discount: number;
  error?: string;
}

export interface AuthEvent {
  id: string;
  at: string;
  kind: string;
  actor: string;
  email: string;
  detail: string;
  role?: string;
  sessionId?: string;
}

export interface SessionItem {
  id: string;
  tokenPrefix: string;
  createdAt: string;
  current: boolean;
  userId: string;
  user: { id: string; name: string; email: string; role: string } | null;
}

export const VALID_ROLES = ['CUSTOMER', 'MANAGER', 'ADMIN', 'SUPER_ADMIN'] as const;
export type AdminRole = (typeof VALID_ROLES)[number];

export const ROLE_SPECS: Record<AdminRole, { label: string; icon: string; description: string; permissions: string[] }> = {
  SUPER_ADMIN: {
    label: 'Super Admin',
    icon: '👑',
    description: 'Full system access including role management.',
    permissions: [
      'All store management',
      'Manage roles & permissions',
      'System configuration',
      'View all activity',
    ],
  },
  ADMIN: {
    label: 'Administrator',
    icon: '🛡️',
    description: 'Full store management, cannot change roles.',
    permissions: [
      'Books & inventory',
      'Orders & payments',
      'Customers & reviews',
      'Coupons & reports',
      'Admin dashboard',
    ],
  },
  MANAGER: {
    label: 'Manager',
    icon: '📋',
    description: 'Operational staff with limited admin access.',
    permissions: [
      'View orders & update status',
      'Manage inventory',
      'Respond to reviews',
    ],
  },
  CUSTOMER: {
    label: 'Customer',
    icon: '👤',
    description: 'Standard customer account with no admin access.',
    permissions: [
      'Browse & purchase books',
      'View order history',
      'Write reviews',
    ],
  },
};

/* --------------------- Shipping --------------------- */
export interface ShippingMethod {
  id: string;
  key: string;
  name: string;
  description: string;
  cost: number;
  freeThreshold: number;
  estimatedDays: string;
  active: boolean;
}

export interface ShippingZone {
  id: string;
  name: string;
  countries: string[];
  enabled: boolean;
}

export interface ShippingProvider {
  id: string;
  name: string;
  enabled: boolean;
  weightLimitKg: number;
}

export interface ShippingInfo {
  methods: ShippingMethod[];
  zones: ShippingZone[];
  providers: ShippingProvider[];
}

/* --------------------- Analytics --------------------- */
export interface AnalyticsSummary {
  periodDays: number;
  overview: {
    pageViews: number;
    productViews: number;
    addToCarts: number;
    uniqueVisitors: number;
    distinctProducts: number;
    distinctCartProducts: number;
    returningVisitors: number;
    visitsToday: number;
    uniqueToday: number;
    totalSessions: number;
    avgSessionMinutes: number;
  };
  perDay: { label: string; pageViews: number; productViews: number; addToCarts: number; visitors: number }[];
  topPages: { path: string; views: number }[];
  topProducts: { bookId: string; slug: string; title: string; image: string; views: number; carts: number }[];
  devices: { device: string; count: number }[];
  referrers: { referrer: string; count: number }[];
  recent: {
    id: string;
    visitorId: string;
    event: string;
    path: string;
    device: string;
    browser: string;
    bookId: string | null;
    bookSlug?: string;
    bookTitle?: string;
    referrer: string;
    at: string;
  }[];
}

/* --------------------- Website content --------------------- */
export type HomepageSectionKey = 'hero' | 'categories' | 'featured' | 'newBooks' | 'bestsellers' | 'promotion' | 'newsletter';

export interface HomepageSection {
  title?: string;
  show?: boolean;
  mode?: 'auto' | 'manual';
  bookIds?: string[];
  count?: number;
}

export interface HomepageContent {
  hero?: {
    title?: string;
    subtitle?: string;
    image?: string;
    buttonText?: string;
    buttonLink?: string;
    show?: boolean;
  };
  categories?: HomepageSection;
  featured?: HomepageSection;
  newBooks?: HomepageSection;
  bestsellers?: HomepageSection;
  promotion?: {
    title?: string;
    description?: string;
    image?: string;
    buttonText?: string;
    buttonLink?: string;
    startDate?: string;
    endDate?: string;
    show?: boolean;
  };
  newsletter?: {
    title?: string;
    subtitle?: string;
    show?: boolean;
  };
  order?: HomepageSectionKey[];
}

export interface WebsiteContent {
  homepage?: HomepageContent;
  about?: string;
  contact?: { email?: string; phone?: string; address?: string };
  pages?: {
    privacy?: string;
    terms?: string;
    shippingPolicy?: string;
    refundPolicy?: string;
    faq?: [string, string][];
  };
  footer?: {
    tagline?: string;
    social?: { twitter?: string; instagram?: string; facebook?: string };
    contactEmail?: string;
  };
}

/* --------------------- Broadcast notifications --------------------- */
export interface BroadcastNotification {
  id: string;
  audience: string;
  type: string;
  category?: string;
  priority?: string;
  title: string;
  message: string;
  at: string;
  read: boolean;
  enabled: boolean;
  sent: number;
}

/* --------------------- Admin team & permissions --------------------- */
export interface TeamMember {
  id: string;
  name: string;
  email: string;
  role: string;
  active: boolean;
  createdAt: string;
  lastActive: string | null;
  permissions: Record<string, boolean>;
}

export interface TeamRole {
  role: string;
  label: string;
  color: string;
  grants: string[];
}

export interface ActivityLogEntry {
  id: string;
  at: string;
  actor: string;
  action: string;
}

/* --------------------- Store settings --------------------- */
export interface DonationSettings {
  enabled?: boolean;
  minAmount?: number;
  maxAmount?: number;
  suggestedAmounts?: number[];
  monthlyAmounts?: number[];
  purposes?: string[];
  allowAnonymous?: boolean;
  allowMonthly?: boolean;
  allowMessages?: boolean;
  allowCampaigns?: boolean;
  sendEmailReceipt?: boolean;
  showProgress?: boolean;
  message?: string;
  showOnHomepage?: boolean;
  showSupporterWall?: boolean;
  messageApproval?: boolean;
  messageDisplay?: boolean;
  notifications?: {
    customer?: { paymentSuccess?: boolean; receipt?: boolean; thankYou?: boolean; monthlyConfirmation?: boolean };
    admin?: { newDonation?: boolean; largeDonation?: boolean; paymentFailed?: boolean; recurringCancelled?: boolean; refundRequested?: boolean };
  };
}

export interface StoreSettings {
  store: { name?: string; logo?: string; email?: string; phone?: string; currency?: string };
  tax: { enabled?: boolean; rate?: number; included?: boolean };
  shipping: { defaultProvider?: string; freeShippingThreshold?: number; codEnabled?: boolean };
  payment: { provider?: string; codEnabled?: boolean; cardEnabled?: boolean };
  email: { provider?: string; fromEmail?: string; fromName?: string };
  notifications: Record<string, boolean>;
  security: { twoFactor?: boolean; passwordExpiryDays?: number; enforceRolePermissions?: boolean; sessionTimeoutMin?: number };
  donation?: DonationSettings;
}

/* --------------------- System & developer tools --------------------- */
export interface SystemLogEntry {
  id: string;
  at: string;
  method?: string;
  path?: string;
  status?: number;
  ms?: number;
  level?: string;
  source?: string;
  message?: string;
  actor?: string;
  action?: string;
}

export interface SystemStatus {
  status: {
    server: { up: boolean; node: string; uptimeSec: number; port: string | number };
    api: { healthy: boolean; version: string };
    database: { connected: boolean; provider: string; env?: string; host?: string; name?: string; maskedUrl?: string | null };
  };
  logs: { activity: ActivityLogEntry[]; api: SystemLogEntry[]; errors: SystemLogEntry[] };
  backup: { lastBackup: string; sizeMB: number; auto: boolean };
  cache: { memory: string; lastCleared: string };
  migrations?: { strategy: string; mode: string; folderExists: boolean; lastMigration: string | null; pending: number | null; recommend?: string };
  info: { storeName: string; databaseVersion: string; memoryUsageMB: number; uptimePretty: string; lastDeploy: string };
}