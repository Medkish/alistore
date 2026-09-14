import { API_BASE as BASE } from '@/lib/api';

const VISITOR_KEY = 'alistore_visitor';
const DEDUPE_MS = 5000;

let lastPath = '';
let lastAt = 0;

export function getVisitorId(): string {
  if (typeof window === 'undefined') return '';
  let id = '';
  try {
    id = window.localStorage.getItem(VISITOR_KEY) || '';
  } catch {
    /* storage unavailable */
  }
  if (!id) {
    id =
      typeof crypto !== 'undefined' && typeof crypto.randomUUID === 'function'
        ? crypto.randomUUID()
        : 'v_' + Math.random().toString(36).slice(2) + Date.now().toString(36);
    try {
      window.localStorage.setItem(VISITOR_KEY, id);
    } catch {
      /* storage unavailable */
    }
  }
  return id;
}

type TrackEvent = { event: 'page_view' | 'product_view' | 'add_to_cart'; path?: string; referrer?: string; bookId?: string };

async function send(data: TrackEvent) {
  if (typeof window === 'undefined') return;
  try {
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), 3000);
    await fetch(`${BASE}/api/analytics/events`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'X-Visitor-Id': getVisitorId() },
      body: JSON.stringify({
        event: data.event,
        path: data.path || window.location.pathname,
        referrer: data.referrer !== undefined ? data.referrer : document.referrer || '',
        bookId: data.bookId || '',
      }),
      keepalive: true,
      signal: controller.signal,
    }).finally(() => clearTimeout(timer));
  } catch {
    /* analytics must never break the store */
  }
}

export function trackPageView(path: string) {
  if (typeof window === 'undefined' || !path) return;
  const now = Date.now();
  if (path === lastPath && now - lastAt < DEDUPE_MS) return;
  lastPath = path;
  lastAt = now;
  void send({ event: 'page_view', path });
}

export function trackProductView(bookId: string) {
  if (typeof window === 'undefined' || !bookId) return;
  void send({ event: 'product_view', bookId });
}

export function trackAddToCart(bookId: string) {
  if (typeof window === 'undefined' || !bookId) return;
  void send({ event: 'add_to_cart', bookId });
}