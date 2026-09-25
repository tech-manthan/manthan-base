import { tooltip as tooltipRecipe } from '../recipes/overlay';
import { valueToPercent } from '../core/range';
import type { Placement } from '../core/position';
import { createCalendar } from './calendar';
import { createCombobox } from './combobox';
import { createDatePicker } from './date-picker';
import { createDialog, type DialogController } from './dialog';
import { onHotkey } from './hotkey';
import { createToggleGroup } from './toggle-group';
import { createMenu } from './menu';
import { createPopover } from './popover';
import { createTabs } from './tabs';
import { createTooltip } from './tooltip';
import { on, type Cleanup } from './utils';

const placementOf = (el: HTMLElement) => (el.dataset.mnPlacement as Placement | undefined) ?? undefined;

/** Keep `--mn-fill` in sync for a native range styled with the `slider` recipe. */
export function syncSliderFill(input: HTMLInputElement): Cleanup {
  const update = () =>
    input.style.setProperty(
      '--mn-fill',
      `${valueToPercent(Number(input.value), Number(input.min || 0), Number(input.max || 100))}%`,
    );
  update();
  return on(input, 'input', update);
}

/**
 * Progressive enhancement for server-rendered / plain HTML:
 *
 *   <button data-mn-menu popovertarget="m1">…</button> <div id="m1" role="menu">…</div>
 *   <button data-mn-popover popovertarget="p1">…</button>
 *   <button data-mn-tooltip="Copy">…</button>
 *   <button data-mn-dialog-open="d1">…</button> <dialog id="d1" class="mn-dialog">… <button data-mn-dialog-close>
 *   <div role="tablist" data-mn-tabs>…</div>
 *   <input type="range" class="mn-slider">
 *   <input data-mn-combobox aria-controls="list"> <div id="list">…[role=option][data-value]…</div>
 *   <div data-mn-toggle-group="single|multiple">…button[data-value]…</div>
 *   <div data-mn-calendar data-value="2026-09-25"></div>  <button data-mn-datepicker data-name="due"></button>
 *   <div data-mn-command>…input + [role=listbox]…</div>  <button data-mn-dialog-open="cmd" data-mn-hotkey="mod+k">
 */
export function autoInit(root: ParentNode = document): Cleanup {
  const cleanups: Cleanup[] = [];
  const byId = (id: string | null) => (id ? document.getElementById(id) : null);

  root.querySelectorAll<HTMLElement>('[data-mn-menu]').forEach((trigger) => {
    const content = byId(trigger.getAttribute('popovertarget') ?? trigger.dataset.mnMenu ?? null);
    if (content) cleanups.push(createMenu({ trigger, content, placement: placementOf(trigger) }).destroy);
  });

  root.querySelectorAll<HTMLElement>('[data-mn-popover]').forEach((trigger) => {
    const content = byId(trigger.getAttribute('popovertarget') ?? trigger.dataset.mnPopover ?? null);
    if (content) cleanups.push(createPopover({ trigger, content, placement: placementOf(trigger) }).destroy);
  });

  root.querySelectorAll<HTMLElement>('[data-mn-tooltip]').forEach((trigger) => {
    const content = document.createElement('div');
    content.className = tooltipRecipe();
    content.textContent = trigger.dataset.mnTooltip ?? '';
    document.body.append(content);
    const controller = createTooltip({ trigger, content, placement: placementOf(trigger) });
    cleanups.push(() => {
      controller.destroy();
      content.remove();
    });
  });

  const dialogs = new Map<HTMLDialogElement, DialogController>();
  root.querySelectorAll<HTMLDialogElement>('dialog.mn-dialog').forEach((dialog) => {
    const controller = createDialog(dialog, {
      closeOnBackdrop: dialog.dataset.mnCloseOnBackdrop !== 'false',
    });
    dialogs.set(dialog, controller);
    cleanups.push(controller.destroy);
  });
  root.querySelectorAll<HTMLElement>('[data-mn-dialog-open]').forEach((trigger) => {
    cleanups.push(
      on(trigger, 'click', () => {
        const dialog = byId(trigger.dataset.mnDialogOpen ?? null) as HTMLDialogElement | null;
        if (dialog) (dialogs.get(dialog) ?? createDialog(dialog)).open();
      }),
    );
  });
  root.querySelectorAll<HTMLElement>('[data-mn-dialog-close]').forEach((button) => {
    cleanups.push(on(button, 'click', () => button.closest('dialog')?.close()));
  });

  root.querySelectorAll<HTMLElement>('[role="tablist"][data-mn-tabs]').forEach((list) => {
    const orientation = list.getAttribute('aria-orientation') === 'vertical' ? 'vertical' : 'horizontal';
    cleanups.push(createTabs(list, { manage: true, orientation }).destroy);
  });

  root.querySelectorAll<HTMLInputElement>('input.mn-slider').forEach((input) => cleanups.push(syncSliderFill(input)));

  root.querySelectorAll<HTMLElement>('[data-mn-hotkey]').forEach((el) => {
    cleanups.push(onHotkey(el.dataset.mnHotkey!, () => el.click()));
  });

  root.querySelectorAll<HTMLInputElement>('input[data-mn-combobox]').forEach((input) => {
    const listbox = byId(input.getAttribute('aria-controls') ?? input.dataset.mnCombobox ?? null);
    if (!listbox) return;
    const controller = createCombobox({
      input,
      listbox,
      anchor: input.closest<HTMLElement>('.mn-combobox') ?? input,
      filter: true,
      openOnFocus: input.dataset.mnOpenOnFocus !== undefined,
      onSelect: (value, option) => {
        listbox.querySelectorAll('[aria-selected="true"]').forEach((el) => el.setAttribute('aria-selected', 'false'));
        option.setAttribute('aria-selected', 'true');
        input.value = option.dataset.label ?? option.textContent?.trim() ?? value;
        input.dataset.value = value;
        input.dispatchEvent(new Event('change', { bubbles: true }));
      },
    });
    cleanups.push(controller.destroy);
  });

  root.querySelectorAll<HTMLElement>('[data-mn-command]').forEach((el) => {
    const input = el.querySelector<HTMLInputElement>('input');
    const listbox = el.querySelector<HTMLElement>('[role="listbox"]');
    if (!input || !listbox) return;
    const controller = createCombobox({
      input,
      listbox,
      inline: true,
      filter: true,
      onSelect: (value) => el.dispatchEvent(new CustomEvent('mn-select', { detail: value, bubbles: true })),
    });
    cleanups.push(controller.destroy);
  });

  root.querySelectorAll<HTMLElement>('[data-mn-toggle-group]').forEach((el) => {
    const type = el.dataset.mnToggleGroup === 'multiple' ? 'multiple' : 'single';
    cleanups.push(createToggleGroup(el, { type }));
  });

  root.querySelectorAll<HTMLElement>('[data-mn-calendar]').forEach((el) => {
    cleanups.push(
      createCalendar(el, { value: el.dataset.value || null, min: el.dataset.min, max: el.dataset.max, locale: el.dataset.locale }).destroy,
    );
  });

  root.querySelectorAll<HTMLButtonElement>('button[data-mn-datepicker]').forEach((trigger) => {
    cleanups.push(
      createDatePicker({
        trigger,
        name: trigger.dataset.name,
        value: trigger.dataset.value || null,
        placeholder: trigger.dataset.placeholder,
        min: trigger.dataset.min,
        max: trigger.dataset.max,
        locale: trigger.dataset.locale,
      }),
    );
  });

  return () => cleanups.forEach((c) => c());
}
