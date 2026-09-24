import { AlertTriangle, CheckCircle, Info, X, XCircle, createIcon, type IconNode } from '@manthan/icons';
import { toast as defaultToaster, type Toaster, type ToastRecord } from '../core/toast';
import { button } from '../recipes/button';
import { spinner } from '../recipes/feedback';
import { closeButton, toastRecipe } from '../recipes/overlay';

type Placement = 'top-left' | 'top-center' | 'top-right' | 'bottom-left' | 'bottom-center' | 'bottom-right';

export const toastIcons: Partial<Record<NonNullable<ToastRecord['tone']>, IconNode>> = {
  success: CheckCircle,
  danger: XCircle,
  warning: AlertTriangle,
  info: Info,
};

export interface MountToasterOptions {
  toaster?: Toaster;
  placement?: Placement;
  container?: HTMLElement;
  /** Accessible name of the notification region. @default 'Notifications' */
  label?: string;
}

/** Render a toaster with plain DOM (vanilla JS, Web Components, server-rendered apps). */
export function mountToaster(options: MountToasterOptions = {}): () => void {
  const { toaster = defaultToaster, placement = 'bottom-right', container = document.body, label = 'Notifications' } = options;
  const region = document.createElement('section');
  region.setAttribute('aria-label', label);
  region.setAttribute('aria-live', 'polite');
  region.className = toastRecipe({ placement }).region();
  region.addEventListener('pointerenter', () => toaster.pause());
  region.addEventListener('pointerleave', () => toaster.resume());
  container.append(region);
  const nodes = new Map<string, HTMLElement>();

  const render = (t: ToastRecord) => {
    const slots = toastRecipe({ placement, tone: t.tone });
    const el = nodes.get(t.id) ?? document.createElement('div');
    el.className = slots.root();
    el.setAttribute('role', t.tone === 'danger' ? 'alert' : 'status');
    el.dataset.state = t.state;
    el.replaceChildren();
    if (t.loading) {
      const s = document.createElement('span');
      s.className = spinner({ size: 'sm', class: 'mt-0.5 text-accent-11' });
      el.append(s);
    } else if (t.icon !== false && t.tone && toastIcons[t.tone]) {
      el.append(createIcon(toastIcons[t.tone]!, { class: slots.icon() }));
    }
    const content = document.createElement('div');
    content.className = slots.content();
    if (t.title) content.append(Object.assign(document.createElement('div'), { className: slots.title(), textContent: t.title }));
    if (t.description)
      content.append(Object.assign(document.createElement('div'), { className: slots.description(), textContent: t.description }));
    if (t.action) {
      const actions = Object.assign(document.createElement('div'), { className: slots.actions() });
      const action = Object.assign(document.createElement('button'), {
        type: 'button',
        className: button({ size: 'xs', variant: 'soft' }),
        textContent: t.action.label,
      });
      action.addEventListener('click', () => {
        t.action!.onClick();
        toaster.dismiss(t.id);
      });
      actions.append(action);
      content.append(actions);
    }
    const close = Object.assign(document.createElement('button'), {
      type: 'button',
      className: closeButton({ class: slots.close() }),
    });
    close.setAttribute('aria-label', 'Dismiss notification');
    close.append(createIcon(X));
    close.addEventListener('click', () => toaster.dismiss(t.id));
    el.append(content, close);
    return el;
  };

  const sync = () => {
    const list = toaster.getSnapshot();
    const ids = new Set(list.map((t) => t.id));
    for (const [id, node] of nodes) {
      if (!ids.has(id)) {
        node.remove();
        nodes.delete(id);
      }
    }
    for (const t of list) {
      const node = render(t);
      if (!nodes.has(t.id)) {
        nodes.set(t.id, node);
        region.append(node);
      }
    }
  };

  const unsubscribe = toaster.subscribe(sync);
  sync();
  return () => {
    unsubscribe();
    region.remove();
  };
}
