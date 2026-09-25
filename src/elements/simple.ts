import { createIcon, type IconNode } from '@manthan/icons';
import { icons } from '@manthan/icons/all';
import type { Tone } from '../recipes/shared';
import { button } from '../recipes/button';
import { avatar, badge, card, kbd } from '../recipes/display';
import { alert, progress, skeleton, spinner } from '../recipes/feedback';
import { valueToPercent } from '../core/range';
import { toastIcons } from '../dom/toaster';
import { MnElement } from './base';

export const iconByName = (name?: string | null): IconNode | undefined => (name ? (icons as Record<string, IconNode>)[name] : undefined);

/** `<mn-icon name="check" size="16" label="Done">` */
export class MnIconElement extends MnElement {
  static observedAttributes = ['name', 'size', 'stroke-width', 'label'];
  protected override update() {
    const node = iconByName(this.attr('name'));
    this.style.display = 'contents';
    this.replaceChildren(
      ...(node
        ? [createIcon(node, { size: this.attr('size') ?? 24, strokeWidth: this.attr('stroke-width') ?? 2, title: this.attr('label'), class: this.attr('icon-class') })]
        : []),
    );
  }
}

/** `<mn-button variant="soft" tone="danger" size="sm" icon-only loading type="submit">` — renders a native <button>. */
export class MnButtonElement extends MnElement {
  static observedAttributes = ['variant', 'size', 'tone', 'icon-only', 'full-width', 'loading', 'disabled', 'type', 'name', 'value'];
  readonly control = document.createElement('button');
  private spinnerEl = document.createElement('span');
  protected override build() {
    this.style.display = 'contents';
    this.spinnerEl.className = spinner({ size: 'sm' });
    this.spinnerEl.setAttribute('aria-hidden', 'true');
    this.adoptChildren(this.control);
    this.append(this.control);
  }
  protected override update() {
    const b = this.control;
    const loading = this.flag('loading');
    b.type = (this.attr('type') as 'button' | 'submit' | 'reset') ?? 'button';
    b.className = button({
      variant: this.attr('variant') as never,
      size: this.attr('size') as never,
      tone: this.attr('tone') as Tone,
      iconOnly: this.flag('icon-only'),
      fullWidth: this.flag('full-width'),
    });
    b.disabled = this.flag('disabled') || loading;
    if (this.attr('name')) b.name = this.attr('name')!;
    if (this.attr('value')) b.value = this.attr('value')!;
    if (this.attr('label')) b.setAttribute('aria-label', this.attr('label')!);
    b.toggleAttribute('aria-busy', loading);
    if (loading && !this.spinnerEl.isConnected) b.prepend(this.spinnerEl);
    if (!loading) this.spinnerEl.remove();
  }
}

/** `<mn-badge variant="solid" tone="success">` */
export class MnBadgeElement extends MnElement {
  static observedAttributes = ['variant', 'size', 'tone'];
  protected override update() {
    this.setClass(badge({ variant: this.attr('variant') as never, size: this.attr('size') as never, tone: this.attr('tone') as Tone }));
  }
}

/** `<mn-kbd>⌘</mn-kbd>` */
export class MnKbdElement extends MnElement {
  protected override update() {
    this.setClass(kbd());
  }
}

/** `<mn-card size="lg" variant="outline" interactive>` — children are the card body. */
export class MnCardElement extends MnElement {
  static observedAttributes = ['variant', 'size', 'interactive', 'heading', 'description'];
  private header = document.createElement('div');
  protected override build() {
    this.prepend(this.header);
  }
  protected override update() {
    const s = card({ variant: this.attr('variant') as never, size: this.attr('size') as never, interactive: this.flag('interactive') });
    this.setClass(s.root());
    this.tabIndex = this.flag('interactive') ? 0 : -1;
    if (!this.flag('interactive')) this.removeAttribute('tabindex');
    this.header.className = s.header();
    this.header.replaceChildren();
    if (this.attr('heading')) this.header.append(Object.assign(document.createElement('h3'), { className: s.title(), textContent: this.attr('heading') }));
    if (this.attr('description')) this.header.append(Object.assign(document.createElement('p'), { className: s.description(), textContent: this.attr('description') }));
    this.header.hidden = !this.header.childElementCount;
  }
}

