import { Check, ChevronDown, Minus, createIcon } from '@manthan/icons';
import type { Tone } from '../recipes/shared';
import { checkbox, field, input, inputGroup, select, slider, switchRecipe, textarea } from '../recipes/form';
import { syncSliderFill } from '../dom/auto-init';
import { MnElement, uid } from './base';
import { iconByName } from './simple';

const FORWARDED = ['name', 'value', 'placeholder', 'required', 'disabled', 'readonly', 'autocomplete', 'min', 'max', 'step', 'pattern', 'minlength', 'maxlength', 'inputmode', 'form'];

function forward(from: Element, to: Element, names: string[] = FORWARDED) {
  for (const name of names) {
    const value = from.getAttribute(name);
    if (value === null) to.removeAttribute(name);
    else to.setAttribute(name, value);
  }
}

/** `<mn-field label="Email" description="…" error="…" required>` wraps any control and wires label / aria. */
export class MnFieldElement extends MnElement {
  static observedAttributes = ['label', 'description', 'error', 'required', 'disabled'];
  readonly controlId = uid('mn-field');
  private labelEl = document.createElement('label');
  private descriptionEl = document.createElement('p');
  private errorEl = document.createElement('p');
  protected override build() {
    this.prepend(this.labelEl);
    this.append(this.descriptionEl, this.errorEl);
    this.descriptionEl.id = `${this.controlId}-description`;
    this.errorEl.id = `${this.controlId}-error`;
  }
  protected override update() {
    const s = field({ required: this.flag('required'), disabled: this.flag('disabled') });
    this.setClass(s.root());
    this.labelEl.className = s.label();
    this.labelEl.textContent = this.attr('label') ?? '';
    this.labelEl.hidden = !this.attr('label');
    this.descriptionEl.className = s.description();
    this.descriptionEl.textContent = this.attr('description') ?? '';
    this.descriptionEl.hidden = !this.attr('description');
    this.errorEl.className = s.error();
    this.errorEl.textContent = this.attr('error') ?? '';
    this.errorEl.hidden = !this.attr('error');
    const control = this.querySelector<HTMLElement>('input:not([type=hidden]), select, textarea, button');
    if (control) this.wire(control);
  }
  /** Point the label at `control` and describe it with the description / error. */
  wire(control: HTMLElement) {
    if (!control.id) control.id = this.controlId;
    this.labelEl.htmlFor = control.id;
    const describedBy = [this.attr('description') && this.descriptionEl.id, this.attr('error') && this.errorEl.id].filter(Boolean).join(' ');
    if (describedBy) control.setAttribute('aria-describedby', describedBy);
    else control.removeAttribute('aria-describedby');
    control.setAttribute('aria-invalid', String(!!this.attr('error')));
    if (this.flag('required')) control.setAttribute('required', '');
  }
}

const wireToField = (host: Element, control: HTMLElement) => (host.closest('mn-field') as MnFieldElement | null)?.wire?.(control);

/** `<mn-input name="email" type="email" placeholder="…" start-icon="mail" size="sm">` */
export class MnInputElement extends MnElement {
  static observedAttributes = [...FORWARDED, 'type', 'size', 'start-icon', 'label'];
  readonly control = document.createElement('input');
  private start = document.createElement('span');
  protected override build() {
    this.append(this.start, this.control);
    wireToField(this, this.control);
  }
  protected override update() {
    forward(this, this.control);
    this.control.type = this.attr('type') ?? 'text';
    if (this.attr('label')) this.control.setAttribute('aria-label', this.attr('label')!);
    const icon = iconByName(this.attr('start-icon'));
    const g = inputGroup();
    this.setClass(icon ? g.root() : 'block');
    this.start.className = g.start();
    this.start.hidden = !icon;
    this.start.replaceChildren(...(icon ? [createIcon(icon)] : []));
    this.control.className = input({ size: this.attr('size') as never, withStart: !!icon });
  }
}

/** `<mn-textarea name="bio" resize="auto">` */
export class MnTextareaElement extends MnElement {
  static observedAttributes = [...FORWARDED, 'resize', 'rows'];
  readonly control = document.createElement('textarea');
  protected override build() {
    this.control.value = this.textContent ?? '';
    this.replaceChildren(this.control);
    this.setClass('block');
    wireToField(this, this.control);
  }
  protected override update() {
    forward(this, this.control, [...FORWARDED.filter((n) => n !== 'value'), 'rows']);
    this.control.className = textarea({ resize: this.attr('resize') as never });
  }
}

