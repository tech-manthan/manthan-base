// @vitest-environment jsdom
import { describe, expect, it, vi } from 'vitest';
import { createCalendar, createCombobox, createToggleGroup } from '../src/dom/index';

const key = (el: Element, k: string, init: KeyboardEventInit = {}) =>
  el.dispatchEvent(new KeyboardEvent('keydown', { key: k, bubbles: true, ...init }));

describe('advanced dom controllers', () => {
  it('drives a filtering combobox from the keyboard', () => {
    document.body.innerHTML = `
      <input id="i" />
      <div id="l">
        <div role="option" data-value="react">React</div>
        <div role="option" data-value="vue" aria-disabled="true">Vue</div>
        <div role="option" data-value="svelte">Svelte</div>
        <div data-empty hidden>No results</div>
      </div>`;
    const input = document.getElementById('i') as HTMLInputElement;
    const listbox = document.getElementById('l')!;
    const onSelect = vi.fn();
    const ctl = createCombobox({ input, listbox, onSelect, filter: true });
    expect(input.getAttribute('role')).toBe('combobox');
    key(input, 'ArrowDown');
    expect(ctl.isOpen()).toBe(true);
    expect(input.getAttribute('aria-activedescendant')).toBe(listbox.children[0]!.id);
    key(input, 'ArrowDown'); // skips disabled Vue
    expect(listbox.children[2]!.hasAttribute('data-highlighted')).toBe(true);
    key(input, 'Enter');
    expect(onSelect).toHaveBeenCalledWith('svelte', listbox.children[2]);
    expect(ctl.isOpen()).toBe(false);

    input.value = 'zzz';
    input.dispatchEvent(new Event('input'));
    expect((listbox.querySelector('[data-empty]') as HTMLElement).hidden).toBe(false);
    input.value = 'sv';
    input.dispatchEvent(new Event('input'));
    expect((listbox.children[0] as HTMLElement).hidden).toBe(true);
    expect((listbox.children[2] as HTMLElement).hidden).toBe(false);
  });

  it('renders a keyboard-navigable calendar', () => {
    document.body.innerHTML = `<div id="c"></div>`;
    const root = document.getElementById('c')!;
    const onChange = vi.fn();
    createCalendar(root, { value: '2026-09-25', weekStartsOn: 1, locale: 'en-US', max: '2026-10-10', onChange });
    expect(root.querySelector('td[aria-selected="true"] button')!.textContent).toBe('25');
    expect(root.querySelectorAll('button[data-date]')).toHaveLength(42);
    const focused = root.querySelector<HTMLButtonElement>('button[tabindex="0"]')!;
    key(focused, 'ArrowDown');
    expect(document.activeElement?.getAttribute('data-date')).toBe('2026-10-02');
    expect(root.textContent).toContain('October 2026');
    key(document.activeElement!, 'ArrowDown'); // Oct 9 allowed
    key(document.activeElement!, 'ArrowDown'); // Oct 16 > max: stays put
    expect(document.activeElement?.getAttribute('data-date')).toBe('2026-10-09');
    (document.activeElement as HTMLElement).click();
    expect(onChange).toHaveBeenCalledWith('2026-10-09');
  });

  it('manages toggle group pressed state', () => {
    document.body.innerHTML = `<div id="g"><button data-value="b">B</button><button data-value="i">I</button></div>`;
    const root = document.getElementById('g')!;
    const onChange = vi.fn();
    createToggleGroup(root, { type: 'multiple', onChange });
    const [b, i] = Array.from(root.querySelectorAll('button'));
    b!.click();
    i!.click();
    expect(onChange).toHaveBeenLastCalledWith(['b', 'i']);
    expect(b!.tabIndex).toBe(0);
    b!.focus();
    key(b!, 'ArrowRight');
    expect(document.activeElement).toBe(i);
  });
});

import { createDataTable } from '../src/dom/index';

describe('data table controller', () => {
  it('sorts, searches, selects and pages', () => {
    document.body.innerHTML = `<div id="t"></div>`;
    const root = document.getElementById('t')!;
    const rows = Array.from({ length: 12 }, (_, i) => ({ id: String(i + 1), name: `User ${i + 1}`, score: (i * 7) % 10 }));
    const onSelectionChange = vi.fn();
    createDataTable(root, {
      rows,
      columns: [
        { key: 'name', header: 'Name' },
        { key: 'score', header: 'Score', align: 'end', searchable: false },
      ],
      pageSize: 5,
      selectable: true,
      onSelectionChange,
    });
    const bodyRows = () => Array.from(root.querySelectorAll('tbody tr'));
    expect(bodyRows()).toHaveLength(5);
    expect(root.textContent).toContain('1–5 of 12');

    (root.querySelector('th[aria-sort] button') as HTMLButtonElement).click();
    expect(root.querySelector('th[aria-sort="ascending"]')).not.toBeNull();

    const search = root.querySelector('input[type=search]') as HTMLInputElement;
    search.value = 'user 1';
    search.dispatchEvent(new Event('input'));
    expect(bodyRows().length).toBe(4); // User 1, 10, 11, 12

    (root.querySelector('thead input[type=checkbox]') as HTMLInputElement).click();
    expect(onSelectionChange).toHaveBeenLastCalledWith(['1', '10', '11', '12']);
    expect(root.textContent).toContain('4 of 12 selected');
    expect(bodyRows().every((tr) => tr.getAttribute('aria-selected') === 'true')).toBe(true);
  });
});
