import { getNextIndex, type Orientation } from '../core/keyboard';
import { isRtl, on, type Cleanup } from './utils';

export interface RovingFocusOptions {
  /** Items that take part. @default 'button:not([disabled])' */
  selector?: string;
  orientation?: Orientation;
  loop?: boolean;
}

/**
 * Roving tabindex for toolbars and toggle groups: one Tab stop for the group,
 * arrow keys move between items.
 */
export function createRovingFocus(container: HTMLElement, options: RovingFocusOptions = {}): { refresh(): void; destroy(): void } {
  const { selector = 'button', orientation = 'horizontal', loop = true } = options;
  const items = () => Array.from(container.querySelectorAll<HTMLElement>(selector));
  const disabled = (el: HTMLElement) => el.hasAttribute('disabled') || el.getAttribute('aria-disabled') === 'true';

  const setCurrent = (current: HTMLElement | undefined) => {
    for (const el of items()) el.tabIndex = el === current ? 0 : -1;
  };
  const refresh = () => {
    const list = items();
    if (list.some((el) => el.tabIndex === 0 && !disabled(el))) return;
    setCurrent(list.find((el) => el.getAttribute('aria-pressed') === 'true' && !disabled(el)) ?? list.find((el) => !disabled(el)));
  };
  refresh();

  const cleanups: Cleanup[] = [
    on(container, 'focusin', (event) => {
      const el = (event.target as Element).closest<HTMLElement>(selector);
      if (el && container.contains(el)) setCurrent(el);
    }),
    on(container, 'keydown', (event) => {
      const list = items();
      const current = list.indexOf(document.activeElement as HTMLElement);
      if (current < 0) return;
      const next = getNextIndex(event.key, current, list.length, {
        orientation,
        loop,
        dir: isRtl(container) ? 'rtl' : 'ltr',
        isDisabled: (i) => disabled(list[i]!),
      });
      if (next === null) return;
      event.preventDefault();
      list[next]!.focus();
    }),
  ];
  return { refresh, destroy: () => cleanups.forEach((c) => c()) };
}
