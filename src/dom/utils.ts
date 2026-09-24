export const supportsPopover = (): boolean =>
  typeof HTMLElement !== 'undefined' && typeof HTMLElement.prototype.showPopover === 'function';

export function isPopoverOpen(el: HTMLElement): boolean {
  if (!supportsPopover()) return el.hasAttribute('data-open');
  try {
    return el.matches(':popover-open');
  } catch {
    return el.hasAttribute('data-open');
  }
}

/** showPopover() with a fallback for environments without the Popover API (old browsers, jsdom). */
export function showPopover(el: HTMLElement): void {
  if (isPopoverOpen(el)) return;
  if (supportsPopover() && el.hasAttribute('popover')) {
    el.showPopover();
  } else {
    el.setAttribute('data-open', '');
    el.hidden = false;
    el.dispatchEvent(Object.assign(new Event('toggle'), { newState: 'open', oldState: 'closed' }));
  }
}

export function hidePopover(el: HTMLElement): void {
  if (!isPopoverOpen(el)) return;
  if (supportsPopover() && el.hasAttribute('popover')) {
    el.hidePopover();
  } else {
    el.removeAttribute('data-open');
    el.hidden = true;
    el.dispatchEvent(Object.assign(new Event('toggle'), { newState: 'closed', oldState: 'open' }));
  }
}

export function ensureId(el: HTMLElement, prefix: string): string {
  if (!el.id) el.id = `${prefix}-${Math.random().toString(36).slice(2, 9)}`;
  return el.id;
}

const FOCUSABLE =
  'a[href],area[href],button:not([disabled]),input:not([disabled]):not([type=hidden]),select:not([disabled]),textarea:not([disabled]),[tabindex]:not([tabindex="-1"]),[contenteditable="true"]';

export function getFocusable(root: ParentNode): HTMLElement[] {
  return Array.from(root.querySelectorAll<HTMLElement>(FOCUSABLE)).filter((el) => !el.closest('[inert],[hidden]'));
}

export const isRtl = (el: Element) => getComputedStyle(el).direction === 'rtl';

export type Cleanup = () => void;

export function on<K extends keyof HTMLElementEventMap>(
  target: HTMLElement | Document | Window,
  type: K,
  handler: (event: HTMLElementEventMap[K]) => void,
  options?: AddEventListenerOptions,
): Cleanup {
  target.addEventListener(type, handler as EventListener, options);
  return () => target.removeEventListener(type, handler as EventListener, options);
}
