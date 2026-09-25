import { ChevronsUpDown, Check, Search, createIcon } from '@manthan/icons';
import type { ColumnDef } from '../core/table';
import type { ListOption } from '../core/options';
import { formatHotkey } from '../core/hotkey';
import { combobox, command, commandDialog } from '../recipes/advanced';
import { input } from '../recipes/form';
import { tabs } from '../recipes/navigation';
import { createCalendar, type CalendarController } from '../dom/calendar';
import { createCombobox } from '../dom/combobox';
import { createDataTable, type DataTableController } from '../dom/data-table';
import { createDatePicker } from '../dom/date-picker';
import { createDialog } from '../dom/dialog';
import { onHotkey } from '../dom/hotkey';
import { createTabs } from '../dom/tabs';
import { MnElement, uid } from './base';

/** Read `<option>` / `<optgroup>` children as list options. */
function readOptions(host: Element): ListOption[] {
  const options: ListOption[] = [];
  for (const el of Array.from(host.querySelectorAll('option'))) {
    const group = el.parentElement?.tagName === 'OPTGROUP' ? (el.parentElement as HTMLOptGroupElement).label : undefined;
    options.push({
      value: el.value,
      label: el.label || el.textContent?.trim() || el.value,
      group,
      disabled: el.disabled,
      keywords: el.dataset.keywords?.split(' '),
      shortcut: el.dataset.shortcut,
    });
  }
  return options;
}

function renderOptions(list: HTMLElement, options: ListOption[], optionClass: (o: ListOption) => string, groupLabelClass: string, extra?: (o: ListOption, el: HTMLElement) => void) {
  const groups = new Map<string, ListOption[]>();
  for (const o of options) {
    const key = o.group ?? '';
    if (!groups.has(key)) groups.set(key, []);
    groups.get(key)!.push(o);
  }
  for (const [group, items] of groups) {
    const wrap = document.createElement('div');
    if (group) {
      wrap.setAttribute('role', 'group');
      wrap.setAttribute('aria-label', group);
      wrap.append(Object.assign(document.createElement('div'), { className: groupLabelClass, textContent: group }));
    }
    for (const o of items) {
      const el = document.createElement('div');
      el.setAttribute('role', 'option');
      el.dataset.value = o.value;
      el.dataset.label = o.label;
      if (o.keywords) el.dataset.keywords = o.keywords.join(' ');
      if (o.disabled) el.setAttribute('aria-disabled', 'true');
      el.className = optionClass(o);
      el.append(o.label);
      extra?.(o, el);
      wrap.append(el);
    }
    list.append(wrap);
  }
}

/**
 * `<mn-tabs value="a" variant="pills">
 *    <mn-tab value="a">One</mn-tab><mn-tab value="b">Two</mn-tab>
 *    <mn-tab-panel value="a">…</mn-tab-panel><mn-tab-panel value="b">…</mn-tab-panel></mn-tabs>`
 */
export class MnTabsElement extends MnElement {
  static observedAttributes = ['value', 'variant', 'size', 'orientation'];
  private list = document.createElement('div');
  private base = uid('mn-tabs');
  protected override build() {
    this.list.setAttribute('role', 'tablist');
    const tabsEls = Array.from(this.querySelectorAll(':scope > mn-tab'));
    const panels = Array.from(this.querySelectorAll(':scope > mn-tab-panel')) as HTMLElement[];
    for (const tab of tabsEls) {
      const btn = document.createElement('button');
      btn.type = 'button';
      btn.setAttribute('role', 'tab');
      const value = tab.getAttribute('value') ?? '';
      btn.dataset.value = value;
      btn.id = `${this.base}-tab-${value}`;
      btn.setAttribute('aria-controls', `${this.base}-panel-${value}`);
      if (tab.hasAttribute('disabled')) btn.disabled = true;
      btn.append(...Array.from(tab.childNodes));
      btn.addEventListener('click', () => this.select(value));
      this.list.append(btn);
      tab.remove();
    }
    for (const panel of panels) {
      const value = panel.getAttribute('value') ?? '';
      panel.id = `${this.base}-panel-${value}`;
      panel.setAttribute('role', 'tabpanel');
      panel.setAttribute('aria-labelledby', `${this.base}-tab-${value}`);
      panel.tabIndex = 0;
    }
    this.prepend(this.list);
    if (!this.attr('value') && tabsEls[0]) this.setAttribute('value', tabsEls[0].getAttribute('value') ?? '');
  }
  protected override update() {
    const orientation = (this.attr('orientation') as 'horizontal' | 'vertical') ?? 'horizontal';
    const s = tabs({ variant: this.attr('variant') as never, size: this.attr('size') as never, orientation });
    const value = this.attr('value');
    this.setClass(s.root());
    this.list.className = s.list();
    this.list.setAttribute('aria-orientation', orientation);
    for (const btn of Array.from(this.list.children) as HTMLButtonElement[]) {
      const selected = btn.dataset.value === value;
      btn.className = s.trigger();
      btn.setAttribute('aria-selected', String(selected));
      btn.tabIndex = selected ? 0 : -1;
    }
    for (const panel of Array.from(this.querySelectorAll<HTMLElement>(':scope > mn-tab-panel'))) {
      panel.className = s.panel();
      panel.hidden = panel.getAttribute('value') !== value;
    }
  }
  protected override connect() {
    return createTabs(this.list, { orientation: (this.attr('orientation') as never) ?? 'horizontal' }).destroy;
  }
  select(value: string) {
    if (value === this.attr('value')) return;
    this.setAttribute('value', value);
    this.emit('mn-change', { value });
  }
}