/** `<mn-alert tone="warning" variant="surface" heading="Heads up">Body</mn-alert>` */
export class MnAlertElement extends MnElement {
  static observedAttributes = ['tone', 'variant', 'heading', 'icon'];
  private iconSlot = document.createElement('span');
  private content = document.createElement('div');
  private titleEl = document.createElement('div');
  private body = document.createElement('div');
  protected override build() {
    this.setAttribute('role', 'alert');
    this.adoptChildren(this.body);
    this.content.append(this.titleEl, this.body);
    this.append(this.iconSlot, this.content);
  }
  protected override update() {
    const tone = (this.attr('tone') as Tone) ?? 'info';
    const s = alert({ tone, variant: this.attr('variant') as never });
    this.setClass(s.root());
    this.iconSlot.style.display = 'contents';
    const node = this.attr('icon') === 'none' ? undefined : (iconByName(this.attr('icon')) ?? toastIcons[tone]);
    this.iconSlot.replaceChildren(...(node ? [createIcon(node, { class: s.icon() })] : []));
    this.content.className = s.content();
    this.titleEl.className = s.title();
    this.titleEl.textContent = this.attr('heading') ?? '';
    this.titleEl.hidden = !this.attr('heading');
    this.body.className = s.description();
  }
}

/** `<mn-progress value="40" max="100" tone="success" size="sm">` or `indeterminate` */
export class MnProgressElement extends MnElement {
  static observedAttributes = ['value', 'max', 'indeterminate', 'size', 'tone'];
  private bar = document.createElement('div');
  protected override build() {
    this.setAttribute('role', 'progressbar');
    this.append(this.bar);
  }
  protected override update() {
    const indeterminate = this.flag('indeterminate');
    const max = Number(this.attr('max') ?? 100);
    const value = Number(this.attr('value') ?? 0);
    const s = progress({ size: this.attr('size') as never, tone: this.attr('tone') as Tone, indeterminate });
    this.setClass(`block ${s.root()}`);
    this.bar.className = s.indicator();
    this.setAttribute('aria-valuemin', '0');
    this.setAttribute('aria-valuemax', String(max));
    if (indeterminate) this.removeAttribute('aria-valuenow');
    else this.setAttribute('aria-valuenow', String(value));
    this.bar.style.translate = indeterminate ? '' : `-${100 - valueToPercent(value, 0, max)}% 0`;
  }
}

/** `<mn-spinner size="sm" tone="primary" label="Saving">` */
export class MnSpinnerElement extends MnElement {
  static observedAttributes = ['size', 'tone', 'label'];
  protected override update() {
    this.setAttribute('role', 'status');
    this.setAttribute('aria-label', this.attr('label') ?? 'Loading');
    this.setClass(spinner({ size: this.attr('size') as never, tone: (this.attr('tone') as Tone) ?? 'current' }));
  }
}

/** `<mn-skeleton shape="text">` */
export class MnSkeletonElement extends MnElement {
  static observedAttributes = ['shape'];
  protected override update() {
    this.setAttribute('aria-hidden', 'true');
    this.setClass(skeleton({ shape: this.attr('shape') as never }));
  }
}

/** `<mn-avatar src="…" alt="Grace Hopper" size="lg">` (initials fallback) */
export class MnAvatarElement extends MnElement {
  static observedAttributes = ['src', 'alt', 'size', 'shape', 'tone', 'fallback'];
  protected override update() {
    const s = avatar({ size: this.attr('size') as never, shape: this.attr('shape') as never, tone: this.attr('tone') as Tone });
    this.setClass(s.root());
    const alt = this.attr('alt') ?? '';
    const fallback = () => {
      const span = Object.assign(document.createElement('span'), {
        className: s.fallback(),
        textContent: this.attr('fallback') ?? alt.split(/\s+/).filter(Boolean).slice(0, 2).map((w) => w[0]!.toUpperCase()).join(''),
      });
      if (alt) {
        span.setAttribute('role', 'img');
        span.setAttribute('aria-label', alt);
      }
      return span;
    };
    const src = this.attr('src');
    if (!src) return void this.replaceChildren(fallback());
    const img = Object.assign(document.createElement('img'), { src, alt, className: s.image() });
    img.addEventListener('error', () => img.replaceWith(fallback()), { once: true });
    this.replaceChildren(img);
  }
}
