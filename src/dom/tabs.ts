import { getNextIndex } from '../core/keyboard';
import { isRtl, on, type Cleanup } from './utils';

export interface TabsControllerOptions {
  orientation?: 'horizontal' | 'vertical';
  /** `automatic` selects a tab as soon as it receives focus. @default 'automatic' */
  activation?: 'automatic' | 'manual';
  /** @default true */
  loop?: boolean;
  /**
   * Let the controller own aria-selected / tabindex / panel visibility.
   * Frameworks leave this off and render state themselves. @default false
   */
  manage?: boolean;
  onChange?: (tab: HTMLElement, index: number) => void;
}

export interface TabsController {
  select(index: number): void;
  destroy(): void;
}

/** Keyboard behaviour (and optionally state) for a WAI-ARIA tablist. */
export function createTabs(list: HTMLElement, options: TabsControllerOptions = {}): TabsController {
  const { orientation = 'horizontal', activation = 'automatic', loop = true, manage = false, onChange } = options;
  const tabs = () =>
    Array.from(list.querySelectorAll<HTMLElement>('[role="tab"]')).filter((t) => t.closest('[role="tablist"]') === list);
  const disabled = (t: HTMLElement) => t.hasAttribute('disabled') || t.getAttribute('aria-disabled') === 'true';

  const select = (index: number) => {
    const all = tabs();
    const tab = all[index];
    if (!tab || disabled(tab)) return;
    if (manage) {
      all.forEach((t, i) => {
        const selected = i === index;
        t.setAttribute('aria-selected', String(selected));
        t.tabIndex = selected ? 0 : -1;
        const panel = t.getAttribute('aria-controls');
        const el = panel ? document.getElementById(panel) : null;
        if (el) el.hidden = !selected;
      });
    }
    onChange?.(tab, index);
  };

  if (manage) {
    const all = tabs();
    const initial = all.findIndex((t) => t.getAttribute('aria-selected') === 'true');
    select(initial >= 0 ? initial : 0);
  }

  const cleanups: Cleanup[] = [
    on(list, 'keydown', (event) => {
      const all = tabs();
      const current = all.indexOf(document.activeElement as HTMLElement);
      if (current < 0) return;
      if (activation === 'manual' && (event.key === 'Enter' || event.key === ' ')) {
        event.preventDefault();
        if (manage) select(current);
        else all[current]!.click();
        return;
      }
      const next = getNextIndex(event.key, current, all.length, {
        orientation,
        loop,
        dir: isRtl(list) ? 'rtl' : 'ltr',
        isDisabled: (i) => disabled(all[i]!),
      });
      if (next === null) return;
      event.preventDefault();
      all[next]!.focus();
      if (activation === 'automatic') {
        if (manage) select(next);
        else all[next]!.click();
      }
    }),
  ];
  if (manage) {
    cleanups.push(
      on(list, 'click', (event) => {
        const tab = (event.target as Element).closest<HTMLElement>('[role="tab"]');
        if (tab) select(tabs().indexOf(tab));
      }),
    );
  }

  return { select, destroy: () => cleanups.forEach((c) => c()) };
}
