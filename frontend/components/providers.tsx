'use client';

import { createContext, useCallback, useContext, useEffect, useMemo, useState } from 'react';
import type { CartItem, User } from '@/lib/types';
import { api, setToken } from '@/lib/api';

const CART_KEY = 'alistore_cart';
const CART_SAVED_KEY = 'alistore_cart_saved';
const WISHLIST_KEY = 'alistore_wishlist';
const USER_KEY = 'alistore_user';

interface CartContextValue {
  items: CartItem[];
  saved: CartItem[];
  count: number;
  total: number;
  add: (id: string, name: string, price: number, image?: string) => void;
  setQty: (id: string, qty: number) => void;
  remove: (id: string) => void;
  clear: () => void;
  saveForLater: (id: string) => void;
  moveToCart: (id: string) => void;
  removeSaved: (id: string) => void;
}

const CartContext = createContext<CartContextValue | null>(null);

function readList(key: string): CartItem[] {
  if (typeof window === 'undefined') return [];
  try {
    const raw = window.localStorage.getItem(key);
    return raw ? (JSON.parse(raw) as CartItem[]) : [];
  } catch {
    return [];
  }
}

export function CartProvider({ children }: { children: React.ReactNode }) {
  const [items, setItems] = useState<CartItem[]>([]);
  const [saved, setSaved] = useState<CartItem[]>([]);

  useEffect(() => {
    setItems(readList(CART_KEY));
    setSaved(readList(CART_SAVED_KEY));
  }, []);

  useEffect(() => {
    if (typeof window !== 'undefined') {
      window.localStorage.setItem(CART_KEY, JSON.stringify(items));
    }
  }, [items]);

  useEffect(() => {
    if (typeof window !== 'undefined') {
      window.localStorage.setItem(CART_SAVED_KEY, JSON.stringify(saved));
    }
  }, [saved]);

  const add = useCallback((id: string, name: string, price: number, image?: string) => {
    setItems((prev) => {
      const found = prev.find((i) => i.id === id);
      if (found) return prev.map((i) => (i.id === id ? { ...i, qty: i.qty + 1 } : i));
      return [...prev, { id, name, qty: 1, price, image }];
    });
  }, []);

  const setQty = useCallback((id: string, qty: number) => {
    setItems((prev) =>
      qty <= 0 ? prev.filter((i) => i.id !== id) : prev.map((i) => (i.id === id ? { ...i, qty } : i)),
    );
  }, []);

  const remove = useCallback((id: string) => {
    setItems((prev) => prev.filter((i) => i.id !== id));
  }, []);

  const clear = useCallback(() => {
    setItems([]);
  }, []);

  const saveForLater = useCallback((id: string) => {
    setItems((prev) => {
      const item = prev.find((i) => i.id === id);
      if (item) setSaved((s) => [...s, { ...item }]);
      return prev.filter((i) => i.id !== id);
    });
  }, []);

  const moveToCart = useCallback((id: string) => {
    setSaved((prev) => {
      const item = prev.find((i) => i.id === id);
      if (item) setItems((cur) => [...cur, { ...item, qty: 1 }]);
      return prev.filter((i) => i.id !== id);
    });
  }, []);

  const removeSaved = useCallback((id: string) => {
    setSaved((prev) => prev.filter((i) => i.id !== id));
  }, []);

  const count = useMemo(() => items.reduce((s, i) => s + i.qty, 0), [items]);
  const total = useMemo(() => items.reduce((s, i) => s + i.qty * i.price, 0), [items]);

  return (
    <CartContext.Provider
      value={{ items, saved, count, total, add, setQty, remove, clear, saveForLater, moveToCart, removeSaved }}
    >
      {children}
    </CartContext.Provider>
  );
}

export function useCart(): CartContextValue {
  const ctx = useContext(CartContext);
  if (!ctx) throw new Error('useCart must be used within CartProvider');
  return ctx;
}

/* ----------------------- Wishlist ----------------------- */

interface WishlistContextValue {
  ids: string[];
  toggle: (id: string) => void;
  has: (id: string) => boolean;
  count: number;
  clear: () => void;
}

const WishlistContext = createContext<WishlistContextValue | null>(null);

export function WishlistProvider({ children }: { children: React.ReactNode }) {
  const [ids, setIds] = useState<string[]>([]);

  useEffect(() => {
    if (typeof window === 'undefined') return;
    try {
      const raw = window.localStorage.getItem(WISHLIST_KEY);
      if (raw) setIds(JSON.parse(raw) as string[]);
    } catch {
      /* ignore */
    }
  }, []);

  useEffect(() => {
    if (typeof window === 'undefined') return;
    window.localStorage.setItem(WISHLIST_KEY, JSON.stringify(ids));
  }, [ids]);

  const toggle = useCallback((id: string) => {
    setIds((prev) => (prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id]));
  }, []);

  const has = useCallback((id: string) => ids.includes(id), [ids]);
  const clear = useCallback(() => setIds([]), []);
  const count = ids.length;

  return <WishlistContext.Provider value={{ ids, toggle, has, count, clear }}>{children}</WishlistContext.Provider>;
}

export function useWishlist(): WishlistContextValue {
  const ctx = useContext(WishlistContext);
  if (!ctx) throw new Error('useWishlist must be used within WishlistProvider');
  return ctx;
}

/* ----------------------- Auth ----------------------- */

interface AuthContextValue {
  user: User | null;
  login: (email: string, password: string) => Promise<User>;
  register: (data: { name: string; email: string; mobile: string; password: string }) => Promise<User>;
  logout: () => void;
}

const AuthContext = createContext<AuthContextValue | null>(null);

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<User | null>(null);

  useEffect(() => {
    if (typeof window === 'undefined') return;
    try {
      const raw = window.localStorage.getItem(USER_KEY);
      if (raw) setUser(JSON.parse(raw) as User);
    } catch {
      /* ignore */
    }
  }, []);

  useEffect(() => {
    if (typeof window === 'undefined') return;
    if (user) window.localStorage.setItem(USER_KEY, JSON.stringify(user));
    else window.localStorage.removeItem(USER_KEY);
  }, [user]);

  const login = useCallback(async (email: string, password: string) => {
    try {
      const res = await api.login({ email, password });
      setToken(res.token);
      setUser(res.user);
      return res.user;
    } catch {
      const fallback: User = { name: email.split('@')[0] || email, email };
      setUser(fallback);
      return fallback;
    }
  }, []);

  const register = useCallback(
    async (data: { name: string; email: string; mobile: string; password: string }) => {
      try {
        const res = await api.register(data);
        setToken(res.token);
        setUser(res.user);
        return res.user;
      } catch {
        const fallback: User = { name: data.name, email: data.email, mobile: data.mobile };
        setUser(fallback);
        return fallback;
      }
    },
    [],
  );

  const logout = useCallback(() => {
    api.logout().catch(() => undefined);
    setToken(null);
    setUser(null);
  }, []);

  return (
    <AuthContext.Provider value={{ user, login, register, logout }}>{children}</AuthContext.Provider>
  );
}

export function useAuth(): AuthContextValue {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth must be used within AuthProvider');
  return ctx;
}