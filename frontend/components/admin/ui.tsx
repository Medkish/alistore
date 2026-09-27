'use client';

import { useEffect, useState } from 'react';
import { toneClass } from '@/lib/admin';
import type { Tone } from '@/lib/admin';

/* --------------------------------- panel --------------------------------- */

export function Panel({
  title,
  subtitle,
  action,
  children,
  className = '',
  bodyClassName = 'p-4 sm:p-5',
}: {
  title?: React.ReactNode;
  subtitle?: React.ReactNode;
  action?: React.ReactNode;
  children: React.ReactNode;
  className?: string;
  bodyClassName?: string;
}) {
  return (
    <section className={`card overflow-hidden ${className}`}>
      {(title || action) && (
        <header className="flex flex-wrap items-center justify-between gap-3 border-b border-line px-4 py-3 sm:px-5">
          <div className="min-w-0">
            {title && <h2 className="text-sm font-extrabold text-ink sm:text-base">{title}</h2>}
            {subtitle && <p className="mt-0.5 text-xs text-muted">{subtitle}</p>}
          </div>
          {action && <div className="flex shrink-0 flex-wrap items-center gap-2">{action}</div>}
        </header>
      )}
      <div className={bodyClassName}>{children}</div>
    </section>
  );
}

/* ------------------------------- stat card ------------------------------- */

export function StatCard({
  label,
  value,
  hint,
  tone = 'neutral',
}: {
  label: string;
  value: React.ReactNode;
  hint?: React.ReactNode;
  tone?: Tone;
}) {
  const accents: Record<Tone, string> = {
    neutral: 'text-ink',
    info: 'text-brand',
    success: 'text-emerald-600',
    warn: 'text-amber-600',
    danger: 'text-red-600',
  };
  return (
    <div className="card p-4">
      <p className="text-[11px] font-bold uppercase tracking-wide text-muted">{label}</p>
      <p className={`mt-1.5 text-2xl font-extrabold tabular-nums sm:text-3xl ${accents[tone]}`}>{value}</p>
      {hint && <p className="mt-1 text-xs text-muted">{hint}</p>}
    </div>
  );
}

/* -------------------------------- pill ---------------------------------- */

export function Pill({ tone = 'neutral', children }: { tone?: Tone; children: React.ReactNode }) {
  return (
    <span
      className={`inline-flex items-center whitespace-nowrap rounded-full border px-2.5 py-0.5 text-[11px] font-bold ${toneClass(tone)}`}
    >
      {children}
    </span>
  );
}

/* ------------------------------ form fields ------------------------------ */

export function Label({ children, hint }: { children: React.ReactNode; hint?: string }) {
  return (
    <span className="mb-1.5 block text-xs font-bold text-ink">
      {children}
      {hint && <span className="ml-1.5 font-normal text-muted">{hint}</span>}
    </span>
  );
}

export function Field({
  label,
  hint,
  className = '',
  ...props
}: React.InputHTMLAttributes<HTMLInputElement> & { label?: string; hint?: string }) {
  const id = props.id || (label ? `f-${label.replace(/\W+/g, '-').toLowerCase()}` : undefined);
  return (
    <label className={`block ${className}`} htmlFor={id}>
      {label && <Label hint={hint}>{label}</Label>}
      <input id={id} {...props} className="field min-h-11" />
    </label>
  );
}

export function TextArea({
  label,
  hint,
  className = '',
  ...props
}: React.TextareaHTMLAttributes<HTMLTextAreaElement> & { label?: string; hint?: string }) {
  const id = props.id || (label ? `t-${label.replace(/\W+/g, '-').toLowerCase()}` : undefined);
  return (
    <label className={`block ${className}`} htmlFor={id}>
      {label && <Label hint={hint}>{label}</Label>}
      <textarea id={id} {...props} className="field min-h-24 resize-y" />
    </label>
  );
}

export function Select({
  label,
  hint,
  className = '',
  children,
  ...props
}: React.SelectHTMLAttributes<HTMLSelectElement> & { label?: string; hint?: string }) {
  const id = props.id || (label ? `s-${label.replace(/\W+/g, '-').toLowerCase()}` : undefined);
  return (
    <label className={`block ${className}`} htmlFor={id}>
      {label && <Label hint={hint}>{label}</Label>}
      <select id={id} {...props} className="field min-h-11 cursor-pointer">
        {children}
      </select>
    </label>
  );
}

/* -------------------------------- buttons -------------------------------- */

type BtnVariant = 'primary' | 'outline' | 'ghost' | 'danger' | 'success';

const BTN_VARIANT: Record<BtnVariant, string> = {
  primary: 'btn-brand',
  outline: 'btn-outline-flash border-brand text-brand hover:bg-brand hover:text-white',
  ghost: 'btn-ghost-flash text-muted hover:text-ink',
  danger: 'border border-red-200 bg-red-50 text-red-700 hover:bg-red-100',
  success: 'border border-emerald-200 bg-emerald-50 text-emerald-700 hover:bg-emerald-100',
};

