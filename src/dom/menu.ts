import { createTypeahead, getNextIndex } from '../core/keyboard';
import type { PositionOptions } from '../core/position';
import { createPopover, type PopoverController } from './popover';
import { isPopoverOpen, on, showPopover, type Cleanup } from './utils';

export interface MenuControllerOptions extends PositionOptions {
  trigger: HTMLElement;
  content: HTMLElement;
  /** @default true */
  loop?: boolean;
  onOpenChange?: (open: boolean) => void;
}

const ITEM = '[role^="menuitem"]';

/**
 * WAI-ARIA menu button: arrow keys, Home/End, typeahead, Escape, Tab-out,
 * closes on selection (unless the item has `data-keep-open`).
 */
export function createMenu(options: MenuControllerOptions): PopoverController {
  const { trigger, content, loop = true, onOpenChange, ...position } = options;
  let focusLast = false;
  const items = () =>
    Array.from(content.querySelectorAll<HTMLElement>(ITEM)).filter((el) => el.closest('[role="menu"]') === content);
  const enabled = (el: HTMLElement) => el.getAttribute('aria-disabled') !== 'true' && !el.hasAttribute('disabled');
  const typeahead = createTypeahead();

  const focusItem = (index: number) => {
    const list = items();
    list[index]?.focus({ preventScroll: false });
  };

  const popover = createPopover({
    trigger,
    content,
    role: 'menu',
    autoFocus: false,
    placement: 'bottom-start',
    offset: 6,
    ...position,
    onOpenChange: (open) => {
      if (open) {
        const list = items();
        for (const item of list) item.tabIndex = -1;
        const targets = list.map((el, i) => (enabled(el) ? i : -1)).filter((i) => i >= 0);
        const index = focusLast ? targets.at(-1) : targets[0];
        if (index !== undefined) focusItem(index);
        else content.focus();
        focusLast = false;
      }
      onOpenChange?.(open);
    },
  });

  const cleanups: Cleanup[] = [
    on(trigger, 'keydown', (event) => {
      if (event.key !== 'ArrowDown' && event.key !== 'ArrowUp') return;
      event.preventDefault();
      focusLast = event.key === 'ArrowUp';
      if (isPopoverOpen(content)) {
        const list = items();
        focusItem(focusLast ? list.length - 1 : 0);
      } else {
        showPopover(content);
      }
    }),
    on(content, 'keydown', (event) => {
      const list = items();
      const current = list.indexOf(document.activeElement as HTMLElement);
      if (event.key === 'Tab') {
        popover.close();
        return;
      }
      if ((event.key === 'Enter' || event.key === ' ') && current >= 0 && list[current]?.tagName !== 'BUTTON') {
        event.preventDefault();
        list[current]!.click();
        return;
      }
      const next = getNextIndex(event.key, current, list.length, {
        orientation: 'vertical',
        loop,
        isDisabled: (i) => !enabled(list[i]!),
      });
      if (next !== null) {
        event.preventDefault();
        focusItem(next === current && current < 0 ? 0 : next);
        return;
      }
      const match = typeahead(
        event.key,
        list.map((el) => (enabled(el) ? (el.dataset.textValue ?? el.textContent ?? '') : '')),
        current,
      );
      if (match !== null) focusItem(match);
    }),
    on(content, 'pointermove', (event) => {
      const item = (event.target as Element).closest<HTMLElement>(ITEM);
      if (item && enabled(item) && document.activeElement !== item) item.focus({ preventScroll: true });
    }),
    on(content, 'pointerleave', () => {
      if (content.contains(document.activeElement)) content.focus({ preventScroll: true });
    }),
    on(content, 'click', (event) => {
      const item = (event.target as Element).closest<HTMLElement>(ITEM);
      if (!item || !enabled(item) || item.hasAttribute('data-keep-open')) return;
      popover.close();
    }),
  ];

  return {
    ...popover,
    destroy: () => {
      popover.destroy();
      cleanups.forEach((c) => c());
    },
  };
}
