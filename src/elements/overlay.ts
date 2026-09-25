import { X, createIcon } from '@manthan/icons';
import type { Placement } from '../core/position';
import type { Tone } from '../recipes/shared';
import { closeButton, dialog, menu, popover, tooltip } from '../recipes/overlay';
import { createDialog, type DialogController } from '../dom/dialog';
import { createMenu } from '../dom/menu';
import { createPopover } from '../dom/popover';
import { mountToaster } from '../dom/toaster';
import { createTooltip } from '../dom/tooltip';
import { MnElement, uid } from './base';
import { iconByName } from './simple';

/**
 * `<mn-dialog id="edit" heading="Edit profile" description="…" placement="right">
 *    body… <div slot="footer">buttons</div></mn-dialog>`
 * Open with `el.show()`, the `open` attribute, or any `[data-mn-open="edit"]` button.
 * Buttons with `data-mn-close` inside close it.
 */
export class MnDialogElement extends MnElement {
  static observedAttributes = ['open', 'heading', 'description', 'placement', 'size'];
  readonly dialog = document.createElement('dialog');
  private header = document.createElement('div');
  private titleEl = document.createElement('h2');
  private desc = document.createElement('p');
  private body = document.createElement('div');
  private footer = document.createElement('div');
  private closeBtn = document.createElement('button');
  private controller?: DialogController;
  private id_ = uid('mn-dialog');

  protected override build() {
    this.style.display = 'contents';
    for (const child of Array.from(this.children)) if (child.getAttribute('slot') === 'footer') this.footer.append(child);
    this.adoptChildren(this.body);
    this.titleEl.id = `${this.id_}-title`;
    this.desc.id = `${this.id_}-description`;
    this.header.append(this.titleEl, this.desc);
    this.closeBtn.type = 'button';
    this.closeBtn.setAttribute('aria-label', 'Close');
    this.closeBtn.append(createIcon(X));
    this.closeBtn.addEventListener('click', () => this.close());
    this.dialog.append(this.header, this.body, this.footer, this.closeBtn);
    this.dialog.addEventListener('click', (e) => {
      if ((e.target as Element).closest('[data-mn-close]')) this.close();
    });
    this.append(this.dialog);
  }
  protected override update() {
    const s = dialog({ placement: this.attr('placement') as never, size: this.attr('size') as never });
    this.dialog.className = s.content();
    this.header.className = s.header();
    this.titleEl.className = s.title();
    this.titleEl.textContent = this.attr('heading') ?? '';
    this.desc.className = s.description();
    this.desc.textContent = this.attr('description') ?? '';
    this.header.hidden = !this.attr('heading') && !this.attr('description');
    this.dialog.setAttribute('aria-labelledby', this.titleEl.id);
    this.dialog.setAttribute('aria-describedby', this.desc.id);
    this.body.className = s.body();
    this.footer.className = s.footer();
    this.footer.hidden = !this.footer.childElementCount;
    this.closeBtn.className = closeButton({ class: s.close() });
    if (this.flag('open')) this.controller?.open();
    else this.controller?.close();
  }
  protected override connect() {
    this.controller = createDialog(this.dialog, {
      onOpenChange: (open) => {
        if (open !== this.flag('open')) this.toggleAttribute('open', open);
        this.emit('mn-open-change', { open });
      },
    });
    if (this.flag('open')) this.controller.open();
    return () => this.controller?.destroy();
  }
  show() {
    this.setAttribute('open', '');
  }
  close() {
    this.removeAttribute('open');
  }
}

/** First element child is the trigger: `<mn-tooltip content="Copy"><button>…</button></mn-tooltip>` */
export class MnTooltipElement extends MnElement {
  static observedAttributes = ['content'];
  private tip = document.createElement('div');
  protected override build() {
    this.style.display = 'contents';
    this.tip.className = tooltip();
  }
  protected override update() {
    this.tip.textContent = this.attr('content') ?? '';
  }
  protected override connect() {
    const trigger = this.firstElementChild as HTMLElement | null;
    if (!trigger) return;
    document.body.append(this.tip);
    const ctl = createTooltip({ trigger, content: this.tip, placement: this.attr('placement') as Placement | undefined });
    return () => {
      ctl.destroy();
      this.tip.remove();
    };
  }
}

