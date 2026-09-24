// @vitest-environment jsdom
import { describe, expect, it, vi } from 'vitest';
import { createDialog, createTabs, mountToaster, syncSliderFill } from '../src/dom/index';
import { createToaster } from '../src/index';

describe('dom controllers', () => {
  it('manages tabs with the keyboard', () => {
    document.body.innerHTML = `
      <div role="tablist">
        <button role="tab" aria-controls="p1" aria-selected="true">One</button>
        <button role="tab" aria-controls="p2" disabled>Two</button>
        <button role="tab" aria-controls="p3">Three</button>
      </div>
      <div id="p1"></div><div id="p2"></div><div id="p3"></div>`;
    const list = document.querySelector<HTMLElement>('[role=tablist]')!;
    const onChange = vi.fn();
    createTabs(list, { manage: true, onChange });
    const [one, , three] = Array.from(list.querySelectorAll<HTMLElement>('[role=tab]'));
    one!.focus();
    list.dispatchEvent(new KeyboardEvent('keydown', { key: 'ArrowRight', bubbles: true }));
    expect(document.activeElement).toBe(three);
    expect(three!.getAttribute('aria-selected')).toBe('true');
    expect(document.getElementById('p1')!.hidden).toBe(true);
    expect(document.getElementById('p3')!.hidden).toBe(false);
    expect(onChange).toHaveBeenLastCalledWith(three, 2);
  });

  it('opens and closes dialogs', () => {
    document.body.innerHTML = `<dialog class="mn-dialog"><button>ok</button></dialog>`;
    const dialog = document.querySelector('dialog')!;
    const onOpenChange = vi.fn();
    const controller = createDialog(dialog, { onOpenChange });
    controller.open();
    expect(controller.isOpen()).toBe(true);
    controller.close();
    expect(controller.isOpen()).toBe(false);
    expect(onOpenChange.mock.calls).toEqual([[true], [false]]);
  });

  it('renders toasts into a live region', () => {
    document.body.innerHTML = '';
    const toaster = createToaster();
    const unmount = mountToaster({ toaster });
    toaster.error({ title: 'Nope', description: 'Something broke' });
    const region = document.querySelector('section[aria-live]')!;
    expect(region.textContent).toContain('Something broke');
    expect(region.querySelector('[role=alert]')).not.toBeNull();
    unmount();
    expect(document.querySelector('section[aria-live]')).toBeNull();
  });

  it('syncs slider fill', () => {
    document.body.innerHTML = `<input type="range" min="0" max="200" value="50">`;
    const input = document.querySelector('input')!;
    syncSliderFill(input);
    expect(input.style.getPropertyValue('--mn-fill')).toBe('25%');
  });
});
