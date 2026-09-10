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

export interface Order {
  id?: string;
  reference?: string;
  items: CartItem[];
  total: number;
  status?: string;
  placedAt?: string;
  paymentMethod?: string;
  paidAt?: string | null;
  contact?: OrderContact;
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
  createdAt: string;
  ordersCount: number;
}

export const ORDER_STATUSES = ['PLACED', 'PAID', 'PROCESSING', 'SHIPPED', 'DELIVERED', 'CANCELLED'] as const;
export type OrderStatus = (typeof ORDER_STATUSES)[number];

export interface CatalogItem {
  name: string;
  qty: number;
  price: number;
}