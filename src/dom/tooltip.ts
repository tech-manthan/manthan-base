import type { PositionOptions } from '../core/position';
import { applyPosition } from './floating';
import { ensureId, hidePopover, isPopoverOpen, on, showPopover, type Cleanup } from './utils';

export interface TooltipControllerOptions extends PositionOptions {
  trigger: HTMLElement;
  content: HTMLElement;
  /** @default 500 */
  openDelay?: number;
  /** @default 100 */
  closeDelay?: number;
  onOpenChange?: (open: boolean) => void;
}

export interface TooltipController {
  open(): void;
  close(): void;
  destroy(): void;
}

// Once one tooltip has been shown, neighbours open instantly (like native OS tooltips).
let warmUntil = 0;

export function createTooltip(options: TooltipControllerOptions): TooltipController {
  const { trigger, content, openDelay = 500, closeDelay = 100, onOpenChange, ...position } = options;
  const id = ensureId(content, 'mn-tooltip');
  if (!content.hasAttribute('popover')) content.setAttribute('popover', 'manual');
  content.setAttribute('role', 'tooltip');
  const describedBy = new Set((trigger.getAttribute('aria-describedby') ?? '').split(' ').filter(Boolean));
  describedBy.add(id);
  trigger.setAttribute('aria-describedby', [...describedBy].join(' '));

  let timer: ReturnType<typeof setTimeout> | undefined;

  const open = () => {
    clearTimeout(timer);
    if (isPopoverOpen(content)) return;
    showPopover(content);
    applyPosition(trigger, content, { placement: 'top', offset: 6, ...position });
    content.dataset.state = 'open';
    onOpenChange?.(true);
  };
  const close = () => {
    clearTimeout(timer);
    if (!isPopoverOpen(content)) return;
    warmUntil = Date.now() + 400;
    hidePopover(content);
    content.dataset.state = 'closed';
    onOpenChange?.(false);
  };
  const scheduleOpen = () => {
    clearTimeout(timer);
    if (Date.now() < warmUntil) open();
    else timer = setTimeout(open, openDelay);
  };
  const scheduleClose = () => {
    clearTimeout(timer);
    timer = setTimeout(close, closeDelay);
  };

  const cleanups: Cleanup[] = [
    on(trigger, 'pointerenter', (e) => e.pointerType !== 'touch' && scheduleOpen()),
    on(trigger, 'pointerleave', scheduleClose),
    on(trigger, 'focusin', () => {
      if (trigger.matches(':focus-visible') || trigger.querySelector(':focus-visible')) open();
    }),
    on(trigger, 'focusout', close),
    on(trigger, 'pointerdown', close),
    on(document, 'keydown', (e) => e.key === 'Escape' && close()),
  ];

  return {
    open,
    close,
    destroy: () => {
      clearTimeout(timer);
      close();
      cleanups.forEach((c) => c());
    },
  };
}
