/**
 * Manthan UI as framework-free custom elements (light DOM, form-friendly).
 *
 *   import { defineElements } from '@manthan/base/elements';
 *   defineElements();
 *
 * or just `import '@manthan/base/elements/define'`.
 */
import { MnComboboxElement, MnCommandDialogElement, MnCalendarElement, MnDataTableElement, MnDatePickerElement, MnTabsElement } from './advanced';
import { MnCheckboxElement, MnFieldElement, MnInputElement, MnSelectElement, MnSliderElement, MnSwitchElement, MnTextareaElement } from './form';
import { MnFileUploadElement } from './files';
import { MnDialogElement, MnMenuElement, MnPopoverElement, MnToasterElement, MnTooltipElement } from './overlay';
import {
  MnAlertElement,
  MnAvatarElement,
  MnBadgeElement,
  MnButtonElement,
  MnCardElement,
  MnIconElement,
  MnKbdElement,
  MnProgressElement,
  MnSkeletonElement,
  MnSpinnerElement,
} from './simple';

export * from './base';
export * from './simple';
export * from './form';
export * from './overlay';
export * from './advanced';
export * from './files';
export { toast, createToaster, applyTheme, designStyles } from '../index';

/** Inert marker elements consumed by their parents. */
class MnMarker extends HTMLElement {}

export const elements = {
  'mn-icon': MnIconElement,
  'mn-button': MnButtonElement,
  'mn-badge': MnBadgeElement,
  'mn-kbd': MnKbdElement,
  'mn-card': MnCardElement,
  'mn-alert': MnAlertElement,
  'mn-progress': MnProgressElement,
  'mn-spinner': MnSpinnerElement,
  'mn-skeleton': MnSkeletonElement,
  'mn-avatar': MnAvatarElement,
  'mn-field': MnFieldElement,
  'mn-input': MnInputElement,
  'mn-textarea': MnTextareaElement,
  'mn-select': MnSelectElement,
  'mn-checkbox': MnCheckboxElement,
  'mn-switch': MnSwitchElement,
  'mn-slider': MnSliderElement,
  'mn-dialog': MnDialogElement,
  'mn-tooltip': MnTooltipElement,
  'mn-popover': MnPopoverElement,
  'mn-menu': MnMenuElement,
  'mn-toaster': MnToasterElement,
  'mn-tabs': MnTabsElement,
  'mn-combobox': MnComboboxElement,
  'mn-command-dialog': MnCommandDialogElement,
  'mn-calendar': MnCalendarElement,
  'mn-date-picker': MnDatePickerElement,
  'mn-data-table': MnDataTableElement,
  'mn-file-upload': MnFileUploadElement,
} as const;

const markers = ['mn-tab', 'mn-tab-panel', 'mn-menu-item', 'mn-menu-label', 'mn-menu-separator', 'mn-column'];

let openerInstalled = false;

/** Register every `mn-*` element (safe to call more than once). */
export function defineElements(registry: CustomElementRegistry = customElements): void {
  for (const [name, ctor] of Object.entries(elements)) if (!registry.get(name)) registry.define(name, ctor);
  for (const name of markers) if (!registry.get(name)) registry.define(name, class extends MnMarker {});
  if (!openerInstalled && typeof document !== 'undefined') {
    openerInstalled = true;
    // `<button data-mn-open="my-dialog">` opens `<mn-dialog id="my-dialog">` (or a command dialog).
    document.addEventListener('click', (event) => {
      const opener = (event.target as Element).closest<HTMLElement>('[data-mn-open]');
      const target = opener && document.getElementById(opener.dataset.mnOpen!);
      if (target && 'show' in target) (target as unknown as { show(): void }).show();
    });
  }
}

declare global {
  interface HTMLElementTagNameMap {
    'mn-button': MnButtonElement;
    'mn-dialog': MnDialogElement;
    'mn-combobox': MnComboboxElement;
    'mn-data-table': MnDataTableElement;
    'mn-tabs': MnTabsElement;
  }
}
