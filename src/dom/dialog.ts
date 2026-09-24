import { on, type Cleanup } from './utils';

export interface DialogControllerOptions {
  /** Close when the backdrop is clicked. @default true */
  closeOnBackdrop?: boolean;
  /** Close on Escape. @default true */
  closeOnEscape?: boolean;
  /** Open as a non-modal dialog (no backdrop, page stays interactive). @default true */
  modal?: boolean;
  onOpenChange?: (open: boolean) => void;
}

export interface DialogController {
  open(): void;
  close(returnValue?: string): void;
  isOpen(): boolean;
  destroy(): void;
}

/**
 * Native <dialog> gives focus trapping, the top layer, inertness and focus
 * restoration for free. This adds backdrop-click and Escape policies.
 */
export function createDialog(dialog: HTMLDialogElement, options: DialogControllerOptions = {}): DialogController {
  const { closeOnBackdrop = true, closeOnEscape = true, modal = true, onOpenChange } = options;
  let pressedBackdrop = false;

  const isBackdrop = (event: MouseEvent) => {
    if (event.target !== dialog) return false;
    const r = dialog.getBoundingClientRect();
    return event.clientX < r.left || event.clientX > r.right || event.clientY < r.top || event.clientY > r.bottom;
  };

  const open = () => {
    if (dialog.open) return;
    if (typeof dialog.showModal === 'function') {
      if (modal) dialog.showModal();
      else dialog.show();
    } else {
      dialog.setAttribute('open', '');
    }
    onOpenChange?.(true);
  };
  const close = (returnValue?: string) => {
    if (!dialog.open) return;
    if (typeof dialog.close === 'function') dialog.close(returnValue);
    else {
      dialog.removeAttribute('open');
      dialog.dispatchEvent(new Event('close'));
    }
  };

  const cleanups: Cleanup[] = [
    on(dialog, 'close', () => onOpenChange?.(false)),
    on(dialog, 'cancel', (event) => {
      if (!closeOnEscape) event.preventDefault();
    }),
    on(dialog, 'pointerdown', (event) => {
      pressedBackdrop = isBackdrop(event);
    }),
    on(dialog, 'click', (event) => {
      if (closeOnBackdrop && pressedBackdrop && isBackdrop(event)) close();
      pressedBackdrop = false;
    }),
  ];

  return { open, close, isOpen: () => dialog.open, destroy: () => cleanups.forEach((c) => c()) };
}
