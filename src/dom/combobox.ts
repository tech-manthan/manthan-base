import { filterOptions } from '../core/options';
import type { PositionOptions } from '../core/position';
import { autoPosition } from './floating';
import { ensureId, hidePopover, isPopoverOpen, on, showPopover, type Cleanup } from './utils';

export interface ComboboxControllerOptions extends PositionOptions {
  input: HTMLInputElement;
  listbox: HTMLElement;
  /** Element the listbox aligns with. @default input */
  anchor?: HTMLElement;
  /** Called with the chosen option's `data-value`. */
  onSelect?: (value: string, option: HTMLElement) => void;
  onOpenChange?: (open: boolean) => void;
  /** Open the list when the input is focused. @default false */
  openOnFocus?: boolean;
  /** List is always visible (command palettes); no popover. @default false */
  inline?: boolean;
  /**
   * Filter options in the DOM (vanilla use). Frameworks leave this off and
   * render only matching options themselves. @default false
   */
  filter?: boolean;
}

export interface ComboboxController {
  open(): void;
  close(): void;
  isOpen(): boolean;
  /** Highlight the first enabled option. */
  highlightFirst(): void;
  destroy(): void;
}

const OPTION = '[role="option"]';

/**
 * WAI-ARIA combobox with a listbox popup (editable, list autocomplete).
 * Focus stays in the input; the active option is exposed via aria-activedescendant.
 */
export function createCombobox(options: ComboboxControllerOptions): ComboboxController {
  const { input, listbox, anchor = input, onSelect, onOpenChange, openOnFocus = false, inline = false, filter = false, ...position } = options;
  const listId = ensureId(listbox, 'mn-listbox');
  listbox.setAttribute('role', 'listbox');
  if (!inline && !listbox.hasAttribute('popover')) listbox.setAttribute('popover', 'manual');
  input.setAttribute('role', 'combobox');
  input.setAttribute('aria-autocomplete', 'list');
  input.setAttribute('aria-controls', listId);
  input.setAttribute('aria-expanded', String(inline));
  input.setAttribute('autocomplete', 'off');

  let stopPositioning: Cleanup | undefined;
  let highlighted: HTMLElement | null = null;

  const visibleOptions = () =>
    Array.from(listbox.querySelectorAll<HTMLElement>(OPTION)).filter((el) => !el.hidden && !el.closest('[hidden]'));
  const enabled = (el: HTMLElement) => el.getAttribute('aria-disabled') !== 'true';
  const isOpen = () => inline || isPopoverOpen(listbox);

  const highlight = (el: HTMLElement | null, scroll = true) => {
    if (highlighted && highlighted !== el) highlighted.removeAttribute('data-highlighted');
    highlighted = el;
    if (el) {
      el.setAttribute('data-highlighted', '');
      input.setAttribute('aria-activedescendant', ensureId(el, 'mn-option'));
      if (scroll) el.scrollIntoView?.({ block: 'nearest' });
    } else {
      input.removeAttribute('aria-activedescendant');
    }
  };
  const highlightFirst = () => {
    const list = visibleOptions();
    const selected = list.find((el) => el.getAttribute('aria-selected') === 'true' && enabled(el));
    highlight(selected ?? list.find(enabled) ?? null, false);
  };
  const move = (step: 1 | -1) => {
    const list = visibleOptions().filter(enabled);
    if (!list.length) return;
    const index = highlighted ? list.indexOf(highlighted) : -1;
    const next = index < 0 ? (step === 1 ? 0 : list.length - 1) : (index + step + list.length) % list.length;
    highlight(list[next]!);
  };

  const applyFilter = () => {
    if (!filter) return;
    const items = Array.from(listbox.querySelectorAll<HTMLElement>(OPTION));
    const matches = new Set(
      filterOptions(
        items.map((el) => ({ value: el.dataset.value ?? '', label: el.textContent ?? '', keywords: el.dataset.keywords?.split(' '), el })),
        input.value,
      ).map((o) => o.el),
    );
    for (const el of items) el.hidden = !matches.has(el);
    listbox.querySelectorAll<HTMLElement>('[role="group"]').forEach((group) => {
      group.hidden = !group.querySelector(`${OPTION}:not([hidden])`);
    });
    const empty = listbox.querySelector<HTMLElement>('[data-empty]');
    if (empty) empty.hidden = matches.size > 0;
  };

  const open = () => {
    if (inline || isOpen()) return;
    showPopover(listbox);
    input.setAttribute('aria-expanded', 'true');
    stopPositioning = autoPosition(anchor, listbox, { placement: 'bottom-start', offset: 4, ...position });
    highlightFirst();
    onOpenChange?.(true);
  };
  const close = () => {
    if (inline || !isOpen()) return;
    hidePopover(listbox);
    stopPositioning?.();
    input.setAttribute('aria-expanded', 'false');
    highlight(null);
    onOpenChange?.(false);
  };
  const choose = (el: HTMLElement) => {
    if (!enabled(el)) return;
    onSelect?.(el.dataset.value ?? el.textContent ?? '', el);
    if (!inline) close();
  };

  // Frameworks re-render the option list as the query changes: keep a valid highlight.
  const observer =
    typeof MutationObserver === 'function'
      ? new MutationObserver(() => {
          if (!isOpen()) return;
          if (!highlighted || !listbox.contains(highlighted) || highlighted.hidden) highlightFirst();
        })
      : undefined;
  observer?.observe(listbox, { childList: true, subtree: true, attributes: true, attributeFilter: ['hidden'] });

  const cleanups: Cleanup[] = [
    on(input, 'input', () => {
      applyFilter();
      open();
      highlightFirst();
    }),
    on(input, 'focus', () => openOnFocus && open()),
    on(input, 'click', () => openOnFocus && open()),
    on(input, 'blur', () => close()),
    on(input, 'keydown', (event) => {
      switch (event.key) {
        case 'ArrowDown':
          event.preventDefault();
          if (!isOpen()) open();
          else if (event.altKey) return;
          else move(1);
          break;
        case 'ArrowUp':
          event.preventDefault();
          if (!isOpen()) {
            open();
            move(-1);
          } else move(-1);
          break;
        case 'Enter':
          if (isOpen() && highlighted) {
            event.preventDefault();
            choose(highlighted);
          }
          break;
        case 'Escape':
          if (!inline && isOpen()) {
            event.preventDefault();
            event.stopPropagation();
            close();
          }
          break;
        case 'Tab':
          close();
          break;
      }
    }),
    // Keep focus in the input while clicking options.
    on(listbox, 'pointerdown', (event) => event.preventDefault()),
    on(listbox, 'click', (event) => {
      const el = (event.target as Element).closest<HTMLElement>(OPTION);
      if (el && listbox.contains(el)) choose(el);
    }),
    on(listbox, 'pointermove', (event) => {
      const el = (event.target as Element).closest<HTMLElement>(OPTION);
      if (el && el !== highlighted && enabled(el)) highlight(el, false);
    }),
  ];
  if (inline) {
    applyFilter();
    highlightFirst();
  }

  return {
    open,
    close,
    isOpen,
    highlightFirst,
    destroy: () => {
      observer?.disconnect();
      stopPositioning?.();
      cleanups.forEach((c) => c());
    },
  };
}