export function Btn({
  variant = 'primary',
  className = '',
  busy = false,
  children,
  ...props
}: React.ButtonHTMLAttributes<HTMLButtonElement> & { variant?: BtnVariant; busy?: boolean }) {
  return (
    <button
      {...props}
      disabled={props.disabled || busy}
      className={`btn-flash min-h-11 disabled:cursor-not-allowed disabled:opacity-60 ${BTN_VARIANT[variant]} ${className}`}
    >
      {busy && (
        <span
          aria-hidden
          className="h-3.5 w-3.5 shrink-0 animate-spin rounded-full border-2 border-current border-t-transparent"
        />
      )}
      {children}
    </button>
  );
}

/* --------------------------------- modal --------------------------------- */

export function Modal({
  open,
  title,
  onClose,
  children,
  footer,
  wide = false,
}: {
  open: boolean;
  title: string;
  onClose: () => void;
  children: React.ReactNode;
  footer?: React.ReactNode;
  wide?: boolean;
}) {
  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    document.addEventListener('keydown', onKey);
    const prev = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    return () => {
      document.removeEventListener('keydown', onKey);
      document.body.style.overflow = prev;
    };
  }, [open, onClose]);

  if (!open) return null;
  return (
    <div className="fixed inset-0 z-[200] flex items-end justify-center sm:items-center" role="dialog" aria-modal="true">
      <button
        aria-label="Close"
        onClick={onClose}
        className="absolute inset-0 bg-ink/50 backdrop-blur-[2px]"
      />
      <div
        className={`relative flex max-h-[92dvh] w-full flex-col overflow-hidden rounded-t-3xl bg-white shadow-2xl sm:rounded-3xl ${
          wide ? 'sm:max-w-3xl' : 'sm:max-w-lg'
        }`}
      >
        <header className="flex shrink-0 items-center justify-between gap-3 border-b border-line px-4 py-3.5 sm:px-6">
          <h2 className="text-sm font-extrabold text-ink sm:text-base">{title}</h2>
          <button
            onClick={onClose}
            aria-label="Close dialog"
            className="grid h-11 w-11 shrink-0 place-items-center rounded-lg text-xl leading-none text-muted hover:bg-surface-2"
          >
            &times;
          </button>
        </header>
        <div className="min-h-0 flex-1 overflow-y-auto p-4 sm:p-6">{children}</div>
        {footer && (
          <footer className="flex shrink-0 flex-wrap items-center justify-end gap-2 border-t border-line bg-surface px-4 py-3 pb-[calc(0.75rem+env(safe-area-inset-bottom))] sm:px-6">
            {footer}
          </footer>
        )}
      </div>
    </div>
  );
}

/* ------------------------------ status blocks ------------------------------ */

export function Loading({ label = 'Loading' }: { label?: string }) {
  return (
    <div className="flex items-center justify-center gap-2.5 py-12 text-sm text-muted">
      <span aria-hidden className="h-4 w-4 animate-spin rounded-full border-2 border-brand border-t-transparent" />
      {label}…
    </div>
  );
}

export function ErrorNote({ message, onRetry }: { message: string; onRetry?: () => void }) {
  return (
    <div className="rounded-2xl border border-red-200 bg-red-50 p-4 text-sm text-red-700">
      <p className="font-bold">{message}</p>
      {onRetry && (
        <Btn variant="danger" className="mt-3" onClick={onRetry}>
          Try again
        </Btn>
      )}
    </div>
  );
}

export function EmptyState({ title, hint }: { title: string; hint?: string }) {
  return (
    <div className="rounded-2xl border border-dashed border-line bg-surface px-4 py-10 text-center">
      <p className="text-sm font-bold text-ink">{title}</p>
      {hint && <p className="mx-auto mt-1 max-w-sm text-xs text-muted">{hint}</p>}
    </div>
  );
}

/* --------------------------------- toast --------------------------------- */

export function useToast() {
  const [message, setMessage] = useState<{ text: string; tone: Tone } | null>(null);

  useEffect(() => {
    if (!message) return;
    const t = setTimeout(() => setMessage(null), 3800);
    return () => clearTimeout(t);
  }, [message]);

  const node = message ? (
    <div
      role="status"
      className="pointer-events-none fixed inset-x-3 bottom-[calc(1rem+env(safe-area-inset-bottom))] z-[300] flex justify-center sm:left-auto sm:right-5 sm:bottom-5 sm:justify-end"
    >
      <div
        className={`pointer-events-auto max-w-sm rounded-2xl border px-4 py-3 text-sm font-semibold shadow-lg ${
          message.tone === 'danger'
            ? 'border-red-200 bg-red-50 text-red-700'
            : message.tone === 'warn'
              ? 'border-amber-200 bg-amber-50 text-amber-800'
              : 'border-emerald-200 bg-emerald-50 text-emerald-800'
        }`}
      >
        {message.text}
      </div>
    </div>
  ) : null;

  return {
    node,
    ok: (text: string) => setMessage({ text, tone: 'success' }),
    err: (text: string) => setMessage({ text, tone: 'danger' }),
    warn: (text: string) => setMessage({ text, tone: 'warn' }),
  };
}
