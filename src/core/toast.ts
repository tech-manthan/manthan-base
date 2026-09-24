import type { Tone } from '../recipes/shared';

export interface ToastAction {
  label: string;
  onClick: () => void;
}

export interface ToastOptions {
  id?: string;
  title?: string;
  description?: string;
  tone?: Tone;
  /** Milliseconds before auto-dismiss. `Infinity` keeps it until dismissed. */
  duration?: number;
  action?: ToastAction;
  /** Show the tone icon. @default true */
  icon?: boolean;
  /** Show a spinner instead of the icon (set automatically by `toast.promise`). */
  loading?: boolean;
  onDismiss?: (toast: ToastRecord) => void;
}

export interface ToastRecord extends Omit<ToastOptions, 'id'> {
  id: string;
  state: 'open' | 'closed';
  createdAt: number;
}

export interface ToasterOptions {
  /** @default 5000 */
  duration?: number;
  /** Oldest toasts are dismissed beyond this many. @default 5 */
  max?: number;
  /** Time the exit animation needs before a closed toast is removed. @default 200 */
  removeDelay?: number;
}

export type ToastInput = string | ToastOptions;

export interface ToastStore {
  (input: ToastInput): string;
  show(input: ToastInput): string;
  success(input: ToastInput): string;
  error(input: ToastInput): string;
  warning(input: ToastInput): string;
  info(input: ToastInput): string;
  /** Show a loading toast that resolves into success / error. */
  promise<T>(
    promise: Promise<T>,
    messages: { loading: ToastInput; success: ToastInput | ((value: T) => ToastInput); error: ToastInput | ((error: unknown) => ToastInput) },
  ): Promise<T>;
  update(id: string, options: ToastOptions): void;
  /** Dismiss one toast, or all when no id is given. */
  dismiss(id?: string): void;
  /** Pause / resume every auto-dismiss timer (e.g. while hovering the region). */
  pause(): void;
  resume(): void;
  subscribe(listener: () => void): () => void;
  /** Immutable snapshot; the reference only changes when toasts change (works with `useSyncExternalStore`). */
  getSnapshot(): readonly ToastRecord[];
}

let seed = 0;

/** Framework-agnostic toast store. Every Manthan binding renders it with its own `<Toaster>`. */
export function createToaster(options: ToasterOptions = {}): ToastStore {
  const { duration: defaultDuration = 5000, max = 5, removeDelay = 200 } = options;
  let toasts: readonly ToastRecord[] = [];
  const listeners = new Set<() => void>();
  const timers = new Map<string, { handle?: ReturnType<typeof setTimeout>; remaining: number; startedAt: number }>();
  let paused = false;

  const emit = () => listeners.forEach((l) => l());
  const set = (next: readonly ToastRecord[]) => {
    toasts = next;
    emit();
  };

  const startTimer = (id: string, ms: number) => {
    clearTimer(id);
    if (!Number.isFinite(ms)) return;
    const timer = { remaining: ms, startedAt: Date.now(), handle: undefined as ReturnType<typeof setTimeout> | undefined };
    if (!paused) timer.handle = setTimeout(() => dismiss(id), ms);
    timers.set(id, timer);
  };
  const clearTimer = (id: string) => {
    const t = timers.get(id);
    if (t?.handle) clearTimeout(t.handle);
    timers.delete(id);
  };

  const normalize = (input: ToastInput): ToastOptions => (typeof input === 'string' ? { title: input } : input);

  function show(input: ToastInput, toneOverride?: Tone): string {
    const opts = normalize(input);
    const id = opts.id ?? `toast-${++seed}`;
    const existing = toasts.find((t) => t.id === id);
    const record: ToastRecord = {
      icon: true,
      ...existing,
      ...opts,
      tone: toneOverride ?? opts.tone ?? existing?.tone,
      id,
      state: 'open',
      createdAt: existing?.createdAt ?? Date.now(),
    };
    const next = existing ? toasts.map((t) => (t.id === id ? record : t)) : [...toasts, record];
    const open = next.filter((t) => t.state === 'open');
    set(next);
    startTimer(id, record.duration ?? defaultDuration);
    if (open.length > max) open.slice(0, open.length - max).forEach((t) => dismiss(t.id));
    return id;
  }

  function dismiss(id?: string) {
    const targets = toasts.filter((t) => t.state === 'open' && (id === undefined || t.id === id));
    if (!targets.length) return;
    const ids = new Set(targets.map((t) => t.id));
    ids.forEach(clearTimer);
    set(toasts.map((t) => (ids.has(t.id) ? { ...t, state: 'closed' as const } : t)));
    targets.forEach((t) => t.onDismiss?.(t));
    setTimeout(() => set(toasts.filter((t) => !(ids.has(t.id) && t.state === 'closed'))), removeDelay);
  }

  const toaster = ((input: ToastInput) => show(input)) as ToastStore;
  toaster.show = (input) => show(input);
  toaster.success = (input) => show(input, 'success');
  toaster.error = (input) => show(input, 'danger');
  toaster.warning = (input) => show(input, 'warning');
  toaster.info = (input) => show(input, 'info');
  toaster.update = (id, opts) => {
    if (toasts.some((t) => t.id === id)) show({ ...opts, id });
  };
  toaster.dismiss = dismiss;
  toaster.promise = (promise, messages) => {
    const id = show({ ...normalize(messages.loading), duration: Infinity, loading: true });
    promise.then(
      (value) => {
        const m = typeof messages.success === 'function' ? messages.success(value) : messages.success;
        show({ duration: defaultDuration, ...normalize(m), loading: false, id }, 'success');
      },
      (error) => {
        const m = typeof messages.error === 'function' ? messages.error(error) : messages.error;
        show({ duration: defaultDuration, ...normalize(m), loading: false, id }, 'danger');
      },
    );
    return promise;
  };
  toaster.pause = () => {
    if (paused) return;
    paused = true;
    for (const t of timers.values()) {
      if (t.handle) clearTimeout(t.handle);
      t.remaining -= Date.now() - t.startedAt;
      t.handle = undefined;
    }
  };
  toaster.resume = () => {
    if (!paused) return;
    paused = false;
    for (const [id, t] of timers) {
      t.startedAt = Date.now();
      t.handle = setTimeout(() => dismiss(id), Math.max(0, t.remaining));
    }
  };
  toaster.subscribe = (listener) => {
    listeners.add(listener);
    return () => listeners.delete(listener);
  };
  toaster.getSnapshot = () => toasts;
  return toaster;
}

/** App-wide default toaster: `toast('Saved')`, `toast.success(...)`. */
export const toast = createToaster();
