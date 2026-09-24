import type { PositionOptions } from '../core/position';
import { autoPosition } from './floating';
import { ensureId, getFocusable, hidePopover, isPopoverOpen, on, showPopover, type Cleanup } from './utils';

export interface PopoverControllerOptions extends PositionOptions {
  trigger: HTMLElement;
  content: HTMLElement;
  /** Move focus into the content when it opens. @default true */
  autoFocus?: boolean;
  /** ARIA role of the content. @default 'dialog' */
  role?: string;
  onOpenChange?: (open: boolean) => void;
}

export interface PopoverController {
  open(): void;
  close(): void;
  toggle(): void;
  isOpen(): boolean;
  destroy(): void;
}

/**
 * Anchored floating panel built on the native Popover API: top layer, light dismiss,
 * Escape and focus return come from the platform; this adds positioning and ARIA.
 */
export function createPopover(options: PopoverControllerOptions): PopoverController {
  const { trigger, content, autoFocus = true, role = 'dialog', onOpenChange, ...position } = options;
  const id = ensureId(content, 'mn-popover');
  if (!content.hasAttribute('popover')) content.setAttribute('popover', 'auto');
  if (!content.hasAttribute('role')) content.setAttribute('role', role);
  if (!content.hasAttribute('tabindex')) content.tabIndex = -1;
  trigger.setAttribute('popovertarget', id);
  trigger.setAttribute('aria-controls', id);
  trigger.setAttribute('aria-haspopup', role === 'menu' ? 'menu' : 'dialog');
  trigger.setAttribute('aria-expanded', 'false');

  let stopPositioning: Cleanup | undefined;

  const onToggle = (event: Event) => {
    const open = (event as ToggleEvent).newState === 'open';
    trigger.setAttribute('aria-expanded', String(open));
    content.dataset.state = open ? 'open' : 'closed';
    if (open) {
      stopPositioning?.();
      stopPositioning = autoPosition(trigger, content, { placement: 'bottom-start', ...position });
      if (autoFocus && !content.contains(document.activeElement)) (getFocusable(content)[0] ?? content).focus({ preventScroll: true });
    } else {
      stopPositioning?.();
      stopPositioning = undefined;
      const active = document.activeElement;
      if (!active || active === document.body || content.contains(active)) trigger.focus({ preventScroll: true });
    }
    onOpenChange?.(open);
  };

  const cleanups: Cleanup[] = [on(content, 'toggle', onToggle)];
  // Fallback click handling when the Popover API (and popovertarget) is unavailable.
  if (typeof HTMLElement.prototype.showPopover !== 'function') {
    cleanups.push(on(trigger, 'click', () => (isPopoverOpen(content) ? hidePopover(content) : showPopover(content))));
  }

  return {
    open: () => showPopover(content),
    close: () => hidePopover(content),
    toggle: () => (isPopoverOpen(content) ? hidePopover(content) : showPopover(content)),
    isOpen: () => isPopoverOpen(content),
    destroy: () => {
      stopPositioning?.();
      cleanups.forEach((c) => c());
    },
  };
}