/** First element child is the trigger; the rest is the panel: `<mn-popover heading="…"><button>…</button>content</mn-popover>` */
export class MnPopoverElement extends MnElement {
  static observedAttributes = ['heading'];
  private panel = document.createElement('div');
  private titleEl = document.createElement('h3');
  protected override build() {
    this.style.display = 'contents';
    const [trigger, ...rest] = Array.from(this.childNodes).filter((n) => n.nodeType !== Node.TEXT_NODE || n.textContent?.trim());
    const s = popover();
    this.panel.className = s.content();
    this.panel.setAttribute('popover', 'auto');
    this.titleEl.className = s.title();
    this.panel.append(this.titleEl, ...rest);
    this.replaceChildren(...(trigger ? [trigger] : []), this.panel);
  }
  protected override update() {
    this.titleEl.textContent = this.attr('heading') ?? '';
    this.titleEl.hidden = !this.attr('heading');
  }
  protected override connect() {
    const trigger = this.firstElementChild as HTMLElement | null;
    if (!trigger || trigger === this.panel) return;
    return createPopover({ trigger: (trigger.querySelector('button') ?? trigger) as HTMLElement, content: this.panel, placement: this.attr('placement') as Placement | undefined }).destroy;
  }
}

/**
 * `<mn-menu><mn-button>Account</mn-button>
 *    <mn-menu-label>ada@example.com</mn-menu-label>
 *    <mn-menu-item value="profile" icon="user" shortcut="⌘P">Profile</mn-menu-item>
 *    <mn-menu-separator></mn-menu-separator>
 *    <mn-menu-item value="logout" tone="danger">Log out</mn-menu-item></mn-menu>`
 * Emits `mn-select` with the item's value.
 */
export class MnMenuElement extends MnElement {
  private panel = document.createElement('div');
  protected override build() {
    this.style.display = 'contents';
    const trigger = this.firstElementChild;
    const s = menu();
    this.panel.className = s.content();
    this.panel.setAttribute('popover', 'auto');
    this.panel.setAttribute('role', 'menu');
    this.panel.tabIndex = -1;
    for (const child of Array.from(this.children)) {
      if (child === trigger) continue;
      const tag = child.tagName.toLowerCase();
      if (tag === 'mn-menu-item') {
        const tone = child.getAttribute('tone') as Tone | null;
        const item = document.createElement('button');
        item.type = 'button';
        item.setAttribute('role', 'menuitem');
        item.tabIndex = -1;
        item.className = (tone ? menu({ tone }) : s).item(tone ? 'text-accent-11' : undefined);
        item.dataset.value = child.getAttribute('value') ?? child.textContent?.trim() ?? '';
        if (child.hasAttribute('disabled')) item.setAttribute('aria-disabled', 'true');
        const icon = iconByName(child.getAttribute('icon'));
        if (icon) item.append(createIcon(icon));
        item.append(...Array.from(child.childNodes));
        if (child.getAttribute('shortcut')) item.append(Object.assign(document.createElement('span'), { className: s.shortcut(), textContent: child.getAttribute('shortcut') }));
        this.panel.append(item);
      } else if (tag === 'mn-menu-label') {
        this.panel.append(Object.assign(document.createElement('div'), { className: s.label(), textContent: child.textContent }));
      } else if (tag === 'mn-menu-separator') {
        const sep = Object.assign(document.createElement('div'), { className: s.separator() });
        sep.setAttribute('role', 'separator');
        this.panel.append(sep);
      }
      child.remove();
    }
    this.panel.addEventListener('click', (e) => {
      const item = (e.target as Element).closest<HTMLElement>('[role=menuitem]');
      if (item && item.getAttribute('aria-disabled') !== 'true') this.emit('mn-select', { value: item.dataset.value });
    });
    this.append(this.panel);
  }
  protected override connect() {
    const trigger = this.firstElementChild as HTMLElement | null;
    if (!trigger || trigger === this.panel) return;
    return createMenu({ trigger: (trigger.querySelector('button') ?? trigger) as HTMLElement, content: this.panel, placement: this.attr('placement') as Placement | undefined }).destroy;
  }
}

/** `<mn-toaster placement="top-right"></mn-toaster>`; then `toast.success('Saved')` from `@manthan/base`. */
export class MnToasterElement extends MnElement {
  protected override connect() {
    this.style.display = 'contents';
    return mountToaster({ container: this, placement: (this.attr('placement') as never) ?? 'bottom-right' });
  }
}