/** `<mn-select name="plan"><option>Free</option>…</mn-select>` */
export class MnSelectElement extends MnElement {
  static observedAttributes = ['name', 'required', 'disabled', 'size', 'label', 'form'];
  readonly control = document.createElement('select');
  protected override build() {
    this.adoptChildren(this.control);
    const icon = createIcon(ChevronDown);
    this.append(this.control, icon);
    wireToField(this, this.control);
  }
  protected override update() {
    const s = select({ size: this.attr('size') as never });
    this.setClass(s.root());
    this.control.className = s.select();
    this.lastElementChild?.setAttribute('class', s.icon());
    forward(this, this.control, ['name', 'required', 'disabled', 'form']);
    if (this.attr('label')) this.control.setAttribute('aria-label', this.attr('label')!);
  }
  get value() {
    return this.control.value;
  }
  set value(v: string) {
    this.control.value = v;
  }
}

abstract class ChoiceElement extends MnElement {
  static observedAttributes = ['name', 'value', 'checked', 'disabled', 'required', 'label', 'description', 'size', 'tone', 'form'];
  readonly control = document.createElement('input');
  protected root = document.createElement('span');
  protected text = document.createElement('span');
  protected label = document.createElement('label');
  protected override build() {
    this.control.type = 'checkbox';
    this.control.checked = this.flag('checked');
    this.adoptChildren(this.text);
    this.label.append(this.root, this.text);
    this.append(this.label);
    this.style.display = 'contents';
    this.control.addEventListener('change', () => this.emit('mn-change', { checked: this.control.checked }));
  }
  protected override update() {
    forward(this, this.control, ['name', 'value', 'disabled', 'required', 'form']);
    if (!this.text.textContent?.trim() && this.attr('label')) this.text.textContent = this.attr('label')!;
  }
  get checked() {
    return this.control.checked;
  }
  set checked(v: boolean) {
    this.control.checked = v;
  }
}

/** `<mn-checkbox name="terms" checked indeterminate>I agree</mn-checkbox>` */
export class MnCheckboxElement extends ChoiceElement {
  static override observedAttributes = [...ChoiceElement.observedAttributes, 'indeterminate'];
  private controlBox = document.createElement('span');
  protected override build() {
    super.build();
    this.root.append(this.control, this.controlBox);
  }
  protected override update() {
    super.update();
    const s = checkbox({ size: this.attr('size') as never, tone: this.attr('tone') as Tone });
    this.label.className = s.label();
    this.root.className = s.root();
    this.control.className = s.input();
    this.controlBox.className = s.control();
    this.controlBox.replaceChildren(createIcon(Check, { class: s.check(), strokeWidth: 3 }), createIcon(Minus, { class: s.minus(), strokeWidth: 3 }));
    this.text.className = s.text();
    this.control.indeterminate = this.flag('indeterminate');
  }
}

/** `<mn-switch name="wifi" checked>Wi-Fi</mn-switch>` */
export class MnSwitchElement extends ChoiceElement {
  private track = document.createElement('span');
  private thumb = document.createElement('span');
  protected override build() {
    super.build();
    this.control.setAttribute('role', 'switch');
    this.track.append(this.thumb);
    this.root.append(this.control, this.track);
  }
  protected override update() {
    super.update();
    const s = switchRecipe({ size: this.attr('size') as never, tone: this.attr('tone') as Tone });
    this.label.className = s.label();
    this.root.className = s.root();
    this.control.className = s.input();
    this.track.className = s.track();
    this.thumb.className = s.thumb();
  }
}

/** `<mn-slider name="volume" value="40" min="0" max="100" tone="success">` */
export class MnSliderElement extends MnElement {
  static observedAttributes = ['name', 'value', 'min', 'max', 'step', 'disabled', 'size', 'tone', 'label', 'form'];
  readonly control = document.createElement('input');
  protected override build() {
    this.control.type = 'range';
    this.append(this.control);
    this.setClass('block');
    wireToField(this, this.control);
  }
  protected override update() {
    forward(this, this.control, ['name', 'min', 'max', 'step', 'disabled', 'form']);
    if (this.attr('value') !== undefined) this.control.value = this.attr('value')!;
    if (this.attr('label')) this.control.setAttribute('aria-label', this.attr('label')!);
    this.control.className = slider({ size: this.attr('size') as never, tone: this.attr('tone') as Tone });
  }
  protected override connect() {
    return syncSliderFill(this.control);
  }
}