/**
 * `<mn-combobox name="framework" placeholder="Search…" value="vue">
 *    <optgroup label="UI"><option value="react">React</option>…</optgroup></mn-combobox>`
 * Posts the selected value through a hidden input.
 */
export class MnComboboxElement extends MnElement {
  static observedAttributes = ['value', 'placeholder', 'disabled', 'size', 'label'];
  readonly control = document.createElement('input');
  private hiddenInput = document.createElement('input');
  private listbox = document.createElement('div');
  private options: ListOption[] = [];
  protected override build() {
    this.options = readOptions(this);
    this.replaceChildren();
    const s = combobox();
    this.setClass(s.root());
    this.hiddenInput.type = 'hidden';
    const trigger = Object.assign(document.createElement('span'), { className: s.trigger('pointer-events-none') });
    trigger.setAttribute('aria-hidden', 'true');
    trigger.append(createIcon(ChevronsUpDown));
    this.listbox.className = s.listbox();
    this.listbox.setAttribute('popover', 'manual');
    renderOptions(this.listbox, this.options, () => s.option(), s.groupLabel(), (_o, el) => el.append(createIcon(Check, { class: s.check() })));
    this.listbox.append(Object.assign(document.createElement('div'), { className: s.empty(), textContent: this.attr('empty-text') ?? 'No results' }));
    this.listbox.lastElementChild!.setAttribute('data-empty', '');
    (this.listbox.lastElementChild as HTMLElement).hidden = true;
    this.append(this.control, trigger, this.hiddenInput, this.listbox);
    (this.closest('mn-field') as { wire?(el: HTMLElement): void } | null)?.wire?.(this.control);
  }
  protected override update() {
    this.hiddenInput.name = this.attr('name') ?? '';
    this.control.className = input({ size: this.attr('size') as never, withEnd: true });
    this.control.placeholder = this.attr('placeholder') ?? '';
    this.control.disabled = this.flag('disabled');
    if (this.attr('label')) this.control.setAttribute('aria-label', this.attr('label')!);
    const value = this.attr('value') ?? '';
    this.hiddenInput.value = value;
    this.control.value = this.options.find((o) => o.value === value)?.label ?? '';
    for (const el of Array.from(this.listbox.querySelectorAll('[role=option]'))) el.setAttribute('aria-selected', String((el as HTMLElement).dataset.value === value));
  }
  protected override connect() {
    return createCombobox({
      input: this.control,
      listbox: this.listbox,
      anchor: this,
      filter: true,
      openOnFocus: true,
      onSelect: (value) => {
        this.setAttribute('value', value);
        this.update();
        this.emit('mn-change', { value });
      },
      onOpenChange: (open) => {
        if (!open) this.update();
      },
    }).destroy;
  }
  get value() {
    return this.attr('value') ?? '';
  }
  set value(v: string) {
    this.setAttribute('value', v);
  }
}

/**
 * `<mn-command-dialog hotkey="mod+k"><optgroup label="Settings"><option value="profile" data-shortcut="mod+p">Profile</option></optgroup></mn-command-dialog>`
 * Emits `mn-select`.
 */
