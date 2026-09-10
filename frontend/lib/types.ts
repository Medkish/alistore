export interface Book {
  id: string;
  title: string;
  author: string;
  price: number;
  image: string;
  description?: string;
  pages?: number;
  rating?: number;
}

export interface CartItem {
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
  subscriptions?: { plan: string; price: number; per: string; ref: string }[];
}

export interface Order {
  id?: string;
  reference?: string;
  items: CartItem[];
  total: number;
  status?: string;
  placedAt?: string;
}

export interface CatalogItem {
  name: string;
  qty: number;
  price: number;
}