export class MnCommandDialogElement extends MnElement {
  readonly dialog = document.createElement('dialog');
  private input = document.createElement('input');
  private list = document.createElement('div');
  protected override build() {
    const options = readOptions(this);
    this.replaceChildren();
    const s = command();
    this.style.display = 'contents';
    this.dialog.className = commandDialog();
    this.dialog.setAttribute('aria-label', 'Command palette');
    const root = Object.assign(document.createElement('div'), { className: s.root() });
    const wrap = Object.assign(document.createElement('div'), { className: s.inputWrap() });
    this.input.className = s.input();
    this.input.placeholder = this.attr('placeholder') ?? 'Type a command or search…';
    this.input.setAttribute('aria-label', this.input.placeholder);
    wrap.append(createIcon(Search), this.input);
    this.list.className = s.list();
    this.list.setAttribute('role', 'listbox');
    renderOptions(this.list, options, () => s.item(), s.groupLabel(), (o, el) => {
      if (o.shortcut) el.append(Object.assign(document.createElement('span'), { className: s.shortcut(), textContent: formatHotkey(o.shortcut) }));
    });
    const empty = Object.assign(document.createElement('div'), { className: s.empty(), textContent: 'No results found.' });
    empty.dataset.empty = '';
    empty.hidden = true;
    this.list.append(empty);
    root.append(wrap, this.list);
    this.dialog.append(root);
    this.append(this.dialog);
  }
  protected override connect() {
    const dialogCtl = createDialog(this.dialog, {
      onOpenChange: (open) => {
        if (!open) {
          this.input.value = '';
          this.input.dispatchEvent(new Event('input'));
        }
      },
    });
    const combo = createCombobox({
      input: this.input,
      listbox: this.list,
      inline: true,
      filter: true,
      onSelect: (value) => {
        dialogCtl.close();
        this.emit('mn-select', { value });
      },
    });
    const hotkey = this.attr('hotkey') ?? 'mod+k';
    const off = hotkey === 'none' ? undefined : onHotkey(hotkey, () => dialogCtl.open());
    return () => {
      dialogCtl.destroy();
      combo.destroy();
      off?.();
    };
  }
  show() {
    if (!this.dialog.open) this.dialog.showModal?.();
  }
  close() {
    this.dialog.close?.();
  }
}

/** `<mn-calendar value="2026-09-25" min="…" max="…" locale="de-DE">` — emits `mn-change`. */
export class MnCalendarElement extends MnElement {
  private controller?: CalendarController;
  protected override connect() {
    this.controller = createCalendar(this, {
      value: this.attr('value') ?? null,
      min: this.attr('min'),
      max: this.attr('max'),
      locale: this.attr('locale'),
      size: this.attr('size') as never,
      onChange: (value) => {
        this.setAttribute('value', value);
        this.emit('mn-change', { value });
      },
    });
    return () => this.controller?.destroy();
  }
  get value() {
    return this.controller?.getValue() ?? null;
  }
}

/** `<mn-date-picker name="due" value="…" min="…" placeholder="Pick a date">` */
export class MnDatePickerElement extends MnElement {
  protected override connect() {
    const trigger = document.createElement('button');
    this.replaceChildren(trigger);
    this.style.display = 'contents';
    (this.closest('mn-field') as { wire?(el: HTMLElement): void } | null)?.wire?.(trigger);
    return createDatePicker({
      trigger,
      name: this.attr('name'),
      value: this.attr('value') ?? null,
      placeholder: this.attr('placeholder'),
      min: this.attr('min'),
      max: this.attr('max'),
      locale: this.attr('locale'),
      onChange: (value) => {
        this.setAttribute('value', value);
        this.emit('mn-change', { value });
      },
    });
  }
}

/**
 * `<mn-data-table page-size="8" selectable caption="Invoices">
 *    <mn-column key="id" header="Invoice"></mn-column>
 *    <mn-column key="amount" header="Amount" align="end"></mn-column>
 *    <script type="application/json">[{"id": "INV-1", "amount": 120}]</script></mn-data-table>`
 * or set `el.rows = [...]` from script.
 */
export class MnDataTableElement<T = Record<string, unknown>> extends MnElement {
  private columns: ColumnDef<T>[] = [];
  private data: T[] = [];
  private controller?: DataTableController<T>;
  protected override build() {
    this.columns = Array.from(this.querySelectorAll('mn-column')).map((c) => ({
      key: c.getAttribute('key') ?? '',
      header: c.getAttribute('header') ?? c.getAttribute('key') ?? '',
      align: (c.getAttribute('align') as ColumnDef['align']) ?? undefined,
      sortable: c.getAttribute('sortable') !== 'false',
      searchable: c.getAttribute('searchable') !== 'false',
      width: c.getAttribute('width') ?? undefined,
    }));
    const json = this.querySelector('script[type="application/json"]');
    if (json && !this.data.length) this.data = JSON.parse(json.textContent || '[]');
    this.replaceChildren();
  }
  protected override connect() {
    this.controller = createDataTable<T>(this, {
      columns: this.columns,
      rows: this.data,
      pageSize: Number(this.attr('page-size') ?? 10),
      selectable: this.flag('selectable'),
      searchable: this.attr('searchable') !== 'false',
      caption: this.attr('caption'),
      striped: this.flag('striped'),
      getRowId: (row, i) => String((row as { id?: unknown }).id ?? i),
      onSelectionChange: (ids) => this.emit('mn-selection-change', { ids }),
    });
    return () => this.controller?.destroy();
  }
  get rows(): T[] {
    return this.data;
  }
  set rows(rows: T[]) {
    this.data = rows;
    this.controller?.setRows(rows);
  }
  get selection(): string[] {
    return this.controller?.getSelection() ?? [];
  }
}